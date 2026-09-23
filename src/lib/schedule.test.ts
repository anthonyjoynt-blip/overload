import { describe, expect, it } from 'vitest';
import {
  generateSessions,
  isTrainingDay,
  planProgram,
  resolveWorkout,
  sessionsPerWeek,
  targetSetCount,
  weekTypeFor,
} from './schedule';
import { MAPS_15_MINUTES } from '../data/maps15';
import { addDays, weekday } from './dates';
import type { Program, Schedule } from '../types';

function schedule(over: Partial<Schedule> = {}): Schedule {
  return {
    id: 'sched',
    programId: MAPS_15_MINUTES.id,
    // A Monday.
    startDate: '2026-09-21',
    mode: 'weekdays',
    weekdays: [1, 2, 3, 4, 5, 6],
    includeOptional: false,
    active: true,
    createdAt: 0,
    ...over,
  };
}

describe('week types', () => {
  it('is normal when the phase does not say otherwise', () => {
    expect(weekTypeFor(undefined, 1)).toBe('normal');
  });

  it('cycles the declared sequence and lands the deload where it belongs', () => {
    const seq = ['normal', 'failure', 'normal', 'deload'] as const;
    expect([1, 2, 3, 4, 5].map((w) => weekTypeFor([...seq], w))).toEqual([
      'normal',
      'failure',
      'normal',
      'deload',
      'normal',
    ]);
  });
});

describe('planning a program', () => {
  it('walks every week of every phase in rotation order', () => {
    const slots = planProgram(MAPS_15_MINUTES, false);
    // 3 phases x 3 weeks x 6 non-optional workouts.
    expect(slots).toHaveLength(54);
    expect(slots[0]).toMatchObject({ phaseName: 'Phase I', phaseWeek: 1 });
    expect(slots.at(-1)).toMatchObject({ phaseName: 'Phase III', phaseWeek: 3 });
  });

  it('adds the optional seventh day when asked', () => {
    expect(planProgram(MAPS_15_MINUTES, true)).toHaveLength(63);
  });

  it('leaves out a workout that only runs on failure weeks', () => {
    const program: Program = {
      ...MAPS_15_MINUTES,
      phases: [
        {
          id: 'p',
          name: 'P',
          weeks: 2,
          weekTypes: ['normal', 'failure'],
          workouts: [
            { id: 'w1', name: 'Every week', kind: 'fixed', blocks: [] },
            { id: 'w2', name: 'Failure week only', kind: 'fixed', weekTypes: ['failure'], blocks: [] },
          ],
        },
      ],
    };
    const slots = planProgram(program, false);
    expect(slots.map((s) => `${s.phaseWeek}:${s.workoutName}`)).toEqual([
      '1:Every week',
      '2:Every week',
      '2:Failure week only',
    ]);
  });
});

describe('training days', () => {
  it('honours chosen weekdays', () => {
    const s = schedule({ weekdays: [1, 3, 5] });
    expect(isTrainingDay(s, '2026-09-21')).toBe(true); // Monday
    expect(isTrainingDay(s, '2026-09-22')).toBe(false); // Tuesday
    expect(isTrainingDay(s, '2026-09-23')).toBe(true); // Wednesday
  });

  it('honours an N-on / M-off rotation', () => {
    const s = schedule({ mode: 'rotation', rotationDaysOn: 2, rotationDaysOff: 1 });
    expect(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'].map((d) => isTrainingDay(s, d))).toEqual([
      true,
      true,
      false,
      true,
    ]);
  });

  it('never schedules before the start date', () => {
    const s = schedule({ mode: 'rotation', rotationDaysOn: 2, rotationDaysOff: 1 });
    expect(isTrainingDay(s, '2026-09-20')).toBe(false);
  });
});

describe('generating sessions', () => {
  it('lays every planned workout onto a training day', () => {
    const sessions = generateSessions(MAPS_15_MINUTES, schedule());
    expect(sessions).toHaveLength(54);
    expect(sessions[0].date).toBe('2026-09-21');
    expect(sessions.every((s) => weekday(s.date) !== 0)).toBe(true);
  });

  it('keeps the sessions in order and never doubles up a date', () => {
    const sessions = generateSessions(MAPS_15_MINUTES, schedule());
    const dates = sessions.map((s) => s.date);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('runs six a week onto six chosen days, week for week', () => {
    const sessions = generateSessions(MAPS_15_MINUTES, schedule());
    expect(sessionsPerWeek(MAPS_15_MINUTES, false)).toBe(6);
    // The seventh session should be the next Monday, a week after the first.
    expect(sessions[6].date).toBe(addDays(sessions[0].date, 7));
  });

  it('produces nothing for an empty program rather than spinning', () => {
    const empty: Program = { ...MAPS_15_MINUTES, phases: [] };
    expect(generateSessions(empty, schedule())).toEqual([]);
  });
});

describe('resolving what to actually do', () => {
  it('finds the workout a session points at', () => {
    const sessions = generateSessions(MAPS_15_MINUTES, schedule());
    const resolved = resolveWorkout(MAPS_15_MINUTES, sessions[0]);
    expect(resolved?.workout.name).toContain('Workout #1');
  });

  it('follows a chosen option on a choice day', () => {
    const phase = MAPS_15_MINUTES.phases[0];
    const choice = phase.workouts.at(-1)!;
    const resolved = resolveWorkout(MAPS_15_MINUTES, {
      phaseId: phase.id,
      workoutId: choice.id,
      chosenOptionId: choice.options![1].id,
    });
    expect(resolved?.option?.name).toBe('Butt focus');
  });

  it('returns null when the workout is gone', () => {
    expect(
      resolveWorkout(MAPS_15_MINUTES, { phaseId: 'nope', workoutId: 'nope' }),
    ).toBeNull();
  });
});

describe('target set count', () => {
  it('counts straight sets as written', () => {
    expect(targetSetCount({ kind: 'straight' }, { sets: 3 })).toBe(3);
  });

  it('counts a circuit by its rounds', () => {
    expect(targetSetCount({ kind: 'circuit', rounds: 4 }, { sets: 1 })).toBe(4);
  });
});
