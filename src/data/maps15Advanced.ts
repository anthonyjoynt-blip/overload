import type { Block, Phase, Program, ProgramExercise, RepTarget, Workout } from '../types';

/**
 * MAPS 15 Minutes Advanced, transcribed from the bonus blueprint workout
 * calendar (MAPS Fitness Products LLC, 2022).
 *
 * The same calendar shape as MAPS 15 Minutes — three 3-week phases, six workouts
 * a week plus the optional abs-or-glutes seventh — but two heavier barbell
 * movements a day instead of a circuit of bodyweight work. The source notes that
 * these run closer to twenty minutes than fifteen.
 *
 * Structure only — sets, reps, rest and movement names.
 */

const REST = 60;
const OPTIONAL_REST = 30;

function reps(min: number, max?: number, perSide?: boolean): RepTarget {
  return max == null
    ? { type: 'fixed', min, perSide: perSide || undefined }
    : { type: 'range', min, max, perSide: perSide || undefined };
}

function pe(
  key: string,
  exerciseId: string,
  sets: number,
  target: RepTarget,
  restSeconds: number,
  over: Partial<ProgramExercise> = {},
): ProgramExercise {
  return {
    id: `maps15adv-${key}`,
    exerciseId,
    sets,
    reps: target,
    restSeconds,
    weightMode: 'external',
    ...over,
  };
}

function straight(key: string, exercises: ProgramExercise[]): Block {
  return { id: `maps15adv-${key}`, kind: 'straight', exercises };
}

function superset(key: string, exercises: ProgramExercise[]): Block {
  return {
    id: `maps15adv-${key}`,
    kind: 'superset',
    label: 'Superset',
    restBetweenExercises: 0,
    restAfterRound: REST,
    exercises,
  };
}

/** A pair of straight movements, which is what most days here are. */
function day(
  key: string,
  n: number,
  name: string,
  exercises: ProgramExercise[],
): Workout {
  return {
    id: `maps15adv-${key}-w${n}`,
    name: `Workout #${n} — ${name}`,
    kind: 'fixed',
    blocks: [straight(`${key}-w${n}-b1`, exercises)],
  };
}

/**
 * The five-minute AMRAP that closes each phase's Workout #6. There is no rep
 * number to beat, so the coaching tracks it and charts it but never flags a
 * jump — see the AMRAP note in lib/progression.ts.
 */
function fiveMinuteAmrap(key: string): ProgramExercise {
  return pe(key, 'full-lever-sit-up', 1, { type: 'amrap' }, REST, {
    weightMode: 'bodyweight',
    note: '5 minutes AMRAP',
  });
}

