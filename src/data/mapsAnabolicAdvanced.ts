import type { Block, Phase, Program, ProgramExercise, RepTarget, Workout } from '../types';

/**
 * MAPS Anabolic Advanced, transcribed from the blueprint workout calendar
 * (MAPS Fitness Products LLC, 2023).
 *
 * This is the program the week-type model exists for. Each phase runs four
 * weeks plus a deload week, and the weeks alternate:
 *
 *   week 1  normal   workouts #1-#3, three sets short of failure
 *   week 2  failure  workouts #4-#6, one set taken to complete failure
 *   week 3  normal
 *   week 4  failure
 *   week 5  deload   a reduced routine, taken only if the quiz says to
 *
 * The same workouts run twice inside a week (the calendar is #1 #2 #3 #1 #2 #3,
 * rest), so each one appears twice in the week's order and shares one
 * prescription — a movement trained twice a week builds one streak, not two.
 *
 * Structure only — sets, reps, rest and movement names.
 */

function reps(min: number, max: number): RepTarget {
  return { type: 'range', min, max };
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
    id: `anabolicadv-${key}`,
    exerciseId,
    sets,
    reps: target,
    restSeconds,
    weightMode: 'external',
    ...over,
  };
}

function straight(key: string, exercises: ProgramExercise[]): Block {
  return { id: `anabolicadv-${key}`, kind: 'straight', exercises };
}

/** A static stretch held for time, no load. */
function stretch(
  key: string,
  exerciseId: string,
  seconds: number,
  perSide: boolean,
  rest: number,
): ProgramExercise {
  return {
    id: `anabolicadv-${key}`,
    exerciseId,
    sets: 1,
    reps: { type: 'timed', seconds, perSide: perSide || undefined },
    restSeconds: rest,
    weightMode: 'bodyweight',
  };
}

/** The four mobility drills that close every Workout #3 and #6. */
function mobility(key: string, rest: number): ProgramExercise[] {
  const note = '5 second holds';
  const hold = (n: number, exerciseId: string, extra?: string): ProgramExercise => ({
    id: `anabolicadv-${key}-${n}`,
    exerciseId,
    sets: 1,
    reps: { type: 'fixed', min: 5, perSide: true },
    restSeconds: rest,
    weightMode: 'bodyweight',
    note: extra ? `${note} · ${extra}` : note,
  });
  return [
    hold(1, 'ninety-ninety', 'Prime Pro webinar reference'),
    hold(2, 'handcuff-with-rotation', 'Intensify at end range'),
    hold(3, 'lizard-with-rotation'),
    hold(4, 'combat-stretch'),
  ];
}

// ---------------------------------------------------------------------------
// Phase I — weeks 1 & 3 normal, 2 & 4 failure. 1 minute rest.
// ---------------------------------------------------------------------------

const P1_REST = 60;
const NORMAL_NOTE = 'Stop 2 reps short of failure. Focus on pump and squeeze.';
const FAILURE_NOTE = '1 set to complete failure';

const P1_W1: Workout = {
  id: 'anabolicadv-p1-w1',
  name: 'Workout #1 — Upper',
  kind: 'fixed',
  weekTypes: ['normal'],
  notes: `3 exercises per body part. ${NORMAL_NOTE}`,
  blocks: [
    straight('p1-w1-b1', [
      pe('p1-w1-1', 'barbell-bench-press', 3, reps(6, 8), P1_REST),
      pe('p1-w1-2', 'incline-barbell-press', 3, reps(6, 8), P1_REST),
      pe('p1-w1-3', 'chest-fly', 3, reps(6, 8), P1_REST, { optional: true }),
      pe('p1-w1-4', 'barbell-row', 3, reps(6, 8), P1_REST),
      pe('p1-w1-5', 'pull-up', 3, reps(6, 8), P1_REST, { weightMode: 'bodyweight-plus' }),
      pe('p1-w1-6', 'dumbbell-pullover', 3, reps(6, 8), P1_REST, { optional: true }),
      pe('p1-w1-7', 'overhead-press', 3, reps(6, 8), P1_REST),
      pe('p1-w1-8', 'lateral-raise', 3, reps(6, 8), P1_REST),
      pe('p1-w1-9', 'rear-lateral-raise', 3, reps(6, 8), P1_REST, { optional: true }),
      pe('p1-w1-10', 'preacher-curl', 3, reps(6, 8), P1_REST),
      pe('p1-w1-11', 'hammer-curl', 3, reps(6, 8), P1_REST, { optional: true }),
      pe('p1-w1-12', 'dumbbell-overhead-tricep-extension', 3, reps(6, 8), P1_REST),
      pe('p1-w1-13', 'triceps-pushdown', 3, reps(6, 8), P1_REST, { optional: true }),
    ]),
  ],
};

