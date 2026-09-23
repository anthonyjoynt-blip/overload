import type { Block, Phase, Program, ProgramExercise, RepTarget, Workout } from '../types';

/**
 * MAPS Aesthetic, transcribed from the blueprints and workout calendar
 * (Mind Pump Media, LLC, 2018).
 *
 * Three phases — 3, 4 and 3 weeks. Each week runs Foundational Day 1, a Focus
 * Session, Day 2, a Focus Session, Day 3, a Focus Session, then a rest day.
 *
 * The Focus Session is the reason this program needed the open-slot model: it is
 * a fixed slot on the calendar with rules (one lagging body part, 2-3 exercises
 * of your choosing, 3 sets each, 10-20 reps) rather than a fixed exercise list.
 *
 * Structure only — sets, reps, rest and movement names. The coaching content
 * stays with the source.
 */

function reps(min: number, max: number, perSide?: boolean): RepTarget {
  return { type: 'range', min, max, perSide: perSide || undefined };
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
    id: `aesthetic-${key}`,
    exerciseId,
    sets,
    reps: target,
    restSeconds,
    weightMode: 'external',
    ...over,
  };
}

function straight(key: string, exercises: ProgramExercise[]): Block {
  return { id: `aesthetic-${key}`, kind: 'straight', exercises };
}

/** A superset pair: no rest between the two, the real rest after the pair. */
function superset(key: string, rest: number, exercises: ProgramExercise[]): Block {
  return {
    id: `aesthetic-${key}`,
    kind: 'superset',
    label: 'Superset',
    restBetweenExercises: 0,
    restAfterRound: rest,
    exercises,
  };
}

// ---------------------------------------------------------------------------
// The Focus Session — one open slot, reused three times a week in every phase
// ---------------------------------------------------------------------------

function focusSession(phaseKey: string): Workout {
  return {
    id: `aesthetic-${phaseKey}-focus`,
    name: 'Focus Session',
    kind: 'open',
    open: {
      focus: 'One lagging body part',
      setCap: 3,
      repScheme: { type: 'range', min: 10, max: 20 },
      restSeconds: 90,
      durationCapMinutes: 30,
      guidance:
        'Pick one body part and 2-3 exercises for it, 3 sets each. Lower intensity than a ' +
        'foundational day, so machines and isolation work you would normally skip are fair game. ' +
        'Keep the total to 6-9 sets per body part on your first run through.',
    },
    blocks: [],
    notes: 'Two body parts across the week is the recommendation — e.g. shoulders one day, legs another.',
  };
}

// ---------------------------------------------------------------------------
// Phase I — Strength, weeks 1-3, 90 seconds between sets
// ---------------------------------------------------------------------------

const P1_REST = 90;

const PHASE_ONE_DAY_1: Workout = {
  id: 'aesthetic-p1-d1',
  name: 'Foundational Day 1',
  kind: 'fixed',
  blocks: [
    straight('p1-d1-b1', [
      pe('p1-d1-1', 'barbell-back-squat', 5, reps(2, 5), P1_REST),
      pe('p1-d1-2', 'barbell-romanian-deadlift', 3, reps(6, 8), P1_REST),
      pe('p1-d1-3', 'incline-barbell-press', 4, reps(3, 6), P1_REST),
      pe('p1-d1-4', 'supinated-barbell-row', 4, reps(4, 6), P1_REST),
      pe('p1-d1-5', 'dumbbell-shrug', 4, reps(5, 7), P1_REST),
      pe('p1-d1-6', 'barbell-push-press', 3, reps(3, 6), P1_REST),
      pe('p1-d1-7', 'rear-lateral-raise', 1, reps(8, 12), P1_REST),
      pe('p1-d1-8', 'barbell-curl', 4, reps(6, 8), P1_REST),
      pe('p1-d1-9', 'skull-crusher', 4, reps(6, 8), P1_REST),
      pe('p1-d1-10', 'lying-leg-raise', 3, reps(10, 12), P1_REST, { weightMode: 'bodyweight' }),
      pe('p1-d1-11', 'standing-calf-raise', 3, reps(10, 20), P1_REST),
    ]),
  ],
};

