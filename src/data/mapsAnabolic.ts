import type { Block, Phase, Program, ProgramExercise, RepTarget, Workout } from '../types';

/**
 * MAPS Anabolic, transcribed from the blueprints and workout calendar
 * (Mind Pump Media, LLC, 2018).
 *
 * A Pre Phase plus three phases, three weeks each. Foundational workouts run
 * two or three times a week; every other day carries a Trigger Session — a short
 * open slot (under ten minutes, 3-5 exercises you pick, run as a circuit) aimed
 * at whatever is lagging.
 *
 * Structure only — sets, reps, rest and movement names.
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
    id: `anabolic-${key}`,
    exerciseId,
    sets,
    reps: target,
    restSeconds,
    weightMode: 'external',
    ...over,
  };
}

function straight(key: string, exercises: ProgramExercise[]): Block {
  return { id: `anabolic-${key}`, kind: 'straight', exercises };
}

function superset(key: string, rest: number, exercises: ProgramExercise[]): Block {
  return {
    id: `anabolic-${key}`,
    kind: 'superset',
    label: 'Superset',
    restBetweenExercises: 0,
    restAfterRound: rest,
    exercises,
  };
}

// ---------------------------------------------------------------------------
// The Trigger Session — the same open slot in every phase
// ---------------------------------------------------------------------------

function triggerSession(phaseKey: string): Workout {
  return {
    id: `anabolic-${phaseKey}-trigger`,
    name: 'Trigger Session',
    kind: 'open',
    open: {
      focus: 'A weak area',
      setCap: 3,
      repScheme: { type: 'range', min: 10, max: 20 },
      restSeconds: 15,
      durationCapMinutes: 10,
      guidance:
        'Pick 3-5 exercises and do them in succession as a circuit, 1-3 times through, ' +
        '10-20 reps each. Continuous with minimal rest. Under ten minutes — if it is longer ' +
        'than that it has stopped being a trigger session. Bands and bodyweight are ideal.',
    },
    blocks: [],
    notes: 'One to three of these a day on non-foundational days. The trigger sessions stay the same through every phase.',
  };
}

// ---------------------------------------------------------------------------
// Pre Phase — Laying the foundation, weeks 1-3, 90 seconds rest
// ---------------------------------------------------------------------------

const PRE_REST = 90;

const PRE_PHASE_WORKOUT: Workout = {
  id: 'anabolic-pre-f1',
  name: 'Foundational Workout',
  kind: 'fixed',
  blocks: [
    straight('pre-b1', [
      pe('pre-1', 'barbell-back-squat', 2, reps(12, 16), PRE_REST),
      pe('pre-2', 'walking-lunge', 1, reps(16, 20), PRE_REST),
      pe('pre-3', 'barbell-deadlift', 1, reps(8, 12), PRE_REST),
      pe('pre-4', 'barbell-bench-press', 2, reps(12, 16), PRE_REST),
      pe('pre-5', 'dumbbell-row', 2, reps(12, 16), PRE_REST),
      pe('pre-6', 'dumbbell-shrug', 2, reps(12, 16), PRE_REST),
      pe('pre-7', 'dumbbell-shoulder-press', 2, reps(12, 16), PRE_REST, { note: 'Standing' }),
      pe('pre-8', 'rear-lateral-raise', 1, reps(12, 16), PRE_REST),
      pe('pre-9', 'barbell-curl', 2, reps(12, 16), PRE_REST),
      pe('pre-10', 'triceps-pushdown', 2, reps(12, 16), PRE_REST),
      pe('pre-11', 'plank', 2, { type: 'timed', seconds: 60 }, PRE_REST, {
        weightMode: 'bodyweight',
        note: '30-60 second hold',
      }),
      pe('pre-12', 'standing-calf-raise', 2, reps(20, 40), PRE_REST, {
        weightMode: 'bodyweight',
      }),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// Phase I — Strength, weeks 4-6, up to 3 minutes rest
// ---------------------------------------------------------------------------

const P1_REST = 180;

const PHASE_ONE_DAY_1: Workout = {
  id: 'anabolic-p1-d1',
  name: 'Foundational Day 1',
  kind: 'fixed',
  blocks: [
    straight('p1-d1-b1', [
      pe('p1-d1-1', 'box-squat', 1, { type: 'fixed', min: 10 }, P1_REST, { note: 'Warm-up' }),
      pe('p1-d1-2', 'barbell-back-squat', 4, reps(1, 4), P1_REST, { note: '4-6 sets' }),
      pe('p1-d1-3', 'barbell-bench-press', 4, reps(1, 4), P1_REST, { note: '4-6 sets' }),
      pe('p1-d1-4', 'pull-up', 2, reps(1, 6), P1_REST, {
        weightMode: 'bodyweight-plus',
        note: 'Weighted',
      }),
      pe('p1-d1-5', 'barbell-shrug', 3, reps(3, 6), P1_REST),
      pe('p1-d1-6', 'barbell-curl', 2, reps(6, 8), P1_REST),
      pe('p1-d1-7', 'skull-crusher', 2, reps(6, 8), P1_REST),
      pe('p1-d1-8', 'decline-sit-up', 5, reps(8, 12), P1_REST, {
        weightMode: 'bodyweight-plus',
        note: 'Weighted',
      }),
      pe('p1-d1-9', 'standing-calf-raise', 5, reps(8, 20), P1_REST),
    ]),
  ],
};

const PHASE_ONE_DAY_2: Workout = {
  id: 'anabolic-p1-d2',
  name: 'Foundational Day 2',
  kind: 'fixed',
  blocks: [
    straight('p1-d2-b1', [
      pe('p1-d2-1', 'good-morning', 1, { type: 'fixed', min: 10 }, P1_REST, { note: 'Warm-up' }),
      pe('p1-d2-2', 'barbell-deadlift', 4, reps(1, 4), P1_REST, { note: '4-6 sets' }),
      pe('p1-d2-3', 'overhead-press', 4, reps(1, 4), P1_REST, { note: '4-6 sets, standing' }),
      pe('p1-d2-4', 'rear-lateral-raise', 2, reps(6, 8), P1_REST),
      pe('p1-d2-5', 'dumbbell-shrug', 2, reps(6, 8), P1_REST, { note: 'Standing' }),
      pe('p1-d2-6', 'hammer-curl', 2, reps(6, 8), P1_REST),
      pe('p1-d2-7', 'dumbbell-overhead-tricep-extension', 2, reps(6, 8), P1_REST),
      pe('p1-d2-8', 'hanging-leg-raise', 5, reps(8, 20), P1_REST, { weightMode: 'bodyweight' }),
      pe('p1-d2-9', 'seated-calf-raise', 3, reps(8, 20), P1_REST),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// Phase II — Muscle fibre, weeks 7-9, up to 1 minute rest
// ---------------------------------------------------------------------------

const P2_REST = 60;

const PHASE_TWO_DAY_1: Workout = {
  id: 'anabolic-p2-d1',
  name: 'Foundational Day 1',
  kind: 'fixed',
  blocks: [
    straight('p2-d1-b1', [
      pe('p2-d1-1', 'barbell-back-squat', 3, reps(8, 12), P2_REST),
      pe('p2-d1-2', 'incline-barbell-press', 3, reps(8, 12), P2_REST),
      pe('p2-d1-3', 'barbell-row', 3, reps(8, 12), P2_REST),
      pe('p2-d1-4', 'dumbbell-shrug', 3, reps(8, 12), P2_REST, { note: 'Standing' }),
      pe('p2-d1-5', 'rear-lateral-raise', 2, reps(8, 12), P2_REST),
      pe('p2-d1-6', 'lateral-raise', 2, reps(8, 12), P2_REST),
      pe('p2-d1-7', 'supinating-dumbbell-curl', 3, reps(8, 12), P2_REST),
      pe('p2-d1-8', 'dip', 3, reps(8, 12), P2_REST, {
        weightMode: 'bodyweight-plus',
        note: 'Weighted',
      }),
      pe('p2-d1-9', 'seated-calf-raise', 3, reps(8, 12), P2_REST),
      pe('p2-d1-10', 'hanging-leg-raise', 3, reps(8, 20), P2_REST, { weightMode: 'bodyweight' }),
    ]),
  ],
};

const PHASE_TWO_DAY_2: Workout = {
  id: 'anabolic-p2-d2',
  name: 'Foundational Day 2',
  kind: 'fixed',
  blocks: [
    straight('p2-d2-b1', [
      pe('p2-d2-1', 'barbell-deadlift', 3, reps(4, 8), P2_REST),
      pe('p2-d2-2', 'leg-curl', 1, reps(8, 12), P2_REST, { note: 'Lying' }),
      pe('p2-d2-3', 'barbell-shrug', 3, reps(8, 12), P2_REST),
      pe('p2-d2-4', 'dumbbell-bench-press', 3, reps(8, 12), P2_REST, { note: 'Flat' }),
      pe('p2-d2-5', 'dumbbell-pullover', 1, reps(8, 12), P2_REST),
      pe('p2-d2-6', 'chin-up', 2, reps(6, 12), P2_REST, { weightMode: 'bodyweight' }),
      pe('p2-d2-7', 'dumbbell-shoulder-press', 3, reps(8, 12), P2_REST),
      pe('p2-d2-8', 'barbell-curl', 3, reps(8, 12), P2_REST),
      pe('p2-d2-9', 'triceps-pushdown', 3, reps(8, 12), P2_REST),
      pe('p2-d2-10', 'standing-calf-raise', 3, reps(8, 12), P2_REST),
      pe('p2-d2-11', 'decline-sit-up', 3, reps(30, 100), P2_REST, { weightMode: 'bodyweight' }),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// Phase III — Muscle pump, weeks 10-12, no more than 30 seconds rest
// ---------------------------------------------------------------------------

const P3_REST = 30;

const PHASE_THREE_DAY_1: Workout = {
  id: 'anabolic-p3-d1',
  name: 'Foundational Day 1',
  kind: 'fixed',
  blocks: [
    straight('p3-d1-b1', [
      pe('p3-d1-1', 'barbell-back-squat', 3, reps(8, 15), P3_REST),
      pe('p3-d1-2', 'sissy-squat', 2, reps(12, 15), P3_REST, { weightMode: 'bodyweight' }),
      pe('p3-d1-3', 'incline-barbell-press', 2, reps(12, 15), P3_REST),
      pe('p3-d1-4', 'cable-crossover', 2, reps(12, 15), P3_REST),
      pe('p3-d1-5', 'dumbbell-row', 2, reps(8, 12), P3_REST),
      pe('p3-d1-6', 'dumbbell-pullover', 2, reps(12, 15), P3_REST),
      pe('p3-d1-7', 'dumbbell-shrug', 5, reps(12, 15), P3_REST, { note: 'Seated' }),
      pe('p3-d1-8', 'rear-cable-fly', 2, reps(12, 15), P3_REST),
      pe('p3-d1-9', 'barbell-upright-row', 2, reps(12, 15), P3_REST),
    ]),
    superset('p3-d1-s2', P3_REST, [
      pe('p3-d1-10', 'supinating-dumbbell-curl', 2, reps(12, 15), 0),
      pe('p3-d1-11', 'dumbbell-overhead-tricep-extension', 2, reps(12, 15), 0),
    ]),
    superset('p3-d1-s3', P3_REST, [
      pe('p3-d1-12', 'cable-hammer-curl', 2, reps(12, 15), 0),
      pe('p3-d1-13', 'triceps-pushdown', 2, reps(12, 15), 0, { note: 'Rope' }),
    ]),
    straight('p3-d1-b4', [
      pe('p3-d1-14', 'seated-calf-raise', 2, reps(12, 15), P3_REST),
      pe('p3-d1-15', 'standing-calf-raise', 2, reps(12, 15), P3_REST),
      pe('p3-d1-16', 'hanging-leg-raise', 5, reps(15, 20), P3_REST, { weightMode: 'bodyweight' }),
    ]),
  ],
};

const PHASE_THREE_DAY_2: Workout = {
  id: 'anabolic-p3-d2',
  name: 'Foundational Day 2',
  kind: 'fixed',
  blocks: [
    straight('p3-d2-b1', [
      pe('p3-d2-1', 'barbell-deadlift', 3, reps(6, 10), P3_REST, { note: 'Touch and go' }),
      pe('p3-d2-2', 'chin-up', 2, reps(12, 15), P3_REST, { weightMode: 'bodyweight' }),
      pe('p3-d2-3', 'barbell-shrug', 5, reps(12, 15), P3_REST),
      pe('p3-d2-4', 'dumbbell-bench-press', 2, reps(12, 15), P3_REST, { note: 'Flat' }),
      pe('p3-d2-5', 'incline-fly', 2, reps(12, 15), P3_REST),
      pe('p3-d2-6', 'arnold-press', 2, reps(12, 15), P3_REST),
      pe('p3-d2-7', 'lateral-raise', 2, reps(12, 15), P3_REST),
    ]),
    superset('p3-d2-s2', P3_REST, [
      pe('p3-d2-8', 'barbell-curl', 2, reps(12, 15), 0),
      pe('p3-d2-9', 'dip', 2, reps(12, 15), 0, { weightMode: 'bodyweight' }),
    ]),
    superset('p3-d2-s3', P3_REST, [
      pe('p3-d2-10', 'reverse-curl', 2, reps(12, 15), 0),
      pe('p3-d2-11', 'triceps-pushdown', 2, reps(12, 15), 0),
    ]),
    straight('p3-d2-b4', [
      pe('p3-d2-12', 'seated-calf-raise', 2, reps(12, 15), P3_REST),
      pe('p3-d2-13', 'standing-calf-raise', 2, reps(12, 15), P3_REST),
      pe('p3-d2-14', 'decline-sit-up', 5, reps(20, 50), P3_REST, { weightMode: 'bodyweight' }),
    ]),
  ],
};

const PHASE_THREE_DAY_3: Workout = {
  id: 'anabolic-p3-d3',
  name: 'Foundational Day 3',
  kind: 'fixed',
  blocks: [
    straight('p3-d3-b1', [
      pe('p3-d3-1', 'good-morning', 3, reps(12, 15), P3_REST),
      pe('p3-d3-2', 'seated-cable-row', 2, reps(12, 15), P3_REST),
      pe('p3-d3-3', 'lat-pulldown', 2, reps(12, 15), P3_REST),
      pe('p3-d3-4', 'dumbbell-shrug', 5, reps(12, 15), P3_REST, { note: 'Standing' }),
      pe('p3-d3-5', 'incline-barbell-press', 2, reps(12, 15), P3_REST),
      pe('p3-d3-6', 'cable-chest-press', 2, reps(15, 20), P3_REST),
      pe('p3-d3-7', 'behind-the-neck-press', 2, reps(12, 15), P3_REST),
      pe('p3-d3-8', 'rear-lateral-raise', 2, reps(12, 15), P3_REST),
    ]),
    superset('p3-d3-s2', P3_REST, [
      pe('p3-d3-9', 'hammer-curl', 2, reps(12, 15), 0),
      pe('p3-d3-10', 'dumbbell-skull-crusher', 2, reps(12, 15), 0),
    ]),
    superset('p3-d3-s3', P3_REST, [
      pe('p3-d3-11', 'barbell-curl', 2, reps(12, 15), 0),
      pe('p3-d3-12', 'bench-dip', 2, reps(12, 15), 0, { weightMode: 'bodyweight' }),
    ]),
    straight('p3-d3-b4', [
      pe('p3-d3-13', 'seated-calf-raise', 2, reps(12, 15), P3_REST),
      pe('p3-d3-14', 'standing-calf-raise', 2, reps(12, 15), P3_REST),
      pe('p3-d3-15', 'hanging-leg-raise', 5, reps(15, 20), P3_REST, { weightMode: 'bodyweight' }),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// Weeks. The calendar carries a trigger session on every non-foundational day.
// ---------------------------------------------------------------------------

const PRE_PHASE: Phase = {
  id: 'anabolic-pre-phase',
  name: 'Pre Phase',
  weeks: 3,
  objective: 'Build overall strength and muscle, and prepare for Phase I.',
  whatToExpect:
    'Better coordination, increased strength, correction of muscle imbalances and improvement in exercise form.',
  setRepSummary: '1 exercise per body part, 1-2 sets each, 12-20 reps',
  restSummary: '90 seconds between sets',
  workouts: (() => {
    const trigger = triggerSession('pre');
    return [PRE_PHASE_WORKOUT, trigger, trigger, PRE_PHASE_WORKOUT, trigger, trigger, trigger];
  })(),
};

const PHASE_ONE: Phase = {
  id: 'anabolic-phase-1',
  name: 'Phase I — Strength',
  weeks: 3,
  objective: 'To build maximum strength and power.',
  whatToExpect: 'Rapid and dramatic strength gains. Your muscle will begin to feel hard and dense.',
  setRepSummary: '2-5 sets, 1-4 reps per exercise',
  restSummary: 'Up to 3 minutes between sets',
  workouts: (() => {
    const trigger = triggerSession('p1');
    return [PHASE_ONE_DAY_1, trigger, trigger, PHASE_ONE_DAY_2, trigger, trigger, trigger];
  })(),
};

const PHASE_TWO: Phase = {
  id: 'anabolic-phase-2',
  name: 'Phase II — Muscle Fibre',
  weeks: 3,
  objective:
    'Focus more on the feel of the muscles being worked. Aim for perfect form and a good pump.',
  whatToExpect: 'Fuller and rounder muscles.',
  setRepSummary: '3 sets, 8-12 reps per exercise',
  restSummary: 'Up to 1 minute between sets',
  workouts: (() => {
    const trigger = triggerSession('p2');
    return [PHASE_TWO_DAY_1, trigger, trigger, PHASE_TWO_DAY_2, trigger, trigger, trigger];
  })(),
};

const PHASE_THREE: Phase = {
  id: 'anabolic-phase-3',
  name: 'Phase III — Muscle Pump',
  weeks: 3,
  objective: 'To maximize the muscle pump and to increase strength endurance.',
  whatToExpect: 'Maximum muscle pumps and full feeling muscles.',
  setRepSummary: '2 exercises per body part, 2-3 sets each, 12-15 reps',
  restSummary: 'No more than 30 seconds between sets',
  workouts: (() => {
    const trigger = triggerSession('p3');
    return [
      PHASE_THREE_DAY_1,
      trigger,
      PHASE_THREE_DAY_2,
      trigger,
      PHASE_THREE_DAY_3,
      trigger,
      trigger,
    ];
  })(),
};

export const MAPS_ANABOLIC: Program = {
  id: 'maps-anabolic',
  name: 'MAPS Anabolic',
  source: 'MAPS Anabolic Blueprints and Calendar (Mind Pump Media, LLC, 2018)',
  description:
    'Twelve weeks: a Pre Phase to lay the foundation, then strength, muscle fibre and pump. ' +
    'Two to three foundational workouts a week, with short Trigger Sessions — open slots you fill ' +
    'yourself — on every other day.',
  phases: [PRE_PHASE, PHASE_ONE, PHASE_TWO, PHASE_THREE],
  createdAt: 0,
  updatedAt: 0,
};