/** Workout #7 — the same abs-or-glutes choice the base program has. */
function optionalSeventh(phaseKey: string): Workout {
  return {
    id: `maps15adv-${phaseKey}-w7`,
    name: 'Workout #7 (optional)',
    kind: 'choice',
    optional: true,
    notes: '30 second rest between each set.',
    blocks: [],
    options: [
      {
        id: `maps15adv-${phaseKey}-w7-abs`,
        name: 'Abs focus',
        kind: 'fixed',
        blocks: [
          straight(`${phaseKey}-w7-abs-b1`, [
            pe(`${phaseKey}-w7-abs-1`, 'reverse-crunch', 3, reps(8, 10), OPTIONAL_REST, {
              weightMode: 'bodyweight',
            }),
            pe(`${phaseKey}-w7-abs-2`, 'perfect-sit-up', 3, reps(8, 10), OPTIONAL_REST, {
              weightMode: 'bodyweight',
            }),
          ]),
        ],
      },
      {
        id: `maps15adv-${phaseKey}-w7-butt`,
        name: 'Butt focus',
        kind: 'fixed',
        blocks: [
          straight(`${phaseKey}-w7-butt-b1`, [
            pe(
              `${phaseKey}-w7-butt-1`,
              'dumbbell-single-leg-toe-touch',
              3,
              reps(8, 10, true),
              OPTIONAL_REST,
            ),
            pe(`${phaseKey}-w7-butt-2`, 'hip-thrust', 3, reps(8, 10), OPTIONAL_REST, {
              note: '3 second squeeze at top',
            }),
          ]),
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Phase I — weeks 1-3, 3-4 sets x 10 reps
// ---------------------------------------------------------------------------

const PHASE_ONE: Phase = {
  id: 'maps15adv-phase-1',
  name: 'Phase I',
  weeks: 3,
  objective: 'To speed up metabolism and build muscle',
  whatToExpect: 'You will begin to feel stronger in your daily movements',
  setRepSummary: '3-4 sets x 10 reps',
  restSummary: '1 minute rest between sets',
  workouts: [
    day('p1', 1, 'Pull', [
      pe('p1-w1-1', 'barbell-deadlift', 4, reps(10), REST),
      pe('p1-w1-2', 'barbell-curl', 3, reps(10), REST),
    ]),
    day('p1', 2, 'Press', [
      pe('p1-w2-1', 'barbell-bench-press', 4, reps(10), REST),
      pe('p1-w2-2', 'overhead-press', 3, reps(10), REST),
    ]),
    day('p1', 3, 'Squat & triceps', [
      pe('p1-w3-1', 'barbell-back-squat', 4, reps(10), REST),
      pe('p1-w3-2', 'dip', 3, reps(10), REST, { weightMode: 'bodyweight-plus' }),
    ]),
    day('p1', 4, 'Incline & shoulders', [
      pe('p1-w4-1', 'incline-barbell-press', 4, reps(10), REST),
      pe('p1-w4-2', 'dumbbell-upright-row', 3, reps(10, undefined, true), REST, {
        note: 'Alternating, each arm',
      }),
    ]),
    day('p1', 5, 'Lunge & pull', [
      pe('p1-w5-1', 'walking-lunge', 4, reps(10, undefined, true), REST, {
        note: 'Alternating, each leg',
      }),
      pe('p1-w5-2', 'pull-up', 3, reps(10), REST, { weightMode: 'bodyweight' }),
    ]),
    day('p1', 6, 'Core', [
      pe('p1-w6-1', 'windmill', 4, reps(10, undefined, true), REST),
      fiveMinuteAmrap('p1-w6-2'),
    ]),
    optionalSeventh('p1'),
  ],
};

// ---------------------------------------------------------------------------
// Phase II — weeks 4-6, 3-4 sets x 15 reps
// ---------------------------------------------------------------------------

const PHASE_TWO: Phase = {
  id: 'maps15adv-phase-2',
  name: 'Phase II',
  weeks: 3,
  objective: 'Increase workload and strength stamina',
  whatToExpect: 'You will notice an increase in muscle endurance and strength output',
  setRepSummary: '3-4 sets x 15 reps',
  restSummary: '1 minute rest between sets',
  workouts: [
    day('p2', 1, 'Front squat & triceps', [
      pe('p2-w1-1', 'front-squat', 4, reps(15), REST),
      pe('p2-w1-2', 'dumbbell-skull-crusher', 3, reps(15), REST),
    ]),
    day('p2', 2, 'Chest', [
      pe('p2-w2-1', 'incline-dumbbell-press', 4, reps(15), REST),
      pe('p2-w2-2', 'dumbbell-bench-press', 3, reps(15), REST),
    ]),
    day('p2', 3, 'Hinge & row', [
      pe('p2-w3-1', 'barbell-romanian-deadlift', 4, reps(15), REST),
      pe('p2-w3-2', 'barbell-row', 3, reps(15), REST),
    ]),
    {
      id: 'maps15adv-p2-w4',
      name: 'Workout #4 — Press & arms',
      kind: 'fixed',
      blocks: [
        straight('p2-w4-b1', [pe('p2-w4-1', 'dumbbell-bench-press', 4, reps(15), REST)]),
        superset('p2-w4-b2', [
          pe('p2-w4-2', 'dumbbell-curl', 3, reps(15), 0),
          pe('p2-w4-3', 'rear-lateral-raise', 3, reps(15), 0),
        ]),
      ],
    },
    day('p2', 5, 'Squat & pull', [
      pe('p2-w5-1', 'barbell-back-squat', 4, reps(15), REST),
      pe('p2-w5-2', 'pull-up', 3, reps(15), REST, { weightMode: 'bodyweight' }),
    ]),
    day('p2', 6, 'Full body & core', [
      pe('p2-w6-1', 'turkish-get-up', 3, reps(10, undefined, true), REST),
      fiveMinuteAmrap('p2-w6-2'),
    ]),
    optionalSeventh('p2'),
  ],
};

// ---------------------------------------------------------------------------
// Phase III — weeks 7-9, 3-5 sets x 5-12 reps
// ---------------------------------------------------------------------------

const PHASE_THREE: Phase = {
  id: 'maps15adv-phase-3',
  name: 'Phase III',
  weeks: 3,
  objective: 'Sculpt and sharpen muscle definition',
  whatToExpect: 'You will notice an increase in stamina and strength mastery',
  setRepSummary: '3-5 sets x 5-12 reps',
  restSummary: '1 minute rest between sets',
  workouts: [
    {
      id: 'maps15adv-p3-w1',
      name: 'Workout #1 — Deadlift & arms',
      kind: 'fixed',
      blocks: [
        straight('p3-w1-b1', [pe('p3-w1-1', 'barbell-deadlift', 5, reps(5), REST)]),
        superset('p3-w1-b2', [
          pe('p3-w1-2', 'barbell-curl', 3, reps(12), 0),
          pe('p3-w1-3', 'lateral-raise', 3, reps(12), 0),
        ]),
      ],
    },
    day('p3', 2, 'Press', [
      pe('p3-w2-1', 'barbell-bench-press', 5, reps(5), REST),
      pe('p3-w2-2', 'barbell-push-press', 3, reps(8), REST),
    ]),
    day('p3', 3, 'Squat & triceps', [
      pe('p3-w3-1', 'barbell-back-squat', 5, reps(5), REST),
      pe('p3-w3-2', 'close-grip-bench-press', 3, reps(5), REST),
    ]),
    day('p3', 4, 'Incline & overhead', [
      pe('p3-w4-1', 'incline-dumbbell-press', 5, reps(5), REST),
      pe('p3-w4-2', 'circus-press', 3, reps(5, undefined, true), REST, { note: 'Each arm' }),
    ]),
    day('p3', 5, 'Row & squat', [
      pe('p3-w5-1', 'barbell-row', 5, reps(5), REST),
      pe('p3-w5-2', 'goblet-squat', 3, reps(8), REST),
    ]),
    day('p3', 6, 'Core & full body', [
      fiveMinuteAmrap('p3-w6-1'),
      pe('p3-w6-2', 'turkish-get-up', 3, reps(5, undefined, true), REST),
      pe('p3-w6-3', 'windmill', 3, reps(5, undefined, true), REST),
    ]),
    optionalSeventh('p3'),
  ],
};

export const MAPS_15_MINUTES_ADVANCED: Program = {
  id: 'maps-15-minutes-advanced',
  name: 'MAPS 15 Minutes Advanced',
  source:
    'MAPS 15 Minutes Advanced bonus blueprint workout calendar (MAPS Fitness Products LLC, 2022)',
  description:
    'The bonus blueprint: the same three 3-week phases and six-day week as MAPS 15 Minutes, but ' +
    'two heavier barbell movements a day. Phase I is tens, Phase II fifteens, Phase III drops to ' +
    'fives. The source notes these run closer to twenty minutes than fifteen.',
  phases: [PHASE_ONE, PHASE_TWO, PHASE_THREE],
  createdAt: 0,
  updatedAt: 0,
};
