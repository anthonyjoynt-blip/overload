import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  Backup,
  DateKey,
  Exercise,
  ID,
  LoggedSet,
  Program,
  ProgressionState,
  Schedule,
  ScheduledSession,
  Settings,
} from '../types';
import * as repo from '../db/repo';
import { generateSessions } from '../lib/schedule';
import { newId } from '../lib/id';

/**
 * One user, one device, a few thousand rows at most — so the whole database
 * lives in memory and every write goes to IndexedDB and then updates state.
 * No query layer, no cache invalidation, no stale reads.
 */

interface Data {
  settings: Settings;
  exercises: Exercise[];
  programs: Program[];
  schedules: Schedule[];
  sessions: ScheduledSession[];
  sets: LoggedSet[];
  progression: ProgressionState[];
}

const EMPTY: Data = {
  settings: repo.DEFAULT_SETTINGS,
  exercises: [],
  programs: [],
  schedules: [],
  sessions: [],
  sets: [],
  progression: [],
};

export interface Store extends Data {
  loading: boolean;
  error: string | null;

  saveSettings(patch: Partial<Settings>): Promise<void>;
  saveExercise(exercise: Exercise): Promise<void>;
  removeExercise(id: ID): Promise<void>;

  saveProgram(program: Program): Promise<void>;
  removeProgram(id: ID): Promise<void>;

  /** Put a program on the calendar, replacing any previous plan for it. */
  scheduleProgram(input: {
    programId: ID;
    startDate: DateKey;
    mode: Schedule['mode'];
    weekdays?: number[];
    rotationDaysOn?: number;
    rotationDaysOff?: number;
    includeOptional: boolean;
  }): Promise<void>;

  updateSession(session: ScheduledSession): Promise<void>;
  moveSession(id: ID, to: DateKey): Promise<void>;
  removeSession(id: ID): Promise<void>;

  logSet(set: LoggedSet): Promise<void>;
  removeSet(id: ID): Promise<void>;

  saveProgression(state: ProgressionState): Promise<void>;

  exportBackup(): Promise<Backup>;
  importBackup(backup: Backup, mode: 'merge' | 'replace'): Promise<repo.ImportReport>;
  resetEverything(): Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [settings, exercises, programs, schedules, sessions, sets, progression] =
      await Promise.all([
        repo.getSettings(),
        repo.allExercises(),
        repo.allPrograms(),
        repo.allSchedules(),
        repo.allSessions(),
        repo.allSets(),
        repo.allProgression(),
      ]);
    setData({ settings, exercises, programs, schedules, sessions, sets, progression });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await repo.seedIfEmpty();
        if (!cancelled) await reload();
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `Could not open the local database: ${e.message}`
              : 'Could not open the local database.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const store = useMemo<Store>(() => {
    return {
      ...data,
      loading,
      error,

      async saveSettings(patch) {
        const next = { ...data.settings, ...patch };
        await repo.putSettings(next);
        setData((d) => ({ ...d, settings: next }));
      },

      async saveExercise(exercise) {
        await repo.putExercise(exercise);
        setData((d) => ({
          ...d,
          exercises: upsert(d.exercises, exercise, (e) => e.id).sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        }));
      },

      async removeExercise(id) {
        await repo.deleteExercise(id);
        setData((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id) }));
      },

      async saveProgram(program) {
        const next = { ...program, updatedAt: Date.now() };
        await repo.putProgram(next);
        setData((d) => ({ ...d, programs: upsert(d.programs, next, (p) => p.id) }));
      },

      async removeProgram(id) {
        await repo.deleteProgram(id);
        setData((d) => ({ ...d, programs: d.programs.filter((p) => p.id !== id) }));
      },

      async scheduleProgram(input) {
        const program = data.programs.find((p) => p.id === input.programId);
        if (!program) throw new Error('That program is gone.');

        const existing = data.schedules.find((s) => s.programId === input.programId);
        const schedule: Schedule = {
          id: existing?.id ?? newId('sched'),
          programId: input.programId,
          startDate: input.startDate,
          mode: input.mode,
          weekdays: input.weekdays,
          rotationDaysOn: input.rotationDaysOn,
          rotationDaysOff: input.rotationDaysOff,
          includeOptional: input.includeOptional,
          active: true,
          createdAt: existing?.createdAt ?? Date.now(),
        };

        await repo.replaceSchedule(schedule, generateSessions(program, schedule));
        await repo.putSettings({
          ...data.settings,
          activeProgramId: program.id,
          activeScheduleId: schedule.id,
        });
        await reload();
      },

      async updateSession(session) {
        await repo.putSession(session);
        setData((d) => ({
          ...d,
          sessions: upsert(d.sessions, session, (s) => s.id).sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        }));
      },

      async moveSession(id, to) {
        const session = data.sessions.find((s) => s.id === id);
        if (!session) return;
        const moved: ScheduledSession = {
          ...session,
          date: to,
          movedFrom: session.movedFrom ?? session.date,
        };
        await repo.putSession(moved);
        setData((d) => ({
          ...d,
          sessions: upsert(d.sessions, moved, (s) => s.id).sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        }));
      },

      async removeSession(id) {
        await repo.deleteSession(id);
        setData((d) => ({
          ...d,
          sessions: d.sessions.filter((s) => s.id !== id),
          sets: d.sets.filter((s) => s.sessionId !== id),
        }));
      },

      async logSet(set) {
        await repo.putSet(set);
        setData((d) => ({ ...d, sets: upsert(d.sets, set, (s) => s.id) }));
      },

      async removeSet(id) {
        await repo.deleteSet(id);
        setData((d) => ({ ...d, sets: d.sets.filter((s) => s.id !== id) }));
      },

      async saveProgression(state) {
        await repo.putProgression(state);
        setData((d) => ({
          ...d,
          progression: upsert(d.progression, state, (p) => p.exerciseId),
        }));
      },

      exportBackup: repo.exportBackup,

      async importBackup(backup, mode) {
        const report = await repo.importBackup(backup, mode);
        await reload();
        return report;
      },

      async resetEverything() {
        await repo.resetEverything();
        await reload();
      },
    };
  }, [data, loading, error, reload]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function upsert<T>(list: T[], item: T, key: (item: T) => string): T[] {
  const id = key(item);
  const index = list.findIndex((existing) => key(existing) === id);
  if (index === -1) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>.');
  return store;
}
