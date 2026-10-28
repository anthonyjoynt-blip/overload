import type { Block, Phase, Program, ProgramExercise, RepTarget, Workout } from '../types';

/**
 * Work-From-Home Interval Program, from the user's own write-up.
 *
 * Dumbbells at the desk, a barbell in the next room. Each weekday is one barbell
 * block plus six single dumbbell sets spread roughly hourly around it. The
 * write-up's clock starts at 9:00; the user's workday starts at 6:30, so every
 * time is shifted 2.5 hours and the lunch gap moves with it (no set at 9:30).
 * Each slot is its own block, labelled with its time, so the time shows while
 * logging. The point is roughly hourly, not exact.
 *
 * Where a dumbbell movement appears twice in a day, both sets have to reach the
 * top of the range for that day to count — see movementProgress in
 * state/selectors.ts.
 */

/** One set a slot and an hour until the next, so no rest timer. */
const SLOT_REST = 0;
const BARBELL_REST = 120;

function reps(min: number, max?: number, perSide?: boolean): RepTarget {
  return max == null
    ? { type: 'fixed', min, perSide: perSide || undefined }
    : { type: 'range', min, max, perSide: perSide || undefined };
}

const PLANK: RepTarget = { type: 'timed', seconds: 60, note: '30-60 second hold' };

function pe(
  key: string,
  exerciseId: string,
  sets: number,
  target: RepTarget,
  over: Partial<ProgramExercise> = {},
): ProgramExercise {
  return {
    id: `wfh-${key}`,
    exerciseId,
    sets,
    reps: target,
    restSeconds: SLOT_REST,
    weightMode: 'external',
    ...over,
  };
}

/**
 * The barbell block. A fixed 5 or 6 at RPE 6-7 is the whole prescription, so the
 * rep count itself is the mark — not the default 2-for-2 rule's goal plus two.
 * "A couple of reps left in the tank" is the good-form tick.
 */
function barbell(key: string, exerciseId: string, sets: number, goal: number): ProgramExercise {
  return pe(key, exerciseId, sets, reps(goal), {
    restSeconds: BARBELL_REST,
    note: 'RPE 6-7 — stop with a few reps left. Untick good form if it was a grind.',
    progression: { mode: 'double' },
  });
}

function slot(key: string, time: string, exercises: ProgramExercise[]): Block {
  return { id: `wfh-${key}`, kind: 'straight', label: time, exercises };
}

function day(
  key: string,
  name: string,
  slots: [string, ProgramExercise[]][],
): Workout {
  return {
    id: `wfh-${key}`,
    name,
    kind: 'fixed',
    blocks: slots.map(([time, exercises], i) => slot(`${key}-s${i + 1}`, time, exercises)),
  };
}

const BW = { weightMode: 'bodyweight' } as const;

const MONDAY = day('mon', 'Monday — Squat day', [
  ['6:30', [pe('mon-1', 'dumbbell-shoulder-press', 1, reps(12, 15))]],
  ['7:30', [pe('mon-2', 'dumbbell-floor-press', 1, reps(10, 15))]],
  ['8:30 · Barbell', [barbell('mon-3', 'barbell-back-squat', 3, 5)]],
  ['10:30', [pe('mon-4', 'lateral-raise', 1, reps(15, 20))]],
  ['11:30', [pe('mon-5', 'dumbbell-shoulder-press', 1, reps(12, 15))]],
  ['12:30', [pe('mon-6', 'plank', 1, PLANK, BW)]],
  ['1:30', [pe('mon-7', 'dumbbell-floor-press', 1, reps(10, 15))]],
]);

const TUESDAY = day('tue', 'Tuesday — Bench day', [
  ['6:30', [pe('tue-1', 'dumbbell-row', 1, reps(12, 15))]],
  ['7:30', [pe('tue-2', 'dumbbell-curl', 1, reps(12, 15))]],
  ['8:30 · Barbell', [barbell('tue-3', 'barbell-bench-press', 3, 5)]],
  ['10:30', [pe('tue-4', 'rear-lateral-raise', 1, reps(15, 20))]],
  ['11:30', [pe('tue-5', 'dumbbell-row', 1, reps(12, 15))]],
  ['12:30', [pe('tue-6', 'dead-bug', 1, reps(12, 15, true), BW)]],
  ['1:30', [pe('tue-7', 'dumbbell-curl', 1, reps(12, 15))]],
]);

