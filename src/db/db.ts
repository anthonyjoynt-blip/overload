import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Exercise,
  LoggedSet,
  Program,
  ProgressionState,
  Schedule,
  ScheduledSession,
  Settings,
} from '../types';

export const DB_NAME = 'overload';
export const DB_VERSION = 1;

export interface OverloadDB extends DBSchema {
  exercises: { key: string; value: Exercise };
  programs: { key: string; value: Program };
  schedules: { key: string; value: Schedule };
  sessions: {
    key: string;
    value: ScheduledSession;
    indexes: { 'by-date': string; 'by-schedule': string; 'by-status': string };
  };
  sets: {
    key: string;
    value: LoggedSet;
    indexes: { 'by-session': string; 'by-exercise': string };
  };
  progression: { key: string; value: ProgressionState };
  /** One row, key 'settings'. */
  meta: { key: string; value: Settings };
}

let dbPromise: Promise<IDBPDatabase<OverloadDB>> | null = null;

/**
 * IndexedDB will not upgrade or delete a database while another tab holds it
 * open, and the open request simply never settles — which looks exactly like a
 * hung app. So: hand the database over when another tab needs it, and if we are
 * the one being blocked, say so out loud instead of spinning forever.
 */
const OPEN_TIMEOUT_MS = 8000;

class DatabaseBlockedError extends Error {
  constructor() {
    super(
      'Another tab has Overload open and is holding the database. ' +
        'Close the other tabs and reload this one.',
    );
    this.name = 'DatabaseBlockedError';
  }
}

export function getDB(): Promise<IDBPDatabase<OverloadDB>> {
  if (!dbPromise) {
    let blocked = false;
    const opening = openDB<OverloadDB>(DB_NAME, DB_VERSION, {
      blocked() {
        // Someone else is holding an older version open.
        blocked = true;
      },
      blocking(_current, _blocked, event) {
        // We are the one in the way. Let go so the other tab can proceed.
        (event.target as IDBOpenDBRequest | null)?.result?.close();
        dbPromise = null;
      },
      terminated() {
        dbPromise = null;
      },
      upgrade(db) {
        if (!db.objectStoreNames.contains('exercises')) {
          db.createObjectStore('exercises', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('programs')) {
          db.createObjectStore('programs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('schedules')) {
          db.createObjectStore('schedules', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('by-date', 'date');
          store.createIndex('by-schedule', 'scheduleId');
          store.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('sets')) {
          const store = db.createObjectStore('sets', { keyPath: 'id' });
          store.createIndex('by-session', 'sessionId');
          store.createIndex('by-exercise', 'exerciseId');
        }
        if (!db.objectStoreNames.contains('progression')) {
          db.createObjectStore('progression', { keyPath: 'exerciseId' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });

    dbPromise = Promise.race([
      opening,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          if (blocked) reject(new DatabaseBlockedError());
        }, OPEN_TIMEOUT_MS);
      }),
    ]).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Tests and the "start over" button. */
export function resetDBHandle(): void {
  dbPromise = null;
}
