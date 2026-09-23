import type {
  Block,
  DateKey,
  Exercise,
  ID,
  LoggedSet,
  Phase,
  Program,
  ProgramExercise,
  ScheduledSession,
  Workout,
} from '../types';
import {
  evaluateMovement,
  type MovementProgress,
  type SessionSets,
} from '../lib/progression';
import { targetSetCount } from '../lib/schedule';
import { todayKey } from '../lib/dates';
import type { Store } from './store';

export interface Prescription {
  programExercise: ProgramExercise;
  block: Block;
  /** Working sets prescribed, counting circuit rounds. */
  targetSets: number;
  /** Absent for movements chosen while logging rather than in the builder. */
  program?: Program;
  phase?: Phase;
  workout?: Workout;
  /** Where it came from, for display: "Phase II / Workout #2" or "added on the day". */
  origin: string;
}

/**
 * Every prescription the app knows about, keyed by ProgramExercise id: the ones
 * in programs, plus the ones added to a session while logging.
 */
export function buildPrescriptionIndex(
  programs: Program[],
  sessions: ScheduledSession[] = [],
): Map<ID, Prescription> {
  const index = new Map<ID, Prescription>();
  for (const program of programs) {
    for (const phase of program.phases) {
      for (const workout of phase.workouts) {
        for (const w of [workout, ...(workout.options ?? [])]) {
          for (const block of w.blocks) {
            for (const pe of block.exercises) {
              index.set(pe.id, {
                programExercise: pe,
                block,
                workout: w,
                phase,
                program,
                targetSets: targetSetCount(block, pe),
                origin: `${phase.name} / ${w.name}`,
              });
            }
          }
        }
      }
    }
  }
  for (const session of sessions) {
    for (const block of session.adHocBlocks ?? []) {
      for (const pe of block.exercises) {
        index.set(pe.id, {
          programExercise: pe,
          block,
          targetSets: targetSetCount(block, pe),
          origin: 'added on the day',
        });
      }
    }
  }
  return index;
}

export function exerciseMap(exercises: Exercise[]): Map<ID, Exercise> {
  return new Map(exercises.map((e) => [e.id, e]));
}

export function activeProgram(store: Pick<Store, 'programs' | 'settings'>): Program | undefined {
  const { activeProgramId } = store.settings;
  return (
    store.programs.find((p) => p.id === activeProgramId) ??
    store.programs.find((p) => !p.retired)
  );
}

export function sessionsOnDate(
  sessions: ScheduledSession[],
  date: DateKey,
): ScheduledSession[] {
  return sessions.filter((s) => s.date === date);
}

export function nextSessions(sessions: ScheduledSession[], limit = 5): ScheduledSession[] {
  const today = todayKey();
  return sessions
    .filter((s) => s.date >= today && s.status === 'upcoming')
    .slice(0, limit);
}

/** Sessions that were due before today and never logged. */
export function missedSessions(sessions: ScheduledSession[]): ScheduledSession[] {
  const today = todayKey();
  return sessions.filter((s) => s.date < today && s.status === 'upcoming');
}

// ---------------------------------------------------------------------------
// Progression
// ---------------------------------------------------------------------------

/**
 * Two prescriptions count as the same when the rep scheme and the working-set
 * count match. It matters because the same movement can appear under different
 * schemes across phases (4 x 8-10 in one, circuits of 10 in the next), and a
 * streak that spanned both would be meaningless.
 */
function prescriptionKey(p: Prescription): string {
  return JSON.stringify([p.programExercise.reps, p.targetSets]);
}

export interface MovementContext {
  exercise: Exercise;
  prescription: Prescription;
  progress: MovementProgress;
  /** Sessions judged, oldest first. */
  sessions: SessionSets[];
}

/**
 * Gather everything logged for one movement and run the coaching rule over it.
 * Returns null when the movement is not in any program — there is no target to
 * judge it against.
 */