const P1_W2: Workout = {
  id: 'anabolicadv-p1-w2',
  name: 'Workout #2 — Lower',
  kind: 'fixed',
  weekTypes: ['normal'],
  notes: NORMAL_NOTE,
  blocks: [
    straight('p1-w2-b1', [
      pe('p1-w2-1', 'barbell-deadlift', 3, reps(6, 8), P1_REST),
      pe('p1-w2-2', 'walking-lunge', 3, reps(6, 8), P1_REST),
      pe('p1-w2-3', 'hip-thrust', 3, reps(6, 8), P1_REST),
      pe('p1-w2-4', 'standing-calf-raise', 3, reps(6, 8), P1_REST),
      pe('p1-w2-5', 'seated-calf-raise', 3, reps(6, 8), P1_REST),
    ]),
  ],
};

const P1_W3: Workout = {
  id: 'anabolicadv-p1-w3',
  name: 'Workout #3 — Core & mobility',
  kind: 'fixed',
  weekTypes: ['normal'],
  blocks: [
    straight('p1-w3-b1', [
      pe('p1-w3-1', 'lying-leg-raise', 3, reps(6, 8), P1_REST, { weightMode: 'bodyweight' }),
      pe('p1-w3-2', 'cable-chop', 3, reps(6, 8), P1_REST),
      ...mobility('p1-w3-m', P1_REST),
    ]),
  ],
};

