import type { Block, Phase, Program, ProgramExercise, RepTarget, Workout } from '../types';

/**
 * MAPS 15 Minutes, transcribed from the blueprint workout calendar
 * (MAPS Fitness Products LLC, 2022) — three 3-week phases, six workouts a week
 * plus an optional seventh, which is a choice between an abs day and a glutes day.
 *
 * Held here as the first saved program so the app has something real to run
 * against on day one. The transcription is of the structure only — sets, reps,
 * rest and movement names. The coaching content stays with the source.
 */

const REPS_8_10: RepTarget = { type: 'range', min: 8, max: 10 };
const REPS_8_10_EACH: RepTarget = { type: 'range', min: 8, max: 10, perSide: true };

/** Ids are stable slugs so re-seeding updates the program rather than cloning it. */
function pe(
  key: string,
  exerciseId: string,
  sets: number,
  reps: RepTarget,
  restSeconds: number,
  over: Partial<ProgramExercise> = {},
): ProgramExercise {
  return {
    id: `maps15-${key}`,
    exerciseId,
    sets,
    reps,
    restSeconds,
    weightMode: 'external',
    ...over,
  };
}

function straight(key: string, exercises: ProgramExercise[]): Block {
  return { id: `maps15-${key}`, kind: 'straight', exercises };
}

