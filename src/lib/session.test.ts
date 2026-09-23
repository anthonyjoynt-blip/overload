import { describe, expect, it } from 'vitest';
import { buildSetSlots, describeTarget, tallySession } from './session';
import type { Block, Exercise, LoggedSet, ProgramExercise } from '../types';

const exercises = new Map<string, Exercise>([
  ['a', { id: 'a', name: 'A', muscleGroups: ['chest'], equipment: 'barbell', movementClass: 'compound-upper', cues: [] }],
  ['b', { id: 'b', name: 'B', muscleGroups: ['back'], equipment: 'dumbbell', movementClass: 'isolation', cues: [] }],
]);

function pe(id: string, exerciseId: string, sets: number): ProgramExercise {
  return {
    id,
    exerciseId,
    sets,
    reps: { type: 'range', min: 8, max: 12 },
    restSeconds: 60,
    weightMode: 'external',
  };
}

describe('flattening a workout into the order you perform it', () => {
  it('runs straight sets one movement at a time', () => {
    const block: Block = { id: 'blk', kind: 'straight', exercises: [pe('x', 'a', 2), pe('y', 'b', 2)] };
    expect(buildSetSlots([block], exercises).map((s) => `${s.exercise.name}${s.setNumber}`)).toEqual([
      'A1', 'A2', 'B1', 'B2',
    ]);
  });

  it('alternates a superset and rests only after the pair', () => {
    const block: Block = {
      id: 'blk',
      kind: 'superset',
      restBetweenExercises: 0,
      restAfterRound: 90,
      exercises: [pe('x', 'a', 3), pe('y', 'b', 3)],
    };
    const slots = buildSetSlots([block], exercises);
    expect(slots.map((s) => s.exercise.name)).toEqual(['A', 'B', 'A', 'B', 'A', 'B']);
    expect(slots.map((s) => s.restSeconds)).toEqual([0, 90, 0, 90, 0, 90]);
  });

  it('runs a circuit round by round', () => {
    const block: Block = {
      id: 'blk',
      kind: 'circuit',
      rounds: 3,
      restBetweenExercises: 0,
      restAfterRound: 180,
      exercises: [pe('x', 'a', 1), pe('y', 'b', 1)],
    };
    const slots = buildSetSlots([block], exercises);
    expect(slots.map((s) => `${s.exercise.name}r${s.round}`)).toEqual([
      'Ar1', 'Br1', 'Ar2', 'Br2', 'Ar3', 'Br3',
    ]);
    // Each movement is still three working sets for the progression rule.
    expect(slots[0].totalSets).toBe(3);
  });

  it('skips a movement whose exercise is missing rather than crashing', () => {
    const block: Block = { id: 'blk', kind: 'straight', exercises: [pe('x', 'gone', 2)] };
    expect(buildSetSlots([block], exercises)).toEqual([]);
  });
});

describe('describing a target', () => {
  const base = pe('x', 'a', 3);

  it('reads a range, a fixed count and a hold', () => {
    expect(describeTarget(base)).toBe('3 × 8-12 reps');
    expect(describeTarget({ ...base, sets: 1, reps: { type: 'fixed', min: 10 } })).toBe('10 reps');
    expect(describeTarget({ ...base, sets: 1, reps: { type: 'timed', seconds: 60 } })).toBe('1 minute');
    expect(describeTarget({ ...base, sets: 1, reps: { type: 'timed', seconds: 45 } })).toBe('45s hold');
  });

  it('keeps "each side" on every kind of target, holds included', () => {
    expect(
      describeTarget({ ...base, sets: 1, reps: { type: 'timed', seconds: 60, perSide: true } }),
    ).toBe('1 minute each side');
    expect(
      describeTarget({ ...base, sets: 1, reps: { type: 'fixed', min: 5, perSide: true } }),
    ).toBe('5 reps each side');
  });

  it('drops the set count inside a circuit, where the rounds carry it', () => {
    expect(describeTarget(base, 'circuit')).toBe('8-12 reps');
  });

  it('names the open-ended targets', () => {
    expect(describeTarget({ ...base, sets: 1, reps: { type: 'amrap' } })).toBe('AMRAP');
    expect(describeTarget({ ...base, sets: 1, reps: { type: 'amrap', min: 8 } })).toBe('AMRAP (8+)');
    expect(describeTarget({ ...base, sets: 1, reps: { type: 'failure' } })).toBe('to failure');
  });
});

describe('tallying a session', () => {
  const block: Block = { id: 'blk', kind: 'straight', exercises: [pe('x', 'a', 3)] };
  const slots = buildSetSlots([block], exercises);

  const logged = (setNumber: number, reps: number, goodForm = true): LoggedSet => ({
    id: `s${setNumber}`,
    sessionId: 'sess',
    exerciseId: 'a',
    programExerciseId: 'x',
    setNumber,
    reps,
    weight: 100,
    goodForm,
    timestamp: setNumber,
  });

  it('counts what was logged and what hit the target', () => {
    expect(tallySession(slots, [logged(1, 12), logged(2, 10)])).toEqual({
      logged: 2,
      total: 3,
      onTarget: 1,
    });
  });

  it('does not count a set flagged as ragged as on target', () => {
    expect(tallySession(slots, [logged(1, 12, false)]).onTarget).toBe(0);
  });
});