const PHASE_ONE_DAY_2: Workout = {
  id: 'aesthetic-p1-d2',
  name: 'Foundational Day 2',
  kind: 'fixed',
  blocks: [
    straight('p1-d2-b1', [
      pe('p1-d2-1', 'barbell-deadlift', 5, reps(1, 4), P1_REST),
      pe('p1-d2-2', 'barbell-shrug', 2, reps(4, 6), P1_REST),
      pe('p1-d2-3', 'pull-up', 3, reps(4, 8), P1_REST, {
        weightMode: 'bodyweight-plus',
        note: 'Weighted',
      }),
      pe('p1-d2-4', 'walking-lunge', 3, { type: 'fixed', min: 10, perSide: true }, P1_REST),
      pe('p1-d2-5', 'incline-dumbbell-press', 5, reps(6, 8), P1_REST),
      pe('p1-d2-6', 'arnold-press', 4, reps(6, 8), P1_REST, { note: 'Seated' }),
      pe('p1-d2-7', 'rear-cable-fly', 1, reps(8, 10), P1_REST),
      pe('p1-d2-8', 'supinating-dumbbell-curl', 4, reps(6, 8), P1_REST),
      pe('p1-d2-9', 'dip', 4, reps(6, 8), P1_REST, {
        weightMode: 'bodyweight-plus',
        note: 'Weighted if necessary',
      }),
      pe('p1-d2-10', 'decline-sit-up', 4, reps(10, 15), P1_REST, { weightMode: 'bodyweight' }),
      pe('p1-d2-11', 'seated-calf-raise', 4, reps(10, 20), P1_REST),
    ]),
  ],
};

