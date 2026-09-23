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
import { DEFAULT_PROGRESSION } from '../lib/progression';
import { DEFAULT_DUMBBELL_LADDER_LB } from '../lib/units';
import { SEED_EXERCISES } from '../data/exercises';
import { EXERCISE_MEDIA } from '../data/media.generated';
import { MAPS_15_MINUTES } from '../data/maps15';
import { MAPS_15_MINUTES_ADVANCED } from '../data/maps15Advanced';
import { MAPS_AESTHETIC } from '../data/mapsAesthetic';
import { MAPS_ANABOLIC } from '../data/mapsAnabolic';
import { MAPS_ANABOLIC_ADVANCED } from '../data/mapsAnabolicAdvanced';

/** Shipped programs, in the order they appear in the library. */
const SEED_PROGRAMS = [
  MAPS_15_MINUTES,
  MAPS_15_MINUTES_ADVANCED,
  MAPS_ANABOLIC,
  MAPS_ANABOLIC_ADVANCED,
  MAPS_AESTHETIC,
];
import { getDB } from './db';

const SETTINGS_KEY = 'settings';
export const SEED_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  units: 'lb',
  dumbbellLadder: DEFAULT_DUMBBELL_LADDER_LB,
  smallestIncrement: 2.5,
  defaultProgression: DEFAULT_PROGRESSION,
  restTimerSound: true,
  restTimerVibrate: true,
};

// --- settings ---------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const db = await getDB();
  const stored = await db.get('meta', SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function putSettings(settings: Settings): Promise<void> {
  const db = await getDB();
  await db.put('meta', settings, SETTINGS_KEY);
}

// --- exercises --------------------------------------------------------------

export async function allExercises(): Promise<Exercise[]> {
  const db = await getDB();
  const list = await db.getAll('exercises');
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function putExercise(exercise: Exercise): Promise<void> {
  const db = await getDB();
  await db.put('exercises', exercise);
}

export async function deleteExercise(id: ID): Promise<void> {
  const db = await getDB();
  await db.delete('exercises', id);
}

// --- programs ---------------------------------------------------------------

export async function allPrograms(): Promise<Program[]> {
  const db = await getDB();
  const list = await db.getAll('programs');
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProgram(id: ID): Promise<Program | undefined> {
  const db = await getDB();
  return db.get('programs', id);
}

export async function putProgram(program: Program): Promise<void> {
  const db = await getDB();
  await db.put('programs', { ...program, updatedAt: Date.now() });
}

export async function deleteProgram(id: ID): Promise<void> {
  const db = await getDB();
  await db.delete('programs', id);
}

// --- schedules --------------------------------------------------------------

export async function allSchedules(): Promise<Schedule[]> {
  const db = await getDB();
  return db.getAll('schedules');
}

export async function putSchedule(schedule: Schedule): Promise<void> {
  const db = await getDB();
  await db.put('schedules', schedule);
}

/**
 * Replace a schedule and everything it generated. Sessions that were already
 * logged against are kept — rescheduling should never eat history.
 */
export async function replaceSchedule(
  schedule: Schedule,
  sessions: ScheduledSession[],
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['schedules', 'sessions', 'sets'], 'readwrite');
  const sessionStore = tx.objectStore('sessions');
  const setStore = tx.objectStore('sets');

  const existing = await sessionStore.index('by-schedule').getAll(schedule.id);
  for (const old of existing) {
    const logged = await setStore.index('by-session').count(old.id);
    if (logged === 0 && old.status === 'upcoming') {
      await sessionStore.delete(old.id);
    }
  }

  // Mark every other schedule inactive; one program is "the" program at a time.
  const scheduleStore = tx.objectStore('schedules');
  for (const other of await scheduleStore.getAll()) {
    if (other.id !== schedule.id && other.active) {
      await scheduleStore.put({ ...other, active: false });
    }
  }
  await scheduleStore.put(schedule);

  const kept = await sessionStore.index('by-schedule').getAll(schedule.id);
  const takenDates = new Set(kept.map((s) => s.date));
  for (const session of sessions) {
    // Do not double-book a day whose session survived because it has history.
    if (takenDates.has(session.date)) continue;
    await sessionStore.put(session);
  }

  await tx.done;
}

// --- sessions ---------------------------------------------------------------

export async function allSessions(): Promise<ScheduledSession[]> {
  const db = await getDB();
  const list = await db.getAll('sessions');
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

export async function sessionsOn(date: DateKey): Promise<ScheduledSession[]> {
  const db = await getDB();
  return db.getAllFromIndex('sessions', 'by-date', date);
}

export async function getSession(id: ID): Promise<ScheduledSession | undefined> {
  const db = await getDB();
  return db.get('sessions', id);
}

export async function putSession(session: ScheduledSession): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function deleteSession(id: ID): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'sets'], 'readwrite');
  const setStore = tx.objectStore('sets');
  for (const set of await setStore.index('by-session').getAll(id)) {
    await setStore.delete(set.id);
  }
  await tx.objectStore('sessions').delete(id);
  await tx.done;
}

// --- logged sets ------------------------------------------------------------

export async function setsForSession(sessionId: ID): Promise<LoggedSet[]> {
  const db = await getDB();
  const list = await db.getAllFromIndex('sets', 'by-session', sessionId);
  return list.sort((a, b) => a.setNumber - b.setNumber || a.timestamp - b.timestamp);
}

export async function setsForExercise(exerciseId: ID): Promise<LoggedSet[]> {
  const db = await getDB();
  return db.getAllFromIndex('sets', 'by-exercise', exerciseId);
}