const P1_W4: Workout = {
  id: 'anabolicadv-p1-w4',
  name: 'Workout #4 — Upper (failure)',
  kind: 'fixed',
  weekTypes: ['failure'],
  notes: `1-2 warm up sets per body part. ${FAILURE_NOTE}. 60 second static stretch.`,
  blocks: [
    straight('p1-w4-b1', [
      pe('p1-w4-1', 'dumbbell-bench-press', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      pe('p1-w4-2', 'incline-dumbbell-press', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      pe('p1-w4-3', 'chest-fly', 1, reps(10, 12), P1_REST, { optional: true, note: FAILURE_NOTE }),
      stretch('p1-w4-4', 'fly-stretch', 60, false, P1_REST),
      pe('p1-w4-5', 'single-arm-dumbbell-row', 1, reps(10, 12), P1_REST, {
        note: `Chest supported. ${FAILURE_NOTE}`,
      }),
      pe('p1-w4-6', 'assisted-pull-up', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      pe('p1-w4-7', 'dumbbell-pullover', 1, reps(10, 12), P1_REST, {
        optional: true,
        note: FAILURE_NOTE,
      }),
      stretch('p1-w4-8', 'hang-stretch', 60, false, P1_REST),
      pe('p1-w4-9', 'dumbbell-shoulder-press', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      pe('p1-w4-10', 'lateral-raise', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      pe('p1-w4-11', 'chest-down-fly', 1, reps(10, 12), P1_REST, {
        optional: true,
        note: FAILURE_NOTE,
      }),
      pe('p1-w4-12', 'barbell-curl', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      stretch('p1-w4-13', 'incline-stretch', 60, false, P1_REST),
      pe('p1-w4-14', 'dip', 1, reps(10, 12), P1_REST, {
        weightMode: 'bodyweight-plus',
        note: FAILURE_NOTE,
      }),
      stretch('p1-w4-15', 'overhead-tricep-stretch', 60, true, P1_REST),
    ]),
  ],
};

const P1_W5: Workout = {
  id: 'anabolicadv-p1-w5',
  name: 'Workout #5 — Lower (failure)',
  kind: 'fixed',
  weekTypes: ['failure'],
  notes: `1-2 warm up sets per body part. ${FAILURE_NOTE}. 60 second static stretch.`,
  blocks: [
    straight('p1-w5-b1', [
      pe('p1-w5-1', 'barbell-back-squat', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      stretch('p1-w5-2', 'kneeling-stretch', 60, true, P1_REST),
      pe('p1-w5-3', 'hip-thrust', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      stretch('p1-w5-4', 'pigeon-stretch', 60, true, P1_REST),
      pe('p1-w5-5', 'barbell-romanian-deadlift', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      stretch('p1-w5-6', 'pancake-stretch', 60, false, P1_REST),
      pe('p1-w5-7', 'standing-calf-raise', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      pe('p1-w5-8', 'seated-calf-raise', 1, reps(10, 12), P1_REST, { note: FAILURE_NOTE }),
      stretch('p1-w5-9', 'calf-stretch', 60, true, P1_REST),
    ]),
  ],
};

const P1_W6: Workout = {
  id: 'anabolicadv-p1-w6',
  name: 'Workout #6 — Core & mobility (failure)',
  kind: 'fixed',
  weekTypes: ['failure'],
  blocks: [
    straight('p1-w6-b1', [
      pe('p1-w6-1', 'long-lever-sit-up', 1, reps(10, 12), P1_REST, {
        weightMode: 'bodyweight',
        note: FAILURE_NOTE,
      }),
      pe('p1-w6-2', 'twisting-stability-ball-crunch', 1, reps(10, 12), P1_REST, {
        weightMode: 'bodyweight',
        note: FAILURE_NOTE,
      }),
      ...mobility('p1-w6-m', P1_REST),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// Phase II — weeks 5 & 7 normal, 6 & 8 failure. 1-3 minutes rest.
// ---------------------------------------------------------------------------

const P2_REST = 120;

const P2_W1: Workout = {
  id: 'anabolicadv-p2-w1',
  name: 'Workout #1 — Upper',
  kind: 'fixed',
  weekTypes: ['normal'],
  notes: `3 exercises per body part. ${NORMAL_NOTE}`,
  blocks: [
    straight('p2-w1-b1', [
      pe('p2-w1-1', 'guillotine-press', 3, reps(8, 10), P2_REST),
      pe('p2-w1-2', 'incline-dumbbell-press', 3, reps(8, 10), P2_REST),
      pe('p2-w1-3', 'incline-fly', 3, reps(8, 10), P2_REST, { optional: true }),
      pe('p2-w1-4', 'single-arm-dumbbell-row', 3, reps(8, 10), P2_REST, { note: 'Chest supported' }),
      pe('p2-w1-5', 'chin-up', 3, reps(8, 10), P2_REST, {
        weightMode: 'bodyweight',
        note: 'Supinated grip',
      }),
      pe('p2-w1-6', 'dumbbell-pullover', 3, reps(8, 10), P2_REST, { optional: true }),
      pe('p2-w1-7', 'z-press', 3, reps(8, 10), P2_REST),
      pe('p2-w1-8', 'lateral-raise', 3, reps(8, 10), P2_REST),
      pe('p2-w1-9', 'rear-lateral-raise', 3, reps(8, 10), P2_REST, { optional: true }),
      pe('p2-w1-10', 'dumbbell-curl', 3, reps(8, 10), P2_REST),
      pe('p2-w1-11', 'hammer-curl', 3, reps(8, 10), P2_REST, { optional: true }),
      pe('p2-w1-12', 'dumbbell-skull-crusher', 3, reps(8, 10), P2_REST),
      pe('p2-w1-13', 'triceps-pushdown', 3, reps(8, 10), P2_REST, { optional: true }),
    ]),
  ],
};

const P2_W2: Workout = {
  id: 'anabolicadv-p2-w2',
  name: 'Workout #2 — Lower',
  kind: 'fixed',
  weekTypes: ['normal'],
  notes: NORMAL_NOTE,
  blocks: [
    straight('p2-w2-b1', [
      pe('p2-w2-1', 'barbell-deadlift', 3, reps(8, 10), P2_REST),
      pe('p2-w2-2', 'bulgarian-split-squat', 3, reps(8, 10), P2_REST),
      pe('p2-w2-3', 'heels-elevated-goblet-squat', 3, reps(8, 10), P2_REST),
      pe('p2-w2-4', 'standing-calf-raise', 3, reps(8, 10), P2_REST),
      pe('p2-w2-5', 'seated-calf-raise', 3, reps(8, 10), P2_REST),
    ]),
  ],
};

const P2_W3: Workout = {
  id: 'anabolicadv-p2-w3',
  name: 'Workout #3 — Core & mobility',
  kind: 'fixed',
  weekTypes: ['normal'],
  blocks: [
    straight('p2-w3-b1', [
      pe('p2-w3-1', 'reverse-crunch', 3, reps(8, 10), P2_REST, { weightMode: 'bodyweight' }),
      pe('p2-w3-2', 'cable-chop', 3, reps(8, 10), P2_REST),
      ...mobility('p2-w3-m', P2_REST),
    ]),
  ],
};

const P2_W4: Workout = {
  id: 'anabolicadv-p2-w4',
  name: 'Workout #4 — Upper (failure)',
  kind: 'fixed',
  weekTypes: ['failure'],
  notes: `${FAILURE_NOTE}. Add 2 partial reps after failure. 90 second static stretch.`,
  blocks: [
    straight('p2-w4-b1', [
      pe('p2-w4-1', 'barbell-bench-press', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      pe('p2-w4-2', 'incline-barbell-press', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      pe('p2-w4-3', 'chest-fly', 1, reps(13, 15), P2_REST, { optional: true, note: FAILURE_NOTE }),
      stretch('p2-w4-4', 'fly-stretch', 90, false, P2_REST),
      pe('p2-w4-5', 'single-arm-dumbbell-row', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      pe('p2-w4-6', 'assisted-pull-up', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      pe('p2-w4-7', 'dumbbell-pullover', 1, reps(13, 15), P2_REST, {
        optional: true,
        note: FAILURE_NOTE,
      }),
      stretch('p2-w4-8', 'hang-stretch', 90, false, P2_REST),
      pe('p2-w4-9', 'barbell-upright-row', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      pe('p2-w4-10', 'lateral-raise', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      pe('p2-w4-11', 'chest-down-fly', 1, reps(13, 15), P2_REST, {
        optional: true,
        note: FAILURE_NOTE,
      }),
      pe('p2-w4-12', 'barbell-curl', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      stretch('p2-w4-13', 'incline-stretch', 90, false, P2_REST),
      pe('p2-w4-14', 'dip', 1, reps(13, 15), P2_REST, {
        weightMode: 'bodyweight-plus',
        note: FAILURE_NOTE,
      }),
      stretch('p2-w4-15', 'overhead-tricep-stretch', 90, false, P2_REST),
    ]),
  ],
};

const P2_W5: Workout = {
  id: 'anabolicadv-p2-w5',
  name: 'Workout #5 — Lower (failure)',
  kind: 'fixed',
  weekTypes: ['failure'],
  notes: `${FAILURE_NOTE}. Add 2 partial reps after failure. 90 second static stretch.`,
  blocks: [
    straight('p2-w5-b1', [
      pe('p2-w5-1', 'barbell-back-squat', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      stretch('p2-w5-2', 'kneeling-stretch', 90, true, P2_REST),
      pe('p2-w5-3', 'hip-thrust', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      stretch('p2-w5-4', 'pigeon-stretch', 90, true, P2_REST),
      pe('p2-w5-5', 'barbell-romanian-deadlift', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      stretch('p2-w5-6', 'pancake-stretch', 90, false, P2_REST),
      pe('p2-w5-7', 'standing-calf-raise', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      pe('p2-w5-8', 'seated-calf-raise', 1, reps(13, 15), P2_REST, { note: FAILURE_NOTE }),
      stretch('p2-w5-9', 'calf-stretch', 90, false, P2_REST),
    ]),
  ],
};

const P2_W6: Workout = {
  id: 'anabolicadv-p2-w6',
  name: 'Workout #6 — Core & mobility (failure)',
  kind: 'fixed',
  weekTypes: ['failure'],
  blocks: [
    straight('p2-w6-b1', [
      pe('p2-w6-1', 'active-plank', 1, reps(13, 15), P2_REST, {
        weightMode: 'bodyweight',
        note: FAILURE_NOTE,
      }),
      pe('p2-w6-2', 'perfect-sit-up', 1, reps(13, 15), P2_REST, {
        weightMode: 'bodyweight',
        note: FAILURE_NOTE,
      }),
      ...mobility('p2-w6-m', P2_REST),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// Phase III — weeks 9 & 11 normal, 10 & 12 failure. 1-3 minutes rest.
// ---------------------------------------------------------------------------

const P3_REST = 120;
const P3_FAILURE_NOTE =
  '1 set to complete failure, then 2 partials, pause 10, 1 partial, pause 10, 1 partial';

const P3_W1: Workout = {
  id: 'anabolicadv-p3-w1',
  name: 'Workout #1 — Upper',
  kind: 'fixed',
  weekTypes: ['normal'],
  notes: `3 exercises per body part. ${NORMAL_NOTE}`,
  blocks: [
    straight('p3-w1-b1', [
      pe('p3-w1-1', 'incline-barbell-press', 3, reps(12, 15), P3_REST),
      pe('p3-w1-2', 'barbell-bench-press', 3, reps(12, 15), P3_REST),
      pe('p3-w1-3', 'incline-fly', 3, reps(12, 15), P3_REST, { optional: true }),
      pe('p3-w1-4', 'pendlay-row', 3, reps(12, 15), P3_REST),
      pe('p3-w1-5', 'pull-up', 3, reps(12, 15), P3_REST, {
        weightMode: 'bodyweight',
        note: 'Wide grip',
      }),
      pe('p3-w1-6', 'dumbbell-pullover', 3, reps(12, 15), P3_REST, { optional: true }),
      pe('p3-w1-7', 'behind-the-neck-press', 3, reps(12, 15), P3_REST, {
        note: 'Mobility permitting — otherwise Z press',
      }),
      pe('p3-w1-8', 'lateral-raise', 3, reps(12, 15), P3_REST),
      pe('p3-w1-9', 'rear-lateral-raise', 3, reps(12, 15), P3_REST, { optional: true }),
      pe('p3-w1-10', 'spider-curl', 3, reps(12, 15), P3_REST),
      pe('p3-w1-11', 'hammer-curl', 3, reps(12, 15), P3_REST, { optional: true }),
      pe('p3-w1-12', 'close-grip-bench-press', 3, reps(12, 15), P3_REST),
      pe('p3-w1-13', 'triceps-pushdown', 3, reps(12, 15), P3_REST, { optional: true }),
    ]),
  ],
};

const P3_W2: Workout = {
  id: 'anabolicadv-p3-w2',
  name: 'Workout #2 — Lower',
  kind: 'fixed',
  weekTypes: ['normal'],
  notes: NORMAL_NOTE,
  blocks: [
    straight('p3-w2-b1', [
      pe('p3-w2-1', 'snatch-grip-deadlift', 3, reps(12, 15), P3_REST),
      pe('p3-w2-2', 'front-squat', 3, reps(12, 15), P3_REST),
      pe('p3-w2-3', 'stability-ball-leg-curl', 3, reps(12, 15), P3_REST, {
        weightMode: 'bodyweight',
      }),
      pe('p3-w2-4', 'standing-calf-raise', 3, reps(12, 15), P3_REST),
      pe('p3-w2-5', 'seated-calf-raise', 3, reps(12, 15), P3_REST),
    ]),
  ],
};

const P3_W3: Workout = {
  id: 'anabolicadv-p3-w3',
  name: 'Workout #3 — Core & mobility',
  kind: 'fixed',
  weekTypes: ['normal'],
  blocks: [
    straight('p3-w3-b1', [
      pe('p3-w3-1', 'reverse-crunch', 3, reps(12, 15), P3_REST, { weightMode: 'bodyweight' }),
      pe('p3-w3-2', 'cable-chop', 3, reps(12, 15), P3_REST),
      ...mobility('p3-w3-m', P3_REST),
    ]),
  ],
};

const P3_W4: Workout = {
  id: 'anabolicadv-p3-w4',
  name: 'Workout #4 — Upper (failure)',
  kind: 'fixed',
  weekTypes: ['failure'],
  notes: `${P3_FAILURE_NOTE}. 120 second static stretch.`,
  blocks: [
    straight('p3-w4-b1', [
      pe('p3-w4-1', 'dumbbell-bench-press', 1, reps(16, 20), P3_REST, { note: P3_FAILURE_NOTE }),
      pe('p3-w4-2', 'incline-dumbbell-press', 1, reps(16, 20), P3_REST, { note: P3_FAILURE_NOTE }),
      pe('p3-w4-3', 'chest-fly', 1, reps(16, 20), P3_REST, {
        optional: true,
        note: P3_FAILURE_NOTE,
      }),
      stretch('p3-w4-4', 'fly-stretch', 120, false, P3_REST),
      pe('p3-w4-5', 'barbell-row', 1, reps(16, 20), P3_REST, { note: P3_FAILURE_NOTE }),
      pe('p3-w4-6', 'dumbbell-pullover', 1, reps(16, 20), P3_REST, { note: P3_FAILURE_NOTE }),
      pe('p3-w4-7', 'assisted-pull-up', 1, reps(16, 20), P3_REST, {
        optional: true,
        note: P3_FAILURE_NOTE,
      }),
      stretch('p3-w4-8', 'hang-stretch', 120, false, P3_REST),
      pe('p3-w4-9', 'barbell-push-press', 1, reps(16, 20), P3_REST, { note: P3_FAILURE_NOTE }),
      pe('p3-w4-10', 'chest-down-fly', 1, reps(16, 20), P3_REST, { note: P3_FAILURE_NOTE }),
      pe('p3-w4-11', 'dumbbell-upright-row', 1, reps(16, 20), P3_REST, {
        optional: true,
        note: P3_FAILURE_NOTE,
      }),
      pe('p3-w4-12', 'dumbbell-curl', 1, reps(16, 20), P3_REST, {
        note: `Seated. ${P3_FAILURE_NOTE}`,
      }),
      stretch('p3-w4-13', 'incline-stretch', 120, false, P3_REST),
      pe('p3-w4-14', 'dip', 1, reps(16, 20), P3_REST, {
        weightMode: 'bodyweight-plus',
        note: P3_FAILURE_NOTE,
      }),
      // The source table prints "1 x 16-20" against this stretch, which reads
      // like a typo — every other phase holds it for the phase's stretch time.
      stretch('p3-w4-15', 'overhead-tricep-stretch', 120, true, P3_REST),
    ]),
  ],
};

const P3_W5: Workout = {
  id: 'anabolicadv-p3-w5',
  name: 'Workout #5 — Lower (failure)',
  kind: 'fixed',
  weekTypes: ['failure'],
  notes: `${P3_FAILURE_NOTE}. 120 second static stretch.`,
  blocks: [
    straight('p3-w5-b1', [
      pe('p3-w5-1', 'front-squat', 1, reps(16, 20), P3_REST, { note: P3_FAILURE_NOTE }),
      pe('p3-w5-2', 'sissy-squat', 1, reps(16, 20), P3_REST, {
        weightMode: 'bodyweight',
        note: P3_FAILURE_NOTE,
      }),
      stretch('p3-w5-3', 'kneeling-stretch', 120, true, P3_REST),
      pe('p3-w5-4', 'hip-thrust', 1, reps(16, 20), P3_REST, { note: P3_FAILURE_NOTE }),
      stretch('p3-w5-5', 'pigeon-stretch', 120, true, P3_REST),
      pe('p3-w5-6', 'standing-calf-raise', 1, reps(16, 20), P3_REST, { note: P3_FAILURE_NOTE }),
      pe('p3-w5-7', 'seated-calf-raise', 1, reps(16, 20), P3_REST, { note: P3_FAILURE_NOTE }),
      stretch('p3-w5-8', 'calf-stretch', 120, false, P3_REST),
    ]),
  ],
};

const P3_W6: Workout = {
  id: 'anabolicadv-p3-w6',
  name: 'Workout #6 — Core & mobility (failure)',
  kind: 'fixed',
  weekTypes: ['failure'],
  blocks: [
    straight('p3-w6-b1', [
      pe('p3-w6-1', 'active-plank', 1, reps(16, 20), P3_REST, {
        weightMode: 'bodyweight',
        note: P3_FAILURE_NOTE,
      }),
      pe('p3-w6-2', 'perfect-sit-up', 1, reps(16, 20), P3_REST, {
        weightMode: 'bodyweight',
        note: P3_FAILURE_NOTE,
      }),
      ...mobility('p3-w6-m', P3_REST),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// The deload week, taken at the end of a phase if the quiz says to
// ---------------------------------------------------------------------------

const DELOAD_NOTE =
  'Deload: 50% of your usual load. Bodyweight work leaves 5 reps in the tank.';

function deloadLift(phaseKey: string): Workout {
  return {
    id: `anabolicadv-${phaseKey}-deload-lift`,
    name: 'Deload — full body',
    kind: 'fixed',
    weekTypes: ['deload'],
    notes: DELOAD_NOTE,
    blocks: [
      straight(`${phaseKey}-deload-b1`, [
        pe(`${phaseKey}-deload-1`, 'walking-lunge', 3, { type: 'fixed', min: 12 }, 90, {
          note: '50% intensity',
        }),
        pe(`${phaseKey}-deload-2`, 'push-up', 3, { type: 'fixed', min: 12 }, 90, {
          weightMode: 'bodyweight',
          note: '50% intensity',
        }),
        pe(`${phaseKey}-deload-3`, 'dumbbell-row', 3, { type: 'fixed', min: 12 }, 90, {
          note: '50% intensity',
        }),
        pe(`${phaseKey}-deload-4`, 'lateral-raise', 3, { type: 'fixed', min: 12 }, 90, {
          note: '50% intensity',
        }),
        pe(`${phaseKey}-deload-5`, 'crunch', 3, { type: 'fixed', min: 12 }, 90, {
          weightMode: 'bodyweight',
          note: '50% intensity',
        }),
      ]),
    ],
  };
}

function deloadActivity(phaseKey: string): Workout {
  return {
    id: `anabolicadv-${phaseKey}-deload-activity`,
    name: 'Deload — easy activity',
    kind: 'open',
    weekTypes: ['deload'],
    open: {
      focus: 'Something you enjoy',
      durationCapMinutes: 30,
      guidance: 'Walk, hike, swim, or anything else you enjoy. Thirty minutes, nothing hard.',
    },
    blocks: [],
  };
}

// ---------------------------------------------------------------------------

/**
 * A week runs its three workouts twice: #1 #2 #3 #1 #2 #3, then a rest day.
 * The deload week is two lifting days and two easy days.
 */
function phaseWorkouts(
  phaseKey: string,
  normal: [Workout, Workout, Workout],
  failure: [Workout, Workout, Workout],
): Workout[] {
  const lift = deloadLift(phaseKey);
  const activity = deloadActivity(phaseKey);
  return [
    ...normal,
    ...normal,
    ...failure,
    ...failure,
    lift,
    activity,
    lift,
    activity,
  ];
}

/** Four weeks alternating, then the deload. */
const WEEK_TYPES = ['normal', 'failure', 'normal', 'failure', 'deload'] as const;

const PHASE_ONE: Phase = {
  id: 'anabolicadv-phase-1',
  name: 'Phase I',
  weeks: 5,
  weekTypes: [...WEEK_TYPES],
  objective: 'To speed up metabolism and build muscle',
  whatToExpect: 'You will begin to feel stronger in your daily movements',
  setRepSummary: 'Normal weeks 3 sets x 6-8 · Failure weeks 1 set x 10-12',
  restSummary: '1 minute between sets',
  workouts: phaseWorkouts('p1', [P1_W1, P1_W2, P1_W3], [P1_W4, P1_W5, P1_W6]),
};

const PHASE_TWO: Phase = {
  id: 'anabolicadv-phase-2',
  name: 'Phase II',
  weeks: 5,
  weekTypes: [...WEEK_TYPES],
  objective: 'Increase workload and strength stamina',
  whatToExpect: 'You will notice an increase in muscle endurance and strength output',
  setRepSummary: 'Normal weeks 3 sets x 8-10 · Failure weeks 1 set x 13-15',
  restSummary: '1-3 minutes between sets',
  workouts: phaseWorkouts('p2', [P2_W1, P2_W2, P2_W3], [P2_W4, P2_W5, P2_W6]),
};

const PHASE_THREE: Phase = {
  id: 'anabolicadv-phase-3',
  name: 'Phase III',
  weeks: 5,
  weekTypes: [...WEEK_TYPES],
  objective: 'Sculpt and sharpen muscle definition',
  whatToExpect: 'You will notice an increase in stamina and strength mastery',
  setRepSummary: 'Normal weeks 3-5 sets x 12-15 · Failure weeks 1 set x 16-20',
  restSummary: '1-3 minutes between sets',
  workouts: phaseWorkouts('p3', [P3_W1, P3_W2, P3_W3], [P3_W4, P3_W5, P3_W6]),
};

export const MAPS_ANABOLIC_ADVANCED: Program = {
  id: 'maps-anabolic-advanced',
  name: 'MAPS Anabolic Advanced',
  source: 'MAPS Anabolic Advanced blueprint workout calendar (MAPS Fitness Products LLC, 2023)',
  description:
    'Three phases of four weeks plus a deload. Weeks alternate: a normal week of three sets stopping ' +
    'short of failure, then a failure week of one all-out set per movement with long static stretches. ' +
    'The deload week is optional — the source has a symptom quiz for deciding, and this app just ' +
    'schedules it so you can skip the days if you feel fine.',
  phases: [PHASE_ONE, PHASE_TWO, PHASE_THREE],
  createdAt: 0,
  updatedAt: 0,
};
