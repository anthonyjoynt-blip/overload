import { describe, expect, it } from 'vitest';
import { SEED_EXERCISES } from './exercises';
import { MAPS_15_MINUTES } from './maps15';
import { MAPS_15_MINUTES_ADVANCED } from './maps15Advanced';
import { MAPS_AESTHETIC } from './mapsAesthetic';
import { MAPS_ANABOLIC } from './mapsAnabolic';
import { MAPS_ANABOLIC_ADVANCED } from './mapsAnabolicAdvanced';
import { generateSessions, planProgram, resolveWorkout, weekTypeFor } from '../lib/schedule';
import { buildSetSlots } from '../lib/session';
import type { Exercise, Program, ProgramExercise, Schedule, Workout } from '../types';

/**
 * These programs are transcribed by hand from PDFs, so the things that can go
 * wrong are typos: an exercise id that does not exist, a rep range with the ends
 * swapped, a workout that schedules into nothing. Everything here checks for
 * exactly that.
 */

const PROGRAMS: Program[] = [
  MAPS_15_MINUTES,
  MAPS_15_MINUTES_ADVANCED,
  MAPS_ANABOLIC,
  MAPS_ANABOLIC_ADVANCED,
  MAPS_AESTHETIC,
];

const library = new Map(SEED_EXERCISES.map((e) => [e.id, e as Exercise]));

function everyWorkout(program: Program): Workout[] {
  return program.phases.flatMap((phase) =>
    phase.workouts.flatMap((workout) => [workout, ...(workout.options ?? [])]),
  );
}

function everyPrescription(program: Program): ProgramExercise[] {
  return everyWorkout(program).flatMap((w) => w.blocks.flatMap((b) => b.exercises));
}