const WEDNESDAY = day('wed', 'Wednesday — Deadlift day', [
  ['6:30', [pe('wed-1', 'goblet-squat', 1, reps(12, 15))]],
  ['7:30', [pe('wed-2', 'alternating-backstep-lunge', 1, reps(10, 12, true))]],
  ['8:30 · Barbell', [barbell('wed-3', 'barbell-romanian-deadlift', 3, 6)]],
  ['10:30', [pe('wed-4', 'dumbbell-calf-raise', 1, reps(15, 20))]],
  ['11:30', [pe('wed-5', 'goblet-squat', 1, reps(12, 15))]],
  ['12:30', [pe('wed-6', 'plank', 1, PLANK, BW)]],
  ['1:30', [pe('wed-7', 'alternating-backstep-lunge', 1, reps(10, 12, true))]],
]);

const THURSDAY = day('thu', 'Thursday — Overhead Press day', [
  ['6:30', [pe('thu-1', 'dumbbell-shoulder-press', 1, reps(12, 15))]],
  ['7:30', [pe('thu-2', 'dumbbell-row', 1, reps(12, 15))]],
  ['8:30 · Barbell', [barbell('thu-3', 'overhead-press', 3, 6)]],
  ['10:30', [pe('thu-4', 'dumbbell-floor-press', 1, reps(10, 15))]],
  ['11:30', [pe('thu-5', 'dumbbell-curl', 1, reps(12, 15))]],
  ['12:30', [pe('thu-6', 'dead-bug', 1, reps(12, 15, true), BW)]],
  ['1:30', [pe('thu-7', 'lateral-raise', 1, reps(15, 20))]],
]);

const FRIDAY = day('fri', 'Friday — Light full-body day', [
  ['6:30', [pe('fri-1', 'goblet-squat', 1, reps(12, 15))]],
  ['7:30', [pe('fri-2', 'dumbbell-shoulder-press', 1, reps(12, 15))]],
  [
    '8:30 · Barbell',
    [
      pe('fri-3', 'front-squat', 2, reps(6), {
        restSeconds: BARBELL_REST,
        note: 'Lighter than the other barbell days — RPE 6.',
        progression: { mode: 'double' },
      }),
      pe('fri-3b', 'front-squat', 1, reps(6), {
        restSeconds: BARBELL_REST,
        optional: true,
        note: 'Third set if it feels easy.',
        progression: { mode: 'double' },
      }),
    ],
  ],
  ['10:30', [pe('fri-4', 'dumbbell-row', 1, reps(12, 15))]],
  ['11:30', [pe('fri-5', 'alternating-backstep-lunge', 1, reps(10, 12, true))]],
  ['12:30', [pe('fri-6', 'plank', 1, PLANK, BW)]],
  ['1:30', [pe('fri-7', 'dumbbell-curl', 1, reps(12, 15))]],
]);

const PHASE: Phase = {
  id: 'wfh-phase',
  name: 'Weekdays',
  weeks: 12,
  objective: 'One barbell block a day and six dumbbell sets spread through the workday.',
  setRepSummary: 'Barbell 3 x 5-6 at RPE 6-7; dumbbell work 1 set per slot.',
  restSummary: 'About an hour between slots; 2 minutes between barbell sets.',
  workouts: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY],
};

export const WFH_INTERVAL: Program = {
  id: 'wfh-interval',
  name: 'Work-From-Home Intervals',
  source: 'Your own write-up (wfh-interval-program.md)',
  description:
    'Monday to Friday from 6:30: one barbell block at 8:30 and six dumbbell sets spread roughly ' +
    'hourly around it. Schedule it on weekdays starting on a Monday so each day lands on its ' +
    'weekday. Twelve weeks; schedule it again to keep going.',
  phases: [PHASE],
  createdAt: 0,
  updatedAt: 0,
};
