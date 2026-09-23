import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROGRESSION,
  computeStreak,
  evaluateMovement,
  judgeSession,
  qualifyingThreshold,
  suggestIncrease,
  type SessionSets,
} from './progression';
import { DEFAULT_DUMBBELL_LADDER_LB } from './units';
import type {
  Exercise,
  LoggedSet,
  ProgramExercise,
  RepTarget,
  Settings,
} from '../types';

const settings: Settings = {
  units: 'lb',
  dumbbellLadder: DEFAULT_DUMBBELL_LADDER_LB,
  smallestIncrement: 2.5,
  defaultProgression: DEFAULT_PROGRESSION,
  restTimerSound: true,
  restTimerVibrate: true,
};

function exercise(over: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex',
    name: 'Test movement',
    muscleGroups: ['chest'],
    equipment: 'barbell',
    movementClass: 'compound-upper',
    cues: [],
    ...over,
  };
}

function programExercise(over: Partial<ProgramExercise> = {}): ProgramExercise {
  return {
    id: 'pe',
    exerciseId: 'ex',
    sets: 3,
    reps: { type: 'range', min: 8, max: 12 },
    restSeconds: 60,
    weightMode: 'external',
    ...over,
  };
}

/** A session of `reps` at `weight`, one entry per set. */
function session(
  id: string,
  day: number,
  weight: number | undefined,
  reps: number[],
  opts: { goodForm?: boolean[]; holdSeconds?: number[] } = {},
): SessionSets {
  const sets: LoggedSet[] = reps.map((r, i) => ({
    id: `${id}-${i}`,
    sessionId: id,
    exerciseId: 'ex',
    setNumber: i + 1,
    weight,
    reps: opts.holdSeconds ? undefined : r,
    holdSeconds: opts.holdSeconds?.[i],
    goodForm: opts.goodForm?.[i] ?? true,
    timestamp: day * 86_400_000,
  }));
  return {
    sessionId: id,
    completedAt: day * 86_400_000,
    date: `2026-09-${String(day).padStart(2, '0')}`,
    sets,
  };
}

describe('qualifying threshold', () => {
  it('uses the top of a rep range (double progression)', () => {
    const t = qualifyingThreshold({ type: 'range', min: 8, max: 12 }, DEFAULT_PROGRESSION);
    expect(t).toMatchObject({ value: 12, unit: 'reps' });
  });

  it('adds the 2-for-2 bonus to a fixed rep goal', () => {
    const t = qualifyingThreshold({ type: 'fixed', min: 10 }, DEFAULT_PROGRESSION);
    expect(t).toMatchObject({ value: 12, unit: 'reps' });
  });

  it('measures a timed hold in seconds', () => {
    const t = qualifyingThreshold({ type: 'timed', seconds: 60 }, DEFAULT_PROGRESSION);
    expect(t).toMatchObject({ value: 60, unit: 'seconds' });
  });

  it('refuses to judge a bare AMRAP or a to-failure set', () => {
    expect(qualifyingThreshold({ type: 'amrap' }, DEFAULT_PROGRESSION)).toBeNull();
    expect(qualifyingThreshold({ type: 'failure' }, DEFAULT_PROGRESSION)).toBeNull();
  });

  it('honours an explicit two-for-two mode on a range', () => {
    const t = qualifyingThreshold(
      { type: 'range', min: 8, max: 12 },
      { ...DEFAULT_PROGRESSION, mode: 'two-for-two' },
    );
    expect(t?.value).toBe(14);
  });
});

describe('judging one session', () => {
  const target: RepTarget = { type: 'range', min: 8, max: 12 };

  it('qualifies when every working set reaches the top', () => {
    const v = judgeSession(session('a', 1, 100, [12, 12, 12]), target, 3, DEFAULT_PROGRESSION);
    expect(v.qualifies).toBe(true);
    expect(v.setsAtThreshold).toBe(3);
    expect(v.weight).toBe(100);
  });

  it('falls short when one set misses', () => {
    const v = judgeSession(session('a', 1, 100, [12, 12, 11]), target, 3, DEFAULT_PROGRESSION);
    expect(v.qualifies).toBe(false);
    expect(v.setsAtThreshold).toBe(2);
  });

  it('does not count a set the user flagged as ragged', () => {
    const v = judgeSession(
      session('a', 1, 100, [12, 12, 12], { goodForm: [true, true, false] }),
      target,
      3,
      DEFAULT_PROGRESSION,
    );
    expect(v.qualifies).toBe(false);
  });

  it('respects a lower required-set count', () => {
    const v = judgeSession(session('a', 1, 100, [12, 12, 8]), target, 3, {
      ...DEFAULT_PROGRESSION,
      requiredSets: 2,
    });
    expect(v.qualifies).toBe(true);
  });

  it('takes the lowest working set as the session weight', () => {
    const sets = session('a', 1, 100, [12, 12, 12]);
    sets.sets[2].weight = 90;
    const v = judgeSession(sets, target, 3, DEFAULT_PROGRESSION);
    expect(v.weight).toBe(90);
  });

  it('judges a timed hold against its seconds', () => {
    const s = session('a', 1, undefined, [0], { holdSeconds: [60] });
    const v = judgeSession(s, { type: 'timed', seconds: 60 }, 1, DEFAULT_PROGRESSION);
    expect(v.qualifies).toBe(true);
  });
});

