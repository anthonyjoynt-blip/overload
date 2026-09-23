/**
 * Turning a program into dates.
 *
 * A program is an ordered run of workouts: every week of every phase, in
 * rotation order, minus the ones this week's type or the user's "skip the
 * optional day" setting takes out. A schedule is a rule for which calendar days
 * are training days. Pairing the two in order gives the sessions.
 *
 * Sessions are materialised rather than computed on the fly, so moving one day
 * is just an edit to that row and the rest of the pattern stays put.
 */

import type {
  BlockKind,
  DateKey,
  Program,
  Schedule,
  ScheduledSession,
  WeekType,
  Workout,
} from '../types';
import { addDays, daysBetween, weekday } from './dates';
import { newId } from './id';

export interface PlannedSlot {
  phaseId: string;
  phaseName: string;
  workoutId: string;
  workoutName: string;
  weekType: WeekType;
  /** 1-based week inside its phase. */
  phaseWeek: number;
  optional: boolean;
}

export function weekTypeFor(weekTypes: WeekType[] | undefined, week: number): WeekType {
  if (!weekTypes || weekTypes.length === 0) return 'normal';
  return weekTypes[(week - 1) % weekTypes.length];
}

export function workoutAppearsIn(workout: Workout, weekType: WeekType): boolean {
  if (!workout.weekTypes || workout.weekTypes.length === 0) return true;
  return workout.weekTypes.includes(weekType);
}

/** Every workout the program asks for, in the order it asks for them. */
export function planProgram(program: Program, includeOptional: boolean): PlannedSlot[] {
  const slots: PlannedSlot[] = [];
  for (const phase of program.phases) {
    for (let week = 1; week <= phase.weeks; week++) {
      const weekType = weekTypeFor(phase.weekTypes, week);
      for (const workout of phase.workouts) {
        if (!workoutAppearsIn(workout, weekType)) continue;
        if (workout.optional && !includeOptional) continue;
        slots.push({
          phaseId: phase.id,
          phaseName: phase.name,
          workoutId: workout.id,
          workoutName: workout.name,
          weekType,
          phaseWeek: week,
          optional: Boolean(workout.optional),
        });
      }
    }
  }
  return slots;
}

/** Is this date a training day under the schedule's rule? */
export function isTrainingDay(schedule: Schedule, date: DateKey): boolean {
  if (schedule.mode === 'weekdays') {
    const days = schedule.weekdays ?? [];
    return days.includes(weekday(date));
  }
  const on = Math.max(1, schedule.rotationDaysOn ?? 1);
  const off = Math.max(0, schedule.rotationDaysOff ?? 0);
  const cycle = on + off;
  const elapsed = daysBetween(schedule.startDate, date);
  if (elapsed < 0) return false;
  return ((elapsed % cycle) + cycle) % cycle < on;
}

/** How many sessions a week the plan works out to — used to warn about mismatches. */
export function sessionsPerWeek(program: Program, includeOptional: boolean): number {
  const phase = program.phases[0];
  if (!phase) return 0;
  const weekType = weekTypeFor(phase.weekTypes, 1);
  return phase.workouts.filter(
    (w) => workoutAppearsIn(w, weekType) && (includeOptional || !w.optional),
  ).length;
}

const MAX_SEARCH_DAYS = 365 * 3;

/**
 * Lay the planned workouts onto training days, starting at the schedule's start
 * date. Runs to the end of the program; a program with no phases produces
 * nothing rather than looping.
 */
export function generateSessions(
  program: Program,
  schedule: Schedule,
): ScheduledSession[] {
  const slots = planProgram(program, schedule.includeOptional);
  if (slots.length === 0) return [];

  const sessions: ScheduledSession[] = [];
  let cursor = schedule.startDate;
  let searched = 0;

  for (const slot of slots) {
    while (!isTrainingDay(schedule, cursor)) {
      cursor = addDays(cursor, 1);
      if (++searched > MAX_SEARCH_DAYS) return sessions;
    }
    sessions.push({
      id: newId(),
      date: cursor,
      scheduleId: schedule.id,
      programId: program.id,
      phaseId: slot.phaseId,
      workoutId: slot.workoutId,
      weekType: slot.weekType,
      status: 'upcoming',
      phaseWeek: slot.phaseWeek,
    });
    cursor = addDays(cursor, 1);
  }

  return sessions;
}

/** Look up the workout a session points at, following a chosen option. */
export function resolveWorkout(
  program: Program,
  session: Pick<ScheduledSession, 'phaseId' | 'workoutId' | 'chosenOptionId'>,
): { workout: Workout; option?: Workout } | null {
  const phase = program.phases.find((p) => p.id === session.phaseId);
  const workout = phase?.workouts.find((w) => w.id === session.workoutId);
  if (!workout) return null;
  if (workout.kind === 'choice' && session.chosenOptionId) {
    const option = workout.options?.find((o) => o.id === session.chosenOptionId);
    if (option) return { workout, option };
  }
  return { workout };
}

/** The blocks actually performed: the chosen option's, or the workout's own. */
export function effectiveBlocks(resolved: { workout: Workout; option?: Workout }) {
  return resolved.option?.blocks ?? resolved.workout.blocks;
}

/**
 * Working sets a movement is prescribed. In a circuit it is performed once per
 * round, so the round count is what the progression rule has to count against.
 */
export function targetSetCount(
  block: { kind: BlockKind; rounds?: number },
  programExercise: { sets: number },
): number {
  return block.kind === 'circuit'
    ? Math.max(1, block.rounds ?? 1) * programExercise.sets
    : programExercise.sets;
}