export async function allSets(): Promise<LoggedSet[]> {
  const db = await getDB();
  return db.getAll('sets');
}

export async function putSet(set: LoggedSet): Promise<void> {
  const db = await getDB();
  await db.put('sets', set);
}

export async function deleteSet(id: ID): Promise<void> {
  const db = await getDB();
  await db.delete('sets', id);
}

// --- progression ------------------------------------------------------------

export async function allProgression(): Promise<ProgressionState[]> {
  const db = await getDB();
  return db.getAll('progression');
}

export async function putProgression(state: ProgressionState): Promise<void> {
  const db = await getDB();
  await db.put('progression', state);
}

// --- seeding ----------------------------------------------------------------

let seeding: Promise<void> | null = null;

/**
 * Put the starting library and the shipped programs in place. Seeded rows have
 * stable ids, so this fills gaps without overwriting anything you have edited.
 *
 * Callers share one run. React's StrictMode fires effects twice in development,
 * and two interleaved seedings wrote the programs at different timestamps,
 * which shuffled the library order.
 */
export function seedIfEmpty(): Promise<void> {
  if (!seeding) {
    seeding = runSeed().finally(() => {
      seeding = null;
    });
  }
  return seeding;
}

async function runSeed(): Promise<void> {
  const db = await getDB();
  const settings = await getSettings();

  const tx = db.transaction(['exercises', 'programs'], 'readwrite');
  const exerciseStore = tx.objectStore('exercises');
  for (const seed of SEED_EXERCISES) {
    const media = EXERCISE_MEDIA[seed.id];
    const existing = await exerciseStore.get(seed.id);
    if (!existing) {
      await exerciseStore.put({ ...seed, media: media ?? seed.media, custom: false });
    } else if (media && !existing.media) {
      // Visual aids imported after the library was seeded.
      await exerciseStore.put({ ...existing, media });
    }
  }

  const programStore = tx.objectStore('programs');
  const now = Date.now();
  for (const [index, program] of SEED_PROGRAMS.entries()) {
    if (!(await programStore.get(program.id))) {
      // Stagger updatedAt so the library keeps the order above rather than
      // whichever one happened to be written last.
      await programStore.put({
        ...program,
        createdAt: now,
        updatedAt: now - index,
      });
    }
  }
  await tx.done;

  if (settings.seedVersion !== SEED_VERSION) {
    await putSettings({
      ...settings,
      seedVersion: SEED_VERSION,
      activeProgramId: settings.activeProgramId ?? MAPS_15_MINUTES.id,
    });
  }
}

// --- backup -----------------------------------------------------------------

export const BACKUP_VERSION = 1;

export async function exportBackup(): Promise<Backup> {
  const db = await getDB();
  return {
    format: 'overload-backup',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    exercises: await db.getAll('exercises'),
    programs: await db.getAll('programs'),
    schedules: await db.getAll('schedules'),
    sessions: await db.getAll('sessions'),
    sets: await db.getAll('sets'),
    progression: await db.getAll('progression'),
    settings: await getSettings(),
  };
}

export interface ImportReport {
  exercises: number;
  programs: number;
  schedules: number;
  sessions: number;
  sets: number;
}

export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not JSON.');
  }
  const backup = data as Partial<Backup>;
  if (backup?.format !== 'overload-backup') {
    throw new Error('That JSON is not an Overload backup.');
  }
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    throw new Error(
      `That backup was written by a newer version of the app (format ${backup.version}).`,
    );
  }
  return backup as Backup;
}

/**
 * `replace` wipes first — used by "restore this backup". Otherwise rows are
 * merged in by id, so importing a second device's history adds to this one.
 */
export async function importBackup(
  backup: Backup,
  mode: 'merge' | 'replace',
): Promise<ImportReport> {
  const db = await getDB();
  const stores = [
    'exercises',
    'programs',
    'schedules',
    'sessions',
    'sets',
    'progression',
    'meta',
  ] as const;
  const tx = db.transaction(stores, 'readwrite');

  if (mode === 'replace') {
    for (const name of stores) {
      await tx.objectStore(name).clear();
    }
  }

  for (const row of backup.exercises ?? []) await tx.objectStore('exercises').put(row);
  for (const row of backup.programs ?? []) await tx.objectStore('programs').put(row);
  for (const row of backup.schedules ?? []) await tx.objectStore('schedules').put(row);
  for (const row of backup.sessions ?? []) await tx.objectStore('sessions').put(row);
  for (const row of backup.sets ?? []) await tx.objectStore('sets').put(row);
  for (const row of backup.progression ?? []) await tx.objectStore('progression').put(row);
  if (backup.settings) {
    await tx.objectStore('meta').put(backup.settings, SETTINGS_KEY);
  }

  await tx.done;

  return {
    exercises: backup.exercises?.length ?? 0,
    programs: backup.programs?.length ?? 0,
    schedules: backup.schedules?.length ?? 0,
    sessions: backup.sessions?.length ?? 0,
    sets: backup.sets?.length ?? 0,
  };
}

/** Wipe everything and re-seed. */
/** Test hook: forget any in-flight seed so a reset can seed again cleanly. */
export function resetSeedGuard(): void {
  seeding = null;
}

export async function resetEverything(): Promise<void> {
  const db = await getDB();
  const stores = [
    'exercises',
    'programs',
    'schedules',
    'sessions',
    'sets',
    'progression',
    'meta',
  ] as const;
  const tx = db.transaction(stores, 'readwrite');
  for (const name of stores) await tx.objectStore(name).clear();
  await tx.done;
  await seedIfEmpty();
}