describe('the streak', () => {
  const target: RepTarget = { type: 'range', min: 8, max: 12 };

  it('counts consecutive qualifying sessions at one weight', () => {
    const r = computeStreak(
      [session('a', 1, 100, [12, 12, 12]), session('b', 3, 100, [12, 12, 12])],
      target,
      3,
      DEFAULT_PROGRESSION,
    );
    expect(r.streak).toBe(2);
    expect(r.weight).toBe(100);
  });

  it('breaks on a session that falls short', () => {
    const r = computeStreak(
      [
        session('a', 1, 100, [12, 12, 12]),
        session('b', 3, 100, [12, 11, 12]),
        session('c', 5, 100, [12, 12, 12]),
      ],
      target,
      3,
      DEFAULT_PROGRESSION,
    );
    expect(r.streak).toBe(1);
  });

  it('restarts at a new weight, so a jump resets the count', () => {
    const r = computeStreak(
      [
        session('a', 1, 100, [12, 12, 12]),
        session('b', 3, 100, [12, 12, 12]),
        session('c', 5, 105, [12, 12, 12]),
      ],
      target,
      3,
      DEFAULT_PROGRESSION,
    );
    expect(r.streak).toBe(1);
    expect(r.weight).toBe(105);
    expect(r.justIncreased).toBe(true);
  });

  it('reads sessions oldest-first regardless of the order handed in', () => {
    const later = session('b', 3, 100, [12, 12, 12]);
    const earlier = session('a', 1, 100, [8, 8, 8]);
    const r = computeStreak([later, earlier], target, 3, DEFAULT_PROGRESSION);
    expect(r.streak).toBe(1);
    expect(r.verdicts.map((v) => v.sessionId)).toEqual(['a', 'b']);
  });
});

describe('the suggested jump', () => {
  it('moves a dumbbell movement to the next size on the rack', () => {
    const r = suggestIncrease(
      exercise({ equipment: 'dumbbell', movementClass: 'isolation' }),
      programExercise(),
      10,
      settings,
    );
    expect(r.kind).toBe('next-dumbbell');
    expect(r.suggestedWeight).toBe(12);
  });

  it('stops at the top of the rack instead of inventing a size', () => {
    const r = suggestIncrease(
      exercise({ equipment: 'dumbbell' }),
      programExercise(),
      120,
      settings,
    );
    expect(r.kind).toBe('add-reps');
    expect(r.suggestedWeight).toBeUndefined();
  });

  it('gives a compound movement the 5-10 lb band', () => {
    const squat = exercise({ movementClass: 'compound-lower' });
    expect(suggestIncrease(squat, programExercise(), 135, settings).suggestedWeight).toBe(140);
    expect(suggestIncrease(squat, programExercise(), 225, settings).suggestedWeight).toBe(235);
  });

  it('gives an isolation movement the 2.5-5 lb band', () => {
    const curl = exercise({ movementClass: 'isolation', equipment: 'barbell' });
    expect(suggestIncrease(curl, programExercise(), 30, settings).suggestedWeight).toBe(32.5);
    expect(suggestIncrease(curl, programExercise(), 80, settings).suggestedWeight).toBe(85);
  });

  it('never suggests more than the top of the band', () => {
    const squat = exercise({ movementClass: 'compound-lower' });
    const r = suggestIncrease(squat, programExercise(), 500, settings);
    expect(r.suggestedWeight! - 500).toBeLessThanOrEqual(10);
  });

  it('sends a bodyweight movement to a harder variation', () => {
    const pushup = exercise({
      equipment: 'bodyweight',
      movementClass: 'compound-upper',
      progressionVariants: ['Feet-elevated push-up', 'Archer push-up'],
    });
    const r = suggestIncrease(
      pushup,
      programExercise({ weightMode: 'bodyweight' }),
      undefined,
      settings,
    );
    expect(r.kind).toBe('harder-variant');
    expect(r.headline).toContain('Feet-elevated push-up');
  });
});