function optionalSeventh(phaseKey: string): Workout {
  const rest = 30;
  return {
    id: `maps15-${phaseKey}-w7`,
    name: 'Workout #7 (optional)',
    kind: 'choice',
    optional: true,
    notes: '30 second rest between each set.',
    blocks: [],
    options: [
      {
        id: `maps15-${phaseKey}-w7-abs`,
        name: 'Abs focus',
        kind: 'fixed',
        blocks: [
          straight(`${phaseKey}-w7-abs-b1`, [
            pe(`${phaseKey}-w7-abs-1`, 'reverse-crunch', 3, REPS_8_10, rest, {
              weightMode: 'bodyweight',
            }),
            pe(`${phaseKey}-w7-abs-2`, 'perfect-sit-up', 3, REPS_8_10, rest, {
              weightMode: 'bodyweight',
            }),
          ]),
        ],
      },
      {
        id: `maps15-${phaseKey}-w7-butt`,
        name: 'Butt focus',
        kind: 'fixed',
        blocks: [
          straight(`${phaseKey}-w7-butt-b1`, [
            pe(`${phaseKey}-w7-butt-1`, 'dumbbell-single-leg-toe-touch', 3, REPS_8_10_EACH, rest),
            pe(`${phaseKey}-w7-butt-2`, 'hip-thrust', 3, REPS_8_10, rest, {
              note: '3 second squeeze at top',
            }),
          ]),
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Phase I — 3 x 8-10, 1 minute rest
// ---------------------------------------------------------------------------

const P1_REST = 60;

function phaseOneLegs(n: number): Workout {
  return {
    id: `maps15-p1-w${n}`,
    name: `Workout #${n} — Legs`,
    kind: 'fixed',
    blocks: [
      straight(`p1-w${n}-b1`, [
        pe(`p1-w${n}-1`, 'bulgarian-split-squat', 3, REPS_8_10, P1_REST),
        pe(`p1-w${n}-2`, 'romanian-deadlift', 3, REPS_8_10, P1_REST, {
          note: '3 second glute squeeze at top',
        }),
      ]),
    ],
  };
}

function phaseOnePushPull(n: number): Workout {
  return {
    id: `maps15-p1-w${n}`,
    name: `Workout #${n} — Push / Pull`,
    kind: 'fixed',
    blocks: [
      straight(`p1-w${n}-b1`, [
        pe(`p1-w${n}-1`, 'suspension-trainer-push-up', 3, REPS_8_10, P1_REST, {
          weightMode: 'bodyweight',
        }),
        pe(`p1-w${n}-2`, 'suspension-trainer-body-row', 3, REPS_8_10, P1_REST, {
          weightMode: 'bodyweight',
          note: '3 second squeeze at peak',
        }),
        pe(`p1-w${n}-3`, 'plank', 1, { type: 'timed', seconds: 60 }, P1_REST, {
          weightMode: 'bodyweight',
        }),
      ]),
    ],
  };
}

function phaseOneArms(n: number): Workout {
  return {
    id: `maps15-p1-w${n}`,
    name: `Workout #${n} — Shoulders & Arms`,
    kind: 'fixed',
    blocks: [
      straight(`p1-w${n}-b1`, [pe(`p1-w${n}-1`, 'arnold-press', 3, REPS_8_10, P1_REST)]),
      {
        id: `maps15-p1-w${n}-b2`,
        kind: 'superset',
        label: 'Superset',
        restAfterRound: P1_REST,
        restBetweenExercises: 0,
        exercises: [
          pe(`p1-w${n}-2`, 'suspension-trainer-skull-crusher', 3, REPS_8_10, P1_REST, {
            weightMode: 'bodyweight',
          }),
          pe(`p1-w${n}-3`, 'suspension-trainer-curl', 3, REPS_8_10, P1_REST, {
            weightMode: 'bodyweight',
          }),
        ],
      },
    ],
  };
}

const PHASE_ONE: Phase = {
  id: 'maps15-phase-1',
  name: 'Phase I',
  weeks: 3,
  objective: 'To build overall strength and stability',
  whatToExpect: 'You will begin to feel stronger in your daily movements',
  setRepSummary: '3 x 8-10 reps',
  restSummary: '1 minute rest between sets',
  workouts: [
    phaseOneLegs(1),
    phaseOnePushPull(2),
    phaseOneArms(3),
    phaseOneLegs(4),
    phaseOnePushPull(5),
    phaseOneArms(6),
    optionalSeventh('p1'),
  ],
};

// ---------------------------------------------------------------------------
// Phase II — 3-4 x 8-10, 45 second rest
// ---------------------------------------------------------------------------

const P2_REST = 45;

function phaseTwoLegs(n: number): Workout {
  return {
    id: `maps15-p2-w${n}`,
    name: `Workout #${n} — Legs`,
    kind: 'fixed',
    blocks: [
      straight(`p2-w${n}-b1`, [
        pe(`p2-w${n}-1`, 'heels-elevated-goblet-squat', 3, REPS_8_10, P2_REST),
        pe(`p2-w${n}-2`, 'romanian-deadlift', 3, REPS_8_10, P2_REST),
        pe(`p2-w${n}-3`, 'front-step-lunge', 3, REPS_8_10_EACH, P2_REST, {
          note: 'One leg at a time',
        }),
      ]),
    ],
  };
}

function phaseTwoPushPull(n: number): Workout {
  return {
    id: `maps15-p2-w${n}`,
    name: `Workout #${n} — Push / Pull`,
    kind: 'fixed',
    blocks: [
      straight(`p2-w${n}-b1`, [
        pe(`p2-w${n}-1`, 'push-up', 4, REPS_8_10, P2_REST, { weightMode: 'bodyweight' }),
        pe(`p2-w${n}-2`, 'dumbbell-row', 4, REPS_8_10, P2_REST, { note: 'Arms together' }),
        pe(`p2-w${n}-3`, 'plank', 1, { type: 'timed', seconds: 60 }, P2_REST, {
          weightMode: 'bodyweight',
        }),
      ]),
    ],
  };
}

function phaseTwoArms(n: number): Workout {
  return {
    id: `maps15-p2-w${n}`,
    name: `Workout #${n} — Shoulders & Arms`,
    kind: 'fixed',
    blocks: [
      straight(`p2-w${n}-b1`, [
        pe(`p2-w${n}-1`, 'dumbbell-shoulder-press', 3, REPS_8_10, P2_REST),
        pe(`p2-w${n}-2`, 'dumbbell-curl', 3, REPS_8_10, P2_REST),
        pe(`p2-w${n}-3`, 'dumbbell-overhead-tricep-extension', 3, REPS_8_10, P2_REST),
      ]),
    ],
  };
}

const PHASE_TWO: Phase = {
  id: 'maps15-phase-2',
  name: 'Phase II',
  weeks: 3,
  objective: 'To speed up metabolism and build muscle',
  whatToExpect: 'You will notice an increase in muscle endurance and strength output',
  setRepSummary: '3-4 x 8-10 reps',
  restSummary: '45 second rest between sets',
  workouts: [
    phaseTwoLegs(1),
    phaseTwoPushPull(2),
    phaseTwoArms(3),
    phaseTwoLegs(4),
    phaseTwoPushPull(5),
    phaseTwoArms(6),
    optionalSeventh('p2'),
  ],
};

// ---------------------------------------------------------------------------
// Phase III — circuits, no rest between exercises, 3 minutes between circuits
// ---------------------------------------------------------------------------

const CIRCUIT_REST = 180;

function circuit(key: string, rounds: number, exercises: ProgramExercise[]): Block {
  return {
    id: `maps15-${key}`,
    kind: 'circuit',
    label: `Repeat ${rounds} times`,
    rounds,
    restBetweenExercises: 0,
    restAfterRound: CIRCUIT_REST,
    exercises,
  };
}

function phaseThreeUpper(n: number): Workout {
  return {
    id: `maps15-p3-w${n}`,
    name: `Circuit #${n} — Upper`,
    kind: 'fixed',
    blocks: [
      circuit(`p3-w${n}-c`, 4, [
        pe(`p3-w${n}-1`, 'push-up', 1, { type: 'fixed', min: 10 }, 0, {
          weightMode: 'bodyweight',
        }),
        pe(`p3-w${n}-2`, 'dumbbell-shoulder-press', 1, { type: 'fixed', min: 10 }, 0),
        pe(`p3-w${n}-3`, 'dumbbell-row', 1, { type: 'fixed', min: 10 }, 0, {
          note: 'Arms together',
        }),
      ]),
    ],
  };
}

function phaseThreeLower(n: number): Workout {
  return {
    id: `maps15-p3-w${n}`,
    name: `Circuit #${n} — Lower`,
    kind: 'fixed',
    blocks: [
      circuit(`p3-w${n}-c`, 4, [
        pe(`p3-w${n}-1`, 'dumbbell-single-leg-deadlift', 1, { type: 'fixed', min: 5, perSide: true }, 0),
        pe(`p3-w${n}-2`, 'heels-elevated-goblet-squat', 1, { type: 'fixed', min: 10 }, 0),
        pe(`p3-w${n}-3`, 'alternating-backstep-lunge', 1, { type: 'fixed', min: 10, perSide: true }, 0),
      ]),
    ],
  };
}

function phaseThreeFullBody(n: number): Workout {
  return {
    id: `maps15-p3-w${n}`,
    name: `Circuit #${n} — Full body`,
    kind: 'fixed',
    blocks: [
      circuit(`p3-w${n}-c`, 3, [
        pe(`p3-w${n}-1`, 'turkish-get-up', 1, { type: 'fixed', min: 5, perSide: true }, 0),
        pe(`p3-w${n}-2`, 'windmill', 1, { type: 'fixed', min: 5, perSide: true }, 0),
        pe(`p3-w${n}-3`, 'active-plank', 1, { type: 'fixed', min: 10 }, 0, {
          weightMode: 'bodyweight',
        }),
      ]),
    ],
  };
}

const PHASE_THREE: Phase = {
  id: 'maps15-phase-3',
  name: 'Phase III',
  weeks: 3,
  objective: 'To build muscle and sculpt the body',
  whatToExpect: 'You will notice an increase in stamina and strength mastery',
  setRepSummary: '3-4 circuits, 5-10 reps per exercise',
  restSummary: 'No rest between exercises, 3 minutes between circuits',
  workouts: [
    phaseThreeUpper(1),
    phaseThreeLower(2),
    phaseThreeFullBody(3),
    phaseThreeUpper(4),
    phaseThreeLower(5),
    phaseThreeFullBody(6),
    optionalSeventh('p3'),
  ],
};

export const MAPS_15_MINUTES: Program = {
  id: 'maps-15-minutes',
  name: 'MAPS 15 Minutes',
  source: 'MAPS 15 Minutes blueprint workout calendar (MAPS Fitness Products LLC, 2022)',
  description:
    'Three 3-week phases. Six sessions a week with an optional seventh — abs or glutes, your pick. ' +
    'Phase I builds strength and stability, Phase II adds volume on shorter rest, Phase III turns it into circuits.',
  phases: [PHASE_ONE, PHASE_TWO, PHASE_THREE],
  createdAt: 0,
  updatedAt: 0,
};