export function movementProgress(
  store: Pick<Store, 'sets' | 'sessions' | 'exercises' | 'programs' | 'progression' | 'settings'>,
  exerciseId: ID,
  index = buildPrescriptionIndex(store.programs, store.sessions),
): MovementContext | null {
  const exercise = store.exercises.find((e) => e.id === exerciseId);
  if (!exercise) return null;

  const sets = store.sets.filter((s) => s.exerciseId === exerciseId);
  const sessionById = new Map(store.sessions.map((s) => [s.id, s]));

  const grouped = new Map<ID, LoggedSet[]>();
  for (const set of sets) {
    const list = grouped.get(set.sessionId) ?? [];
    list.push(set);
    grouped.set(set.sessionId, list);
  }

  interface Candidate {
    sessionSets: SessionSets;
    prescription?: Prescription;
  }

  const candidates: Candidate[] = [];
  for (const [sessionId, group] of grouped) {
    const session = sessionById.get(sessionId);
    const completedAt =
      session?.completedAt ?? Math.max(...group.map((s) => s.timestamp));
    const peId = group.find((s) => s.programExerciseId)?.programExerciseId;
    candidates.push({
      sessionSets: {
        sessionId,
        completedAt,
        date: session?.date ?? new Date(completedAt).toISOString().slice(0, 10),
        sets: group,
      },
      prescription: peId ? index.get(peId) : undefined,
    });
  }

  candidates.sort((a, b) => a.sessionSets.completedAt - b.sessionSets.completedAt);

  // The prescription in force is the most recent one actually logged against,
  // falling back to any prescription in the active program that uses this
  // movement — which is what a movement looks like before its first session.
  const latestWithPrescription = [...candidates].reverse().find((c) => c.prescription);
  const prescription =
    latestWithPrescription?.prescription ??
    [...index.values()].find((p) => p.programExercise.exerciseId === exerciseId);

  if (!prescription) return null;

  const key = prescriptionKey(prescription);
  const sessions = candidates
    .filter((c) => !c.prescription || prescriptionKey(c.prescription) === key)
    .map((c) => c.sessionSets);

  const state = store.progression.find((p) => p.exerciseId === exerciseId);

  const progress = evaluateMovement({
    exercise,
    programExercise: { ...prescription.programExercise, sets: prescription.targetSets },
    sessions,
    settings: store.settings,
    state,
  });

  return { exercise, prescription, progress, sessions };
}

/** Every movement in the active program, with its coaching status. */
export function allMovementProgress(
  store: Pick<Store, 'sets' | 'sessions' | 'exercises' | 'programs' | 'progression' | 'settings'>,
): MovementContext[] {
  const index = buildPrescriptionIndex(store.programs, store.sessions);
  const program = activeProgram(store);
  const ids = new Set<ID>();
  if (program) {
    for (const p of index.values()) {
      if (p.program?.id === program.id) ids.add(p.programExercise.exerciseId);
    }
  }
  for (const set of store.sets) ids.add(set.exerciseId);

  return [...ids]
    .map((id) => movementProgress(store, id, index))
    .filter((c): c is MovementContext => c !== null);
}

export function readyToProgress(contexts: MovementContext[]): MovementContext[] {
  return contexts
    .filter((c) => c.progress.status === 'ready')
    .sort((a, b) => b.progress.streak - a.progress.streak);
}

// ---------------------------------------------------------------------------
// History for the progress screen
// ---------------------------------------------------------------------------

export interface HistoryPoint {
  date: DateKey;
  completedAt: number;
  /** Heaviest working set of the session. */
  topWeight?: number;
  /** Sum of weight x reps across the session. */
  volume: number;
  bestReps?: number;
  qualified: boolean;
}

export function weightHistory(context: MovementContext): HistoryPoint[] {
  return context.sessions.map((session, i) => {
    const weights = session.sets
      .map((s) => s.weight)
      .filter((w): w is number => typeof w === 'number');
    const volume = session.sets.reduce(
      (total, s) => total + (s.weight ?? 0) * (s.reps ?? 0),
      0,
    );
    const reps = session.sets.map((s) => s.reps ?? 0);
    return {
      date: session.date,
      completedAt: session.completedAt,
      topWeight: weights.length ? Math.max(...weights) : undefined,
      volume,
      bestReps: reps.length ? Math.max(...reps) : undefined,
      qualified: context.progress.verdicts[i]?.qualifies ?? false,
    };
  });
}

/**
 * Scheduled sessions completed in a row, counting back from the most recent one
 * that is already due. Counting calendar days would punish a rest day; counting
 * sessions is what the program actually asks of you. A skipped or missed day
 * ends the run.
 */
export function sessionStreak(sessions: ScheduledSession[]): number {
  const today = todayKey();
  const due = sessions
    .filter((s) => s.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  let streak = 0;
  for (let i = due.length - 1; i >= 0; i--) {
    const session = due[i];
    // Today's session not being logged yet is not a broken streak.
    if (session.date === today && session.status === 'upcoming') continue;
    if (session.status !== 'done') break;
    streak++;
  }
  return streak;
}