describe('evaluating a movement end to end', () => {
  const ex = exercise({ movementClass: 'compound-lower' });
  const pe = programExercise();

  it('flags ready after two qualifying sessions', () => {
    const result = evaluateMovement({
      exercise: ex,
      programExercise: pe,
      sessions: [session('a', 1, 135, [12, 12, 12]), session('b', 3, 135, [12, 12, 12])],
      settings,
    });
    expect(result.status).toBe('ready');
    expect(result.streak).toBe(2);
    expect(result.recommendation?.suggestedWeight).toBe(140);
  });

  it('is still building after one', () => {
    const result = evaluateMovement({
      exercise: ex,
      programExercise: pe,
      sessions: [session('a', 1, 135, [12, 12, 12])],
      settings,
    });
    expect(result.status).toBe('building');
    expect(result.summary).toContain('1 more');
  });

  it('treats the post-jump rep drop as settling, not a regression', () => {
    const result = evaluateMovement({
      exercise: ex,
      programExercise: pe,
      sessions: [
        session('a', 1, 135, [12, 12, 12]),
        session('b', 3, 135, [12, 12, 12]),
        session('c', 5, 140, [9, 8, 8]),
      ],
      settings,
    });
    expect(result.status).toBe('settling');
    expect(result.streak).toBe(0);
  });

  it('holds the flag when the user asked to delay', () => {
    const sessions = [session('a', 1, 135, [12, 12, 12]), session('b', 3, 135, [12, 12, 12])];
    const result = evaluateMovement({
      exercise: ex,
      programExercise: pe,
      sessions,
      settings,
      state: { exerciseId: 'ex', deferredAfterSessionId: 'b' },
    });
    expect(result.status).toBe('deferred');
    expect(result.recommendation).toBeDefined();
  });

  it('stops re-flagging a jump that was accepted but not yet logged', () => {
    const sessions = [session('a', 1, 135, [12, 12, 12]), session('b', 3, 135, [12, 12, 12])];
    const result = evaluateMovement({
      exercise: ex,
      programExercise: pe,
      sessions,
      settings,
      state: { exerciseId: 'ex', acceptedAfterSessionId: 'b', workingWeight: 140 },
    });
    expect(result.status).toBe('accepted');
    expect(result.summary).toContain('140');
  });

  it('flags again once the heavier weight has been earned in turn', () => {
    const sessions = [
      session('a', 1, 135, [12, 12, 12]),
      session('b', 3, 135, [12, 12, 12]),
      session('c', 5, 140, [12, 12, 12]),
      session('d', 7, 140, [12, 12, 12]),
    ];
    const result = evaluateMovement({
      exercise: ex,
      programExercise: pe,
      sessions,
      settings,
      state: { exerciseId: 'ex', acceptedAfterSessionId: 'b', workingWeight: 140 },
    });
    expect(result.status).toBe('ready');
    expect(result.recommendation?.suggestedWeight).toBe(145);
  });

  it('clears the deferral once a newer qualifying session lands', () => {
    const sessions = [
      session('a', 1, 135, [12, 12, 12]),
      session('b', 3, 135, [12, 12, 12]),
      session('c', 5, 135, [12, 12, 12]),
    ];
    const result = evaluateMovement({
      exercise: ex,
      programExercise: pe,
      sessions,
      settings,
      state: { exerciseId: 'ex', deferredAfterSessionId: 'b' },
    });
    expect(result.status).toBe('ready');
  });

  it('says so plainly when there is nothing to judge', () => {
    expect(
      evaluateMovement({ exercise: ex, programExercise: pe, sessions: [], settings }).status,
    ).toBe('no-data');

    expect(
      evaluateMovement({
        exercise: ex,
        programExercise: programExercise({ reps: { type: 'failure' } }),
        sessions: [session('a', 1, 135, [15])],
        settings,
      }).status,
    ).toBe('not-tracked');
  });

  it('lets a per-movement override lengthen the required streak', () => {
    const result = evaluateMovement({
      exercise: ex,
      programExercise: programExercise({ progression: { requiredStreak: 3 } }),
      sessions: [session('a', 1, 135, [12, 12, 12]), session('b', 3, 135, [12, 12, 12])],
      settings,
    });
    expect(result.status).toBe('building');
    expect(result.requiredStreak).toBe(3);
  });
});
