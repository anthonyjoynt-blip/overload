import { describe, expect, it } from 'vitest';
import {
  matchExercise,
  parseProgramTable,
  parseReps,
  parseRest,
  parseSets,
  parseWeight,
  splitTable,
} from './parseProgram';
import { SEED_EXERCISES } from '../data/exercises';
import type { Exercise } from '../types';

const library = SEED_EXERCISES as Exercise[];

describe('splitting the table', () => {
  it('reads a markdown table and drops the separator row', () => {
    const rows = splitTable(
      ['| Day | Exercise |', '| --- | --- |', '| Push | Bench Press |'].join('\n'),
    );
    expect(rows).toEqual([
      ['Day', 'Exercise'],
      ['Push', 'Bench Press'],
    ]);
  });

  it('reads CSV, quotes and all', () => {
    const rows = splitTable('Day,Exercise\nPush,"Row, wide grip"');
    expect(rows[1]).toEqual(['Push', 'Row, wide grip']);
  });

  it('reads tab-separated text', () => {
    const rows = splitTable('Day\tExercise\nPush\tBench Press');
    expect(rows[1]).toEqual(['Push', 'Bench Press']);
  });
});

describe('reading cells', () => {
  it('reads a rep range', () => {
    expect(parseReps('8-12').target).toEqual({ type: 'range', min: 8, max: 12, perSide: undefined });
  });

  it('reads a fixed rep count', () => {
    expect(parseReps('10').target).toMatchObject({ type: 'fixed', min: 10 });
  });

  it('notices "each side"', () => {
    expect(parseReps('8-10 each leg').target).toMatchObject({ type: 'range', min: 8, max: 10, perSide: true });
  });

  it('reads held time in seconds and in minutes', () => {
    expect(parseReps('30s').target).toMatchObject({ type: 'timed', seconds: 30 });
    expect(parseReps('1 minute').target).toMatchObject({ type: 'timed', seconds: 60 });
    expect(parseReps('1:30').target).toMatchObject({ type: 'timed', seconds: 90 });
  });

  it('reads AMRAP and to-failure', () => {
    expect(parseReps('AMRAP').target).toMatchObject({ type: 'amrap' });
    expect(parseReps('8+ AMRAP').target).toMatchObject({ type: 'amrap', min: 8 });
    expect(parseReps('1 set to complete failure').target).toMatchObject({ type: 'failure' });
  });

  it('targets the low end of a set range', () => {
    expect(parseSets('3-4').sets).toBe(3);
    expect(parseSets('4').sets).toBe(4);
    expect(parseSets('').sets).toBe(3);
  });

  it('reads rest in either unit', () => {
    expect(parseRest('90', 60).seconds).toBe(90);
    expect(parseRest('90s', 60).seconds).toBe(90);
    expect(parseRest('2 min', 60).seconds).toBe(120);
    expect(parseRest('1:30', 60).seconds).toBe(90);
    expect(parseRest('', 45).seconds).toBe(45);
  });

  it('reads weight, including bodyweight', () => {
    expect(parseWeight('135')).toEqual({ weight: 135, mode: 'external' });
    expect(parseWeight('bodyweight')).toEqual({ mode: 'bodyweight' });
    expect(parseWeight('BW')).toEqual({ mode: 'bodyweight' });
    expect(parseWeight('BW + 25')).toEqual({ weight: 25, mode: 'bodyweight-plus' });
  });
});

describe('matching the library', () => {
  it('matches on name regardless of case and punctuation', () => {
    expect(matchExercise('romanian deadlift', library)?.id).toBe('romanian-deadlift');
    expect(matchExercise('Push-Ups', library)?.id).toBe('push-up');
  });

  it('matches on an alias', () => {
    expect(matchExercise('Dumbbell Overhead Press', library)?.id).toBe('dumbbell-shoulder-press');
    expect(matchExercise('RDL', library)?.id).toBe('romanian-deadlift');
  });

  it('matches regardless of word order', () => {
    expect(matchExercise('Deadlift Barbell', library)?.id).toBe('barbell-deadlift');
    // Same words as the alias "Dumbbell Incline Bench Press", reordered.
    expect(matchExercise('Incline Dumbbell Bench Press', library)?.id).toBe(
      'incline-dumbbell-press',
    );
  });

  it('returns nothing for a movement it has never heard of', () => {
    expect(matchExercise('Jefferson Curl', library)).toBeUndefined();
  });

  it('refuses a near miss rather than filing it under the wrong lift', () => {
    // Each of these shares every word with a movement in the library and adds
    // one that changes the exercise. Logging them together would corrupt the
    // history of both, so an extra distinctive word means no match.
    expect(matchExercise('Zercher Good Morning', library)).toBeUndefined();
    expect(matchExercise('Single Leg Romanian Deadlift', library)).toBeUndefined();
    expect(matchExercise('Deficit Barbell Deadlift', library)).toBeUndefined();
  });
});

