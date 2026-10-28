import { describe, expect, it } from 'vitest';
import { SEED_EXERCISES } from '../data/exercises';
import { WFH_INTERVAL } from '../data/wfhInterval';
import { DEFAULT_PROGRESSION } from '../lib/progression';
import { DEFAULT_DUMBBELL_LADDER_LB } from '../lib/units';
import type { Exercise, LoggedSet, ScheduledSession, Settings } from '../types';
import { movementProgress } from './selectors';

const settings: Settings = {
  units: 'lb',
  dumbbellLadder: DEFAULT_DUMBBELL_LADDER_LB,
  smallestIncrement: 2.5,
  defaultProgression: DEFAULT_PROGRESSION,
  restTimerSound: true,
  restTimerVibrate: true,
};

const [phase] = WFH_INTERVAL.phases;
const monday = phase.workouts[0];

function session(id: string, date: string, completedAt: number): ScheduledSession {
  return {
    id,
    date,
    scheduleId: 's',
    programId: WFH_INTERVAL.id,
    phaseId: phase.id,
    workoutId: monday.id,
    weekType: 'normal',
    status: 'done',
    phaseWeek: 1,
    completedAt,
  };
}

/** Monday's two shoulder-press sets — the 6:30 and the 11:30. */
function pressSets(sessionId: string, at: number, reps: [number, number]): LoggedSet[] {
  return [
    { peId: 'wfh-mon-1', reps: reps[0] },
    { peId: 'wfh-mon-5', reps: reps[1] },
  ].map((s, i) => ({
    id: `${sessionId}-${i}`,
    sessionId,
    exerciseId: 'dumbbell-shoulder-press',
    programExerciseId: s.peId,
    setNumber: 1,
    weight: 30,
    reps: s.reps,
    goodForm: true,
    timestamp: at + i,
  }));
}

function store(sets: LoggedSet[], sessions: ScheduledSession[]) {
  return {
    sets,
    sessions,
    exercises: SEED_EXERCISES as Exercise[],
    programs: [WFH_INTERVAL],
    progression: [],
    settings,
  };
}

describe('a movement done twice in one day', () => {
  const sessions = [session('a', '2026-11-02', 1000), session('b', '2026-11-09', 2000)];

  it('counts the day only when both sets reach the top of the range', () => {
    const sets = [...pressSets('a', 1000, [15, 12]), ...pressSets('b', 2000, [15, 13])];
    const context = movementProgress(store(sets, sessions), 'dumbbell-shoulder-press');
    expect(context?.progress.verdicts.map((v) => v.qualifies)).toEqual([false, false]);
    expect(context?.progress.status).not.toBe('ready');
  });

  it('flags the jump after two days with both sets at the top', () => {
    const sets = [...pressSets('a', 1000, [15, 15]), ...pressSets('b', 2000, [15, 15])];
    const context = movementProgress(store(sets, sessions), 'dumbbell-shoulder-press');
    expect(context?.progress.verdicts.map((v) => v.qualifies)).toEqual([true, true]);
    expect(context?.progress.status).toBe('ready');
  });
});