describe.each(PROGRAMS.map((p) => [p.name, p] as const))('%s', (_name, program) => {
  it('points every movement at something in the library', () => {
    const missing = [
      ...new Set(
        everyPrescription(program)
          .map((pe) => pe.exerciseId)
          .filter((id) => !library.has(id)),
      ),
    ];
    expect(missing).toEqual([]);
  });

  it('gives every prescription a usable target', () => {
    for (const pe of everyPrescription(program)) {
      expect(pe.sets).toBeGreaterThan(0);
      expect(pe.restSeconds).toBeGreaterThanOrEqual(0);
      const t = pe.reps;
      if (t.type === 'range') {
        expect(t.min).toBeGreaterThan(0);
        expect(t.max).toBeGreaterThanOrEqual(t.min!);
      } else if (t.type === 'fixed') {
        expect(t.min).toBeGreaterThan(0);
      } else if (t.type === 'timed') {
        expect(t.seconds).toBeGreaterThan(0);
      }
    }
  });

  it('keeps ids unique, except where a workout is deliberately reused', () => {
    // The same workout object can appear twice in a week. That is fine — it
    // shares one prescription. Two DIFFERENT objects sharing an id is a bug.
    const seen = new Map<string, unknown>();
    const check = (id: string, object: unknown) => {
      if (seen.has(id)) expect(seen.get(id)).toBe(object);
      else seen.set(id, object);
    };
    for (const workout of everyWorkout(program)) {
      check(workout.id, workout);
      for (const block of workout.blocks) {
        check(block.id, block);
        for (const pe of block.exercises) check(pe.id, pe);
      }
    }
  });

  it('has no empty fixed workout', () => {
    for (const workout of everyWorkout(program)) {
      if (workout.kind === 'fixed') {
        const count = workout.blocks.reduce((n, b) => n + b.exercises.length, 0);
        expect(count, `${workout.name} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('flattens every workout into a logging queue', () => {
    for (const workout of everyWorkout(program)) {
      if (workout.kind !== 'fixed') continue;
      const slots = buildSetSlots(workout.blocks, library);
      expect(slots.length, `${workout.name} produced no sets`).toBeGreaterThan(0);
    }
  });

  it('schedules onto a calendar', () => {
    const schedule: Schedule = {
      id: 's',
      programId: program.id,
      startDate: '2026-09-21',
      mode: 'weekdays',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      includeOptional: true,
      active: true,
      createdAt: 0,
    };
    const sessions = generateSessions(program, schedule);
    expect(sessions.length).toBeGreaterThan(0);
    for (const session of sessions) {
      expect(resolveWorkout(program, session), `${session.workoutId} did not resolve`).not.toBeNull();
    }
  });
});

describe('MAPS 15 Minutes', () => {
  it('runs three 3-week phases of six workouts plus an optional seventh', () => {
    expect(MAPS_15_MINUTES.phases.map((p) => p.weeks)).toEqual([3, 3, 3]);
    expect(planProgram(MAPS_15_MINUTES, false)).toHaveLength(54);
    expect(planProgram(MAPS_15_MINUTES, true)).toHaveLength(63);
  });
});

describe('MAPS 15 Minutes Advanced', () => {
  it('keeps the calendar shape of the base program', () => {
    expect(MAPS_15_MINUTES_ADVANCED.phases.map((p) => p.weeks)).toEqual([3, 3, 3]);
    expect(planProgram(MAPS_15_MINUTES_ADVANCED, false)).toHaveLength(54);
    expect(planProgram(MAPS_15_MINUTES_ADVANCED, true)).toHaveLength(63);
  });

  it('keeps the abs-or-glutes choice on the optional day', () => {
    const seventh = MAPS_15_MINUTES_ADVANCED.phases[0].workouts.at(-1)!;
    expect(seventh.kind).toBe('choice');
    expect(seventh.optional).toBe(true);
    expect(seventh.options?.map((o) => o.name)).toEqual(['Abs focus', 'Butt focus']);
  });

  it('does not collide with prescription ids in the base program', () => {
    const base = new Set(
      MAPS_15_MINUTES.phases
        .flatMap((p) => p.workouts)
        .flatMap((w) => [w, ...(w.options ?? [])])
        .flatMap((w) => w.blocks)
        .flatMap((b) => b.exercises)
        .map((pe) => pe.id),
    );
    const advanced = MAPS_15_MINUTES_ADVANCED.phases
      .flatMap((p) => p.workouts)
      .flatMap((w) => [w, ...(w.options ?? [])])
      .flatMap((w) => w.blocks)
      .flatMap((b) => b.exercises)
      .map((pe) => pe.id);
    expect(advanced.filter((id) => base.has(id))).toEqual([]);
  });

  it('drops Phase III to fives and supersets the arm work', () => {
    const phase = MAPS_15_MINUTES_ADVANCED.phases[2];
    const first = phase.workouts[0];
    expect(first.blocks.map((b) => b.kind)).toEqual(['straight', 'superset']);
    expect(first.blocks[0].exercises[0]).toMatchObject({ sets: 5 });
    expect(first.blocks[0].exercises[0].reps).toMatchObject({ type: 'fixed', min: 5 });
  });

  it('leaves the five-minute AMRAP unjudged rather than inventing a target', () => {
    const core = MAPS_15_MINUTES_ADVANCED.phases[0].workouts[5];
    const amrap = core.blocks[0].exercises.find((pe) => pe.reps.type === 'amrap')!;
    expect(amrap.reps.min).toBeUndefined();
    expect(amrap.note).toContain('5 minutes');
  });
});

describe('MAPS Aesthetic', () => {
  it('runs 3, 4 and 3 week phases', () => {
    expect(MAPS_AESTHETIC.phases.map((p) => p.weeks)).toEqual([3, 4, 3]);
  });

  it('puts a Focus Session between each foundational day', () => {
    const week = MAPS_AESTHETIC.phases[0].workouts;
    expect(week.map((w) => w.kind)).toEqual([
      'fixed',
      'open',
      'fixed',
      'open',
      'fixed',
      'open',
    ]);
  });

  it('describes the Focus Session as an open slot with real constraints', () => {
    const focus = MAPS_AESTHETIC.phases[0].workouts[1];
    expect(focus.open).toMatchObject({ setCap: 3 });
    expect(focus.open?.repScheme).toMatchObject({ type: 'range', min: 10, max: 20 });
    expect(focus.blocks).toEqual([]);
  });

  it('supersets Phase III', () => {
    const kinds = MAPS_AESTHETIC.phases[2].workouts[0].blocks.map((b) => b.kind);
    expect(kinds.filter((k) => k === 'superset').length).toBe(6);
  });

  it('runs 10 weeks of six sessions', () => {
    expect(planProgram(MAPS_AESTHETIC, true)).toHaveLength((3 + 4 + 3) * 6);
  });
});

describe('MAPS Anabolic', () => {
  it('runs a Pre Phase plus three phases, three weeks each', () => {
    expect(MAPS_ANABOLIC.phases.map((p) => p.name)).toEqual([
      'Pre Phase',
      'Phase I — Strength',
      'Phase II — Muscle Fibre',
      'Phase III — Muscle Pump',
    ]);
    expect(MAPS_ANABOLIC.phases.every((p) => p.weeks === 3)).toBe(true);
  });

  it('carries a Trigger Session on every non-foundational day', () => {
    for (const phase of MAPS_ANABOLIC.phases) {
      expect(phase.workouts).toHaveLength(7);
      const open = phase.workouts.filter((w) => w.kind === 'open');
      expect(open.length).toBeGreaterThanOrEqual(4);
      expect(open[0].open?.durationCapMinutes).toBe(10);
    }
  });

  it('gives Phase III three foundational days', () => {
    const phase = MAPS_ANABOLIC.phases[3];
    expect(phase.workouts.filter((w) => w.kind === 'fixed')).toHaveLength(3);
  });
});

describe('MAPS Anabolic Advanced', () => {
  const phase = MAPS_ANABOLIC_ADVANCED.phases[0];

  it('runs four weeks plus a deload, alternating normal and failure', () => {
    expect(MAPS_ANABOLIC_ADVANCED.phases.every((p) => p.weeks === 5)).toBe(true);
    expect([1, 2, 3, 4, 5].map((w) => weekTypeFor(phase.weekTypes, w))).toEqual([
      'normal',
      'failure',
      'normal',
      'failure',
      'deload',
    ]);
  });

  it('runs the normal trio twice in a normal week', () => {
    const slots = planProgram(MAPS_ANABOLIC_ADVANCED, true).filter(
      (s) => s.phaseId === phase.id && s.phaseWeek === 1,
    );
    expect(slots).toHaveLength(6);
    expect(slots.map((s) => s.workoutName)).toEqual([
      'Workout #1 — Upper',
      'Workout #2 — Lower',
      'Workout #3 — Core & mobility',
      'Workout #1 — Upper',
      'Workout #2 — Lower',
      'Workout #3 — Core & mobility',
    ]);
  });

  it('swaps in the failure trio on a failure week', () => {
    const slots = planProgram(MAPS_ANABOLIC_ADVANCED, true).filter(
      (s) => s.phaseId === phase.id && s.phaseWeek === 2,
    );
    expect(slots).toHaveLength(6);
    expect(slots.every((s) => s.workoutName.includes('failure'))).toBe(true);
  });

  it('runs two lifting days and two easy days on the deload week', () => {
    const slots = planProgram(MAPS_ANABOLIC_ADVANCED, true).filter(
      (s) => s.phaseId === phase.id && s.phaseWeek === 5,
    );
    expect(slots.map((s) => s.workoutName)).toEqual([
      'Deload — full body',
      'Deload — easy activity',
      'Deload — full body',
      'Deload — easy activity',
    ]);
  });

  it('marks the source-optional movements optional rather than dropping them', () => {
    const upper = phase.workouts[0];
    const optional = upper.blocks[0].exercises.filter((pe) => pe.optional);
    expect(optional).toHaveLength(5);
  });

  it('holds the static stretches for time, not for reps', () => {
    const failureUpper = phase.workouts.find((w) => w.name.startsWith('Workout #4'))!;
    const stretches = failureUpper.blocks[0].exercises.filter(
      (pe) => pe.reps.type === 'timed',
    );
    expect(stretches).toHaveLength(4);
    expect(stretches.every((s) => s.reps.seconds === 60)).toBe(true);
  });
});