describe('parsing a whole program', () => {
  const table = [
    'Day,Exercise,Sets,Reps,Rest,Starting Weight',
    'Push Day,Barbell Bench Press,3,8-12,90,135',
    'Push Day,Dumbbell Shoulder Press,3,8-12,90,40',
    'Pull Day,Barbell Row,3,8-12,90,115',
    'Pull Day,Dumbbell Curl,3,10-12,60,25',
  ].join('\n');

  it('builds one workout per day, in table order', () => {
    const { program } = parseProgramTable(table, library);
    const workouts = program.phases[0].workouts;
    expect(workouts.map((w) => w.name)).toEqual(['Push Day', 'Pull Day']);
    expect(workouts[0].blocks[0].exercises).toHaveLength(2);
  });

  it('carries sets, reps, rest and starting weight through', () => {
    const { program } = parseProgramTable(table, library);
    const bench = program.phases[0].workouts[0].blocks[0].exercises[0];
    expect(bench).toMatchObject({
      exerciseId: 'barbell-bench-press',
      sets: 3,
      restSeconds: 90,
      startingWeight: 135,
    });
    expect(bench.reps).toMatchObject({ type: 'range', min: 8, max: 12 });
  });

  it('splits phases when the table names them', () => {
    const phased = [
      'Phase,Weeks,Day,Exercise,Sets,Reps',
      'Phase I,3,Legs,Barbell Back Squat,3,8-10',
      'Phase II,4,Legs,Barbell Back Squat,4,6-8',
    ].join('\n');
    const { program } = parseProgramTable(phased, library);
    expect(program.phases.map((p) => [p.name, p.weeks])).toEqual([
      ['Phase I', 3],
      ['Phase II', 4],
    ]);
  });

  it('groups consecutive rows that share a group into one block', () => {
    const superset = [
      'Day,Group,Exercise,Sets,Reps',
      'Arms,,Arnold Press,3,8-10',
      'Arms,A,Dumbbell Curl,3,8-10',
      'Arms,A,Triceps Pushdown,3,8-10',
    ].join('\n');
    const { program } = parseProgramTable(superset, library);
    const blocks = program.phases[0].workouts[0].blocks;
    expect(blocks.map((b) => b.kind)).toEqual(['straight', 'superset']);
    expect(blocks[1].exercises).toHaveLength(2);
  });

  it('calls a group named "circuit" a circuit', () => {
    const circuit = [
      'Day,Group,Exercise,Sets,Reps',
      'Full body,Circuit 1,Push-Up,4,10',
      'Full body,Circuit 1,Dumbbell Row,4,10',
    ].join('\n');
    const { program } = parseProgramTable(circuit, library);
    expect(program.phases[0].workouts[0].blocks[0]).toMatchObject({ kind: 'circuit', rounds: 4 });
  });

  it('stubs unknown movements and says so', () => {
    const unknown = ['Day,Exercise,Sets,Reps', 'Odd,Jefferson Curl,3,8-10'].join('\n');
    const { createdExercises, warnings } = parseProgramTable(unknown, library);
    expect(createdExercises.map((e) => e.name)).toEqual(['Jefferson Curl']);
    expect(warnings.join(' ')).toContain('Jefferson Curl');
  });

  it('treats a bodyweight movement as bodyweight even with no weight column', () => {
    const bw = ['Day,Exercise,Sets,Reps', 'Push,Push-Up,3,8-12'].join('\n');
    const { program } = parseProgramTable(bw, library);
    expect(program.phases[0].workouts[0].blocks[0].exercises[0].weightMode).toBe('bodyweight');
  });

  it('refuses a table with no exercise column', () => {
    expect(() => parseProgramTable('Day,Sets\nPush,3', library)).toThrow(/Exercise column/);
  });

  it('refuses an empty table', () => {
    expect(() => parseProgramTable('Day,Exercise,Sets', library)).toThrow();
  });
});