const PHASE_ONE_DAY_3: Workout = {
  id: 'aesthetic-p1-d3',
  name: 'Foundational Day 3',
  kind: 'fixed',
  blocks: [
    straight('p1-d3-b1', [
      pe('p1-d3-1', 'front-squat', 3, reps(8, 12), P1_REST),
      pe('p1-d3-2', 't-bar-row', 4, reps(6, 8), P1_REST),
      pe('p1-d3-3', 'dumbbell-bench-press', 4, reps(6, 8), P1_REST),
      pe('p1-d3-4', 'barbell-upright-row', 4, reps(6, 8), P1_REST),
      pe('p1-d3-5', 'preacher-curl', 4, reps(6, 8), P1_REST),
      pe('p1-d3-6', 'dumbbell-overhead-tricep-extension', 4, reps(6, 8), P1_REST, {
        note: 'Seated',
      }),
      pe('p1-d3-7', 'ball-crunch', 3, { type: 'fixed', min: 20 }, P1_REST, {
        weightMode: 'bodyweight',
      }),
      pe('p1-d3-8', 'single-leg-calf-raise', 3, { type: 'fixed', min: 20, perSide: true }, P1_REST, {
        weightMode: 'bodyweight',
      }),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// Phase II — Size, weeks 4-7, 60 seconds between sets
// ---------------------------------------------------------------------------

const P2_REST = 60;

const PHASE_TWO_DAY_1: Workout = {
  id: 'aesthetic-p2-d1',
  name: 'Foundational Day 1',
  kind: 'fixed',
  blocks: [
    straight('p2-d1-b1', [
      pe('p2-d1-1', 'barbell-back-squat', 3, reps(8, 12), P2_REST),
      pe('p2-d1-2', 'barbell-bench-press', 3, reps(10, 15), P2_REST),
      pe('p2-d1-3', 'single-arm-dumbbell-row', 3, reps(8, 12), P2_REST),
      pe('p2-d1-4', 'dumbbell-shrug', 3, reps(8, 12), P2_REST),
      pe('p2-d1-5', 'overhead-press', 3, reps(8, 12), P2_REST),
      pe('p2-d1-6', 'cable-lateral-raise', 2, reps(8, 12), P2_REST),
      pe('p2-d1-7', 'barbell-curl', 4, reps(8, 12), P2_REST),
      pe('p2-d1-8', 'dumbbell-skull-crusher', 4, reps(8, 12), P2_REST),
      pe('p2-d1-9', 'lying-leg-raise', 3, reps(10, 20), P2_REST, { weightMode: 'bodyweight' }),
      pe('p2-d1-10', 'leg-press-calf-raise', 3, reps(10, 20), P2_REST),
    ]),
  ],
};

const PHASE_TWO_DAY_2: Workout = {
  id: 'aesthetic-p2-d2',
  name: 'Foundational Day 2',
  kind: 'fixed',
  blocks: [
    straight('p2-d2-b1', [
      pe('p2-d2-1', 'barbell-deadlift', 3, reps(8, 12), P2_REST),
      pe('p2-d2-2', 'incline-dumbbell-press', 3, reps(8, 12), P2_REST),
      pe('p2-d2-3', 'lat-pulldown', 3, reps(8, 12), P2_REST),
      pe('p2-d2-4', 'barbell-shrug', 3, reps(8, 12), P2_REST),
      pe('p2-d2-5', 'lateral-raise', 3, reps(8, 12), P2_REST),
      pe('p2-d2-6', 'rear-lateral-raise', 2, reps(8, 12), P2_REST),
      pe('p2-d2-7', 'hammer-curl', 4, reps(8, 12), P2_REST, { note: 'Alternating' }),
      pe('p2-d2-8', 'incline-close-grip-press', 4, reps(8, 12), P2_REST),
      pe('p2-d2-9', 'alternating-v-up', 3, reps(10, 20), P2_REST, { weightMode: 'bodyweight' }),
      pe('p2-d2-10', 'seated-calf-raise', 3, reps(10, 20), P2_REST),
    ]),
  ],
};

const PHASE_TWO_DAY_3: Workout = {
  id: 'aesthetic-p2-d3',
  name: 'Foundational Day 3',
  kind: 'fixed',
  blocks: [
    straight('p2-d3-b1', [
      pe('p2-d3-1', 'single-leg-press', 3, reps(8, 12), P2_REST),
      pe('p2-d3-2', 'snatch-grip-deadlift', 2, reps(10, 12), P2_REST),
      pe('p2-d3-3', 't-bar-row', 3, reps(8, 12), P2_REST),
      pe('p2-d3-4', 'incline-barbell-press', 3, reps(8, 12), P2_REST),
      pe('p2-d3-5', 'dumbbell-shrug', 3, reps(8, 12), P2_REST),
      pe('p2-d3-6', 'rotational-dumbbell-press', 3, reps(8, 12), P2_REST),
      pe('p2-d3-7', 'rear-cable-fly', 2, reps(10, 12), P2_REST),
      pe('p2-d3-8', 'spider-curl', 3, reps(10, 12), P2_REST),
      pe('p2-d3-9', 'dip', 3, reps(10, 12), P2_REST, { weightMode: 'bodyweight-plus' }),
      pe('p2-d3-10', 'decline-twist', 3, reps(10, 12), P2_REST, { weightMode: 'bodyweight' }),
      pe('p2-d3-11', 'standing-calf-raise', 3, reps(10, 20), P2_REST),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// Phase III — Sharpen, weeks 8-10. Supersets: no rest inside a pair, 90s after.
// ---------------------------------------------------------------------------

const P3_REST = 90;

const PHASE_THREE_DAY_1: Workout = {
  id: 'aesthetic-p3-d1',
  name: 'Foundational Day 1',
  kind: 'fixed',
  blocks: [
    superset('p3-d1-s1', P3_REST, [
      pe('p3-d1-1', 'barbell-back-squat', 4, reps(8, 12), 0),
      pe('p3-d1-2', 'front-loaded-dumbbell-squat', 4, reps(8, 12), 0),
    ]),
    superset('p3-d1-s2', P3_REST, [
      pe('p3-d1-3', 'incline-barbell-press', 4, reps(8, 12), 0),
      pe('p3-d1-4', 'chest-fly', 4, reps(10, 15), 0),
    ]),
    superset('p3-d1-s3', P3_REST, [
      pe('p3-d1-5', 'lat-pulldown', 4, reps(8, 12), 0),
      pe('p3-d1-6', 'single-arm-dumbbell-row', 4, reps(10, 15), 0),
    ]),
    superset('p3-d1-s4', P3_REST, [
      pe('p3-d1-7', 'overhead-press', 4, reps(8, 12), 0),
      pe('p3-d1-8', 'rear-lateral-raise', 4, reps(10, 15), 0),
    ]),
    superset('p3-d1-s5', P3_REST, [
      pe('p3-d1-9', 'barbell-curl', 4, reps(8, 12), 0),
      pe('p3-d1-10', 'hammer-curl', 4, reps(10, 15), 0),
    ]),
    superset('p3-d1-s6', P3_REST, [
      pe('p3-d1-11', 'incline-close-grip-press', 4, reps(8, 12), 0),
      pe('p3-d1-12', 'close-grip-push-up', 4, reps(10, 15), 0, { weightMode: 'bodyweight' }),
    ]),
    straight('p3-d1-b7', [
      pe('p3-d1-13', 'hanging-leg-raise', 3, reps(8, 12), P3_REST, { weightMode: 'bodyweight' }),
      pe('p3-d1-14', 'standing-calf-raise', 4, reps(8, 12), P3_REST),
      pe('p3-d1-15', 'seated-calf-raise', 4, reps(10, 15), P3_REST),
    ]),
  ],
};

const PHASE_THREE_DAY_2: Workout = {
  id: 'aesthetic-p3-d2',
  name: 'Foundational Day 2',
  kind: 'fixed',
  blocks: [
    superset('p3-d2-s1', P3_REST, [
      pe('p3-d2-1', 'barbell-deadlift', 4, reps(5, 7), 0),
      pe('p3-d2-2', 'pull-up', 4, { type: 'amrap', min: 8 }, 0, {
        weightMode: 'bodyweight',
        note: 'As many reps as possible',
      }),
    ]),
    superset('p3-d2-s2', P3_REST, [
      pe('p3-d2-3', 'leg-curl', 4, reps(8, 12), 0, { note: 'Lying' }),
      pe('p3-d2-4', 'bulgarian-split-squat', 4, reps(10, 15), 0),
    ]),
    superset('p3-d2-s3', P3_REST, [
      pe('p3-d2-5', 'barbell-bench-press', 4, reps(8, 12), 0),
      pe('p3-d2-6', 'dumbbell-bench-press', 4, reps(10, 15), 0),
    ]),
    superset('p3-d2-s4', P3_REST, [
      pe('p3-d2-7', 'dumbbell-shoulder-press', 4, reps(8, 12), 0),
      pe('p3-d2-8', 'lateral-raise', 4, reps(10, 15), 0),
    ]),
    straight('p3-d2-b5', [
      pe('p3-d2-9', 'barbell-curl', 4, { type: 'fixed', min: 7 }, P3_REST, {
        note: "21s — 7 lower half, 7 upper half, 7 full",
      }),
      pe('p3-d2-10', 'incline-skull-crusher', 4, { type: 'fixed', min: 7 }, P3_REST, {
        note: "21s — 7 lower half, 7 upper half, 7 full",
      }),
      pe('p3-d2-11', 'ball-crunch', 3, reps(10, 20), P3_REST, { weightMode: 'bodyweight' }),
      pe('p3-d2-12', 'single-leg-calf-raise', 3, reps(10, 20), P3_REST, {
        weightMode: 'bodyweight',
      }),
    ]),
  ],
};

const PHASE_THREE_DAY_3: Workout = {
  id: 'aesthetic-p3-d3',
  name: 'Foundational Day 3',
  kind: 'fixed',
  blocks: [
    superset('p3-d3-s1', P3_REST, [
      pe('p3-d3-1', 'barbell-back-squat', 4, reps(8, 12), 0),
      pe('p3-d3-2', 'sissy-squat', 4, reps(10, 15), 0, { weightMode: 'bodyweight' }),
    ]),
    superset('p3-d3-s2', P3_REST, [
      pe('p3-d3-3', 'dumbbell-bench-press', 4, reps(8, 12), 0),
      pe('p3-d3-4', 'chest-fly', 4, reps(8, 12), 0),
    ]),
    superset('p3-d3-s3', P3_REST, [
      pe('p3-d3-5', 'supinated-barbell-row', 4, reps(10, 15), 0),
      pe('p3-d3-6', 'single-arm-dumbbell-row', 4, reps(10, 15), 0),
    ]),
    superset('p3-d3-s4', P3_REST, [
      pe('p3-d3-7', 'overhead-press', 4, reps(10, 15), 0),
      pe('p3-d3-8', 'barbell-upright-row', 4, reps(8, 12), 0),
    ]),
    superset('p3-d3-s5', P3_REST, [
      pe('p3-d3-9', 'supinating-dumbbell-curl', 4, reps(10, 12), 0, { note: 'Seated' }),
      pe('p3-d3-10', 'dumbbell-skull-crusher', 4, reps(10, 12), 0),
    ]),
    straight('p3-d3-b6', [
      pe('p3-d3-11', 'ball-crunch', 4, reps(10, 20), P3_REST, { weightMode: 'bodyweight' }),
      pe('p3-d3-12', 'plank', 1, { type: 'timed', seconds: 60 }, P3_REST, {
        weightMode: 'bodyweight',
      }),
      pe('p3-d3-13', 'standing-calf-raise', 4, reps(10, 20), P3_REST),
    ]),
  ],
};

// ---------------------------------------------------------------------------

/** Day 1, Focus, Day 2, Focus, Day 3, Focus — then a rest day. */
function week(days: Workout[], focus: Workout): Workout[] {
  return [days[0], focus, days[1], focus, days[2], focus];
}

const PHASE_ONE: Phase = {
  id: 'aesthetic-phase-1',
  name: 'Phase I — Strength',
  weeks: 3,
  objective:
    'To build maximal strength and Central Nervous System adaptation for a granite hard look.',
  whatToExpect: 'Solid hard feeling muscles.',
  setRepSummary: 'Foundational 4 sets x 3-5 reps · Focus Sessions 3 sets x 10-20 reps',
  restSummary: '90 seconds between sets',
  workouts: week(
    [PHASE_ONE_DAY_1, PHASE_ONE_DAY_2, PHASE_ONE_DAY_3],
    focusSession('p1'),
  ),
};

const PHASE_TWO: Phase = {
  id: 'aesthetic-phase-2',
  name: 'Phase II — Size',
  weeks: 4,
  objective: 'To build full round muscle bellies.',
  whatToExpect: 'Bigger pumps, larger and more pronounced muscles and better symmetry.',
  setRepSummary: 'Foundational 3-4 sets x 8-15 reps · Focus Sessions 3 sets x 10-20 reps',
  restSummary: '60 seconds between sets',
  workouts: week(
    [PHASE_TWO_DAY_1, PHASE_TWO_DAY_2, PHASE_TWO_DAY_3],
    focusSession('p2'),
  ),
};

const PHASE_THREE: Phase = {
  id: 'aesthetic-phase-3',
  name: 'Phase III — Sharpen',
  weeks: 3,
  objective: 'To sharpen and detail your physique.',
  whatToExpect: 'Accelerated fat loss, more definition, more balance and better aesthetics.',
  setRepSummary: 'Foundational 3-4 sets x 8-15 reps · Focus Sessions 3 sets x 10-20 reps',
  restSummary: 'No rest between a superset pair, 90 seconds after it',
  workouts: week(
    [PHASE_THREE_DAY_1, PHASE_THREE_DAY_2, PHASE_THREE_DAY_3],
    focusSession('p3'),
  ),
};

export const MAPS_AESTHETIC: Program = {
  id: 'maps-aesthetic',
  name: 'MAPS Aesthetic',
  source: 'MAPS Aesthetic Blueprints and Calendar (Mind Pump Media, LLC, 2018)',
  description:
    'Ten weeks in three phases: strength, then size, then sharpen. Three foundational days a week ' +
    'with a Focus Session between each — an open slot where you pick the movements for one lagging ' +
    'body part. Needs a full gym.',
  phases: [PHASE_ONE, PHASE_TWO, PHASE_THREE],
  createdAt: 0,
  updatedAt: 0,
};
