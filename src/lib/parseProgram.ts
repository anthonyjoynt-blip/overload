/**
 * Reading a program someone already wrote up.
 *
 * The spec settles on a structured table rather than an arbitrary PDF, so this
 * takes CSV, TSV or a pasted markdown table with columns along the lines of
 *
 *   Phase | Weeks | Day | Group | Exercise | Sets | Reps | Rest | Weight | Notes
 *
 * Only Exercise is required. Everything else has a default, and every guess the
 * parser makes comes back as a warning rather than being applied silently.
 */

import type {
  Block,
  Exercise,
  Phase,
  Program,
  ProgramExercise,
  RepTarget,
  WeightMode,
  Workout,
} from '../types';
import { newId, slugId } from './id';

export interface ParseResult {
  program: Program;
  /** Exercise names that were not in the library; stubs were created for them. */
  createdExercises: Exercise[];
  warnings: string[];
  rowCount: number;
}

/** Weeks a single-phase upload runs for when the table does not say. */
export const DEFAULT_PHASE_WEEKS = 8;

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function isMarkdownSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  out.push(cell);
  return out.map((c) => c.trim());
}

export function splitTable(text: string): string[][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const pipeLines = lines.filter((l) => l.includes('|')).length;
  const markdown = pipeLines >= lines.length * 0.8;

  const rows: string[][] = [];
  if (markdown) {
    for (const line of lines) {
      const trimmed = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
      const cells = trimmed.split('|').map((c) => c.trim());
      if (isMarkdownSeparator(cells)) continue;
      rows.push(cells);
    }
    return rows;
  }

  const header = lines[0];
  const delimiter = header.split('\t').length > header.split(',').length ? '\t' : ',';
  for (const line of lines) {
    rows.push(splitCsvLine(line, delimiter));
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

type Column =
  | 'phase'
  | 'weeks'
  | 'day'
  | 'group'
  | 'exercise'
  | 'sets'
  | 'reps'
  | 'rest'
  | 'weight'
  | 'notes';

const HEADER_ALIASES: Record<Column, string[]> = {
  phase: ['phase', 'block', 'mesocycle'],
  weeks: ['weeks', 'week', 'duration'],
  day: ['day', 'workout', 'session', 'split'],
  group: ['group', 'superset', 'circuit', 'grouping'],
  exercise: ['exercise', 'movement', 'lift', 'name'],
  sets: ['sets', 'set'],
  reps: ['reps', 'rep', 'repetitions', 'rep range', 'reprange'],
  rest: ['rest', 'rest between sets', 'rest period'],
  weight: ['weight', 'starting weight', 'start weight', 'load', 'startingweight'],
  notes: ['notes', 'note', 'comment', 'cue'],
};

function normalizeHeader(cell: string): string {
  return cell.toLowerCase().replace(/[^a-z ]/g, '').trim();
}

function mapHeaders(header: string[]): Partial<Record<Column, number>> {
  const map: Partial<Record<Column, number>> = {};
  header.forEach((cell, index) => {
    const norm = normalizeHeader(cell);
    for (const [column, aliases] of Object.entries(HEADER_ALIASES) as [Column, string[]][]) {
      if (map[column] === undefined && aliases.includes(norm)) {
        map[column] = index;
      }
    }
  });
  return map;
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

const PER_SIDE = /\b(each|per)\s+(side|leg|arm|hand)\b/i;

export function parseReps(raw: string): { target: RepTarget; warning?: string } {
  const text = raw.trim();
  if (!text) return { target: { type: 'range', min: 8, max: 12 }, warning: 'no reps given — used 8-12' };

  const perSide = PER_SIDE.test(text);
  const cleaned = text.replace(PER_SIDE, '').trim();

  if (/fail/i.test(cleaned)) {
    return { target: { type: 'failure', perSide: perSide || undefined, note: text } };
  }
  if (/amrap|as many/i.test(cleaned)) {
    const floor = cleaned.match(/(\d+)\s*\+/);
    return {
      target: {
        type: 'amrap',
        min: floor ? Number(floor[1]) : undefined,
        perSide: perSide || undefined,
        note: text,
      },
    };
  }

  // Times: "30s", "1 min", "0:45", "60 seconds", "5 second hold"
  const clock = cleaned.match(/^(\d+):(\d{1,2})$/);
  if (clock) {
    const seconds = Number(clock[1]) * 60 + Number(clock[2]);
    return { target: { type: 'timed', seconds, perSide: perSide || undefined } };
  }
  const timed = cleaned.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes)\b/i);
  if (timed) {
    const value = Number(timed[1]);
    const seconds = /^m/i.test(timed[2]) ? value * 60 : value;
    return { target: { type: 'timed', seconds, perSide: perSide || undefined, note: text } };
  }

  const range = cleaned.match(/^(\d+)\s*(?:-|–|to)\s*(\d+)/);
  if (range) {
    return {
      target: {
        type: 'range',
        min: Number(range[1]),
        max: Number(range[2]),
        perSide: perSide || undefined,
      },
    };
  }

  const fixed = cleaned.match(/(\d+)/);
  if (fixed) {
    return {
      target: { type: 'fixed', min: Number(fixed[1]), perSide: perSide || undefined },
    };
  }

  return {
    target: { type: 'range', min: 8, max: 12 },
    warning: `could not read reps "${text}" — used 8-12`,
  };
}

export function parseSets(raw: string): { sets: number; warning?: string } {
  const text = raw.trim();
  if (!text) return { sets: 3, warning: 'no set count given — used 3' };
  const range = text.match(/^(\d+)\s*(?:-|–|to)\s*(\d+)/);
  if (range) {
    // A prescribed 3-4 means at least 3; the lower number is what has to be
    // earned every session, so that is the target.
    return { sets: Number(range[1]), warning: `"${text}" sets — targeting ${range[1]}` };
  }
  const n = text.match(/(\d+)/);
  if (!n) return { sets: 3, warning: `could not read sets "${text}" — used 3` };
  return { sets: Math.max(1, Number(n[1])) };
}

export function parseRest(raw: string, fallback: number): { seconds: number; warning?: string } {
  const text = raw.trim();
  if (!text) return { seconds: fallback };
  const clock = text.match(/^(\d+):(\d{1,2})$/);
  if (clock) return { seconds: Number(clock[1]) * 60 + Number(clock[2]) };
  const value = text.match(/(\d+(?:\.\d+)?)/);
  if (!value) return { seconds: fallback, warning: `could not read rest "${text}"` };
  const n = Number(value[1]);
  if (/\b(m|min|mins|minute|minutes)\b/i.test(text)) return { seconds: Math.round(n * 60) };
  return { seconds: Math.round(n) };
}

export function parseWeight(raw: string): { weight?: number; mode: WeightMode } {
  const text = raw.trim();
  if (!text) return { mode: 'external' };
  if (/^(bw|body\s*weight|bodyweight|none|-|n\/a)$/i.test(text)) {
    return { mode: 'bodyweight' };
  }
  const value = text.match(/(\d+(?:\.\d+)?)/);
  if (!value) return { mode: 'external' };
  const weight = Number(value[1]);
  if (/bw|body\s*weight/i.test(text)) return { weight, mode: 'bodyweight-plus' };
  return { weight, mode: 'external' };
}

// ---------------------------------------------------------------------------
// Matching against the library
// ---------------------------------------------------------------------------

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(s|es)\b/g, ' ')
    .trim()
    .replace(/s\b/g, '');
}

function words(name: string): Set<string> {
  return new Set(normalizeName(name).split(' ').filter(Boolean));
}

function sameWords(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((word) => b.has(word));
}

/**
 * Exact on the name or an alias, ignoring case, punctuation, plurals and word
 * order. Deliberately NOT a substring match: "Zercher Good Morning" is a
 * different movement from "Good Morning", and quietly filing one under the
 * other would attach your history to the wrong lift. An unmatched name becomes
 * a stub and the parser says so, which is recoverable; a wrong match is not.
 */
export function matchExercise(name: string, library: Exercise[]): Exercise | undefined {
  const wanted = normalizeName(name);
  if (!wanted) return undefined;
  const wantedWords = words(name);
  return (
    library.find((e) => normalizeName(e.name) === wanted) ??
    library.find((e) => (e.aliases ?? []).some((a) => normalizeName(a) === wanted)) ??
    library.find(
      (e) =>
        sameWords(wantedWords, words(e.name)) ||
        (e.aliases ?? []).some((a) => sameWords(wantedWords, words(a))),
    )
  );
}

function stubExercise(name: string): Exercise {
  return {
    id: slugId('custom', name) || newId('custom'),
    name: name.trim(),
    muscleGroups: ['full-body'],
    equipment: 'other',
    movementClass: 'isolation',
    cues: [],
    custom: true,
  };
}

// ---------------------------------------------------------------------------
// The parse
// ---------------------------------------------------------------------------

interface Row {
  phase: string;
  weeks?: number;
  day: string;
  group: string;
  exercise: string;
  sets: string;
  reps: string;
  rest: string;
  weight: string;
  notes: string;
}

export function parseProgramTable(
  text: string,
  library: Exercise[],
  programName = 'Uploaded program',
): ParseResult {
  const rows = splitTable(text);
  const warnings: string[] = [];

  if (rows.length < 2) {
    throw new Error('Need a header row and at least one exercise row.');
  }

  const columns = mapHeaders(rows[0]);
  if (columns.exercise === undefined) {
    throw new Error(
      'No Exercise column found. Expected a header row with at least Day, Exercise, Sets and Reps.',
    );
  }
  for (const needed of ['day', 'sets', 'reps'] as const) {
    if (columns[needed] === undefined) {
      warnings.push(`No ${needed} column — defaults used for every row.`);
    }
  }

  const cell = (row: string[], column: Column) => {
    const index = columns[column];
    return index === undefined ? '' : (row[index] ?? '').trim();
  };

  const parsed: Row[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = cell(row, 'exercise');
    if (!name) continue;
    const weeksRaw = cell(row, 'weeks');
    parsed.push({
      phase: cell(row, 'phase') || 'Program',
      weeks: weeksRaw ? Number(weeksRaw.match(/\d+/)?.[0]) || undefined : undefined,
      day: cell(row, 'day') || 'Day 1',
      group: cell(row, 'group'),
      exercise: name,
      sets: cell(row, 'sets'),
      reps: cell(row, 'reps'),
      rest: cell(row, 'rest'),
      weight: cell(row, 'weight'),
      notes: cell(row, 'notes'),
    });
  }

  if (parsed.length === 0) {
    throw new Error('No exercise rows found under that header.');
  }

  const createdExercises: Exercise[] = [];
  const resolve = (name: string): Exercise => {
    const found = matchExercise(name, [...library, ...createdExercises]);
    if (found) return found;
    const stub = stubExercise(name);
    createdExercises.push(stub);
    return stub;
  };

  // Phase -> Day -> rows, preserving the order they appear in the table.
  const phaseOrder: string[] = [];
  const byPhase = new Map<string, Map<string, Row[]>>();
  for (const row of parsed) {
    if (!byPhase.has(row.phase)) {
      byPhase.set(row.phase, new Map());
      phaseOrder.push(row.phase);
    }
    const days = byPhase.get(row.phase)!;
    if (!days.has(row.day)) days.set(row.day, []);
    days.get(row.day)!.push(row);
  }

  const programId = newId('program');
  const phases: Phase[] = phaseOrder.map((phaseName, phaseIndex) => {
    const days = byPhase.get(phaseName)!;
    const declaredWeeks = parsed.find((r) => r.phase === phaseName && r.weeks)?.weeks;

    const workouts: Workout[] = [...days.entries()].map(([dayName, dayRows]) => {
      const blocks: Block[] = [];
      let current: { group: string; exercises: ProgramExercise[] } | null = null;

      dayRows.forEach((row, rowIndex) => {
        const exercise = resolve(row.exercise);
        const { sets, warning: setWarning } = parseSets(row.sets);
        const { target, warning: repWarning } = parseReps(row.reps);
        const { seconds, warning: restWarning } = parseRest(row.rest, 60);
        const { weight, mode } = parseWeight(row.weight);

        const where = `${dayName} / ${row.exercise}`;
        if (setWarning) warnings.push(`${where}: ${setWarning}`);
        if (repWarning) warnings.push(`${where}: ${repWarning}`);
        if (restWarning) warnings.push(`${where}: ${restWarning}`);

        const programExercise: ProgramExercise = {
          id: newId('pe'),
          exerciseId: exercise.id,
          sets,
          reps: target,
          restSeconds: seconds,
          startingWeight: weight,
          weightMode:
            mode === 'external' && (exercise.equipment === 'bodyweight' || exercise.equipment === 'suspension')
              ? 'bodyweight'
              : mode,
          note: row.notes || undefined,
        };

        const group = row.group.trim();
        // Consecutive rows sharing a group value (including no group at all)
        // belong to one block.
        if (!current || current.group !== group) {
          current = { group, exercises: [] };
          blocks.push({
            id: newId('block'),
            kind: group ? (/circuit|round/i.test(group) ? 'circuit' : 'superset') : 'straight',
            label: group || undefined,
            rounds: group && /circuit|round/i.test(group) ? sets : undefined,
            restBetweenExercises: group ? 0 : undefined,
            restAfterRound: group ? seconds : undefined,
            exercises: current.exercises,
          });
        }
        current.exercises.push(programExercise);
        void rowIndex;
      });

      return {
        id: newId('workout'),
        name: dayName,
        kind: 'fixed' as const,
        blocks,
        optional: /optional/i.test(dayName) || undefined,
      };
    });

    if (!declaredWeeks && phaseIndex === 0) {
      warnings.push(
        `No Weeks column — each phase is set to run ${DEFAULT_PHASE_WEEKS} weeks. Change it in the program builder.`,
      );
    }

    return {
      id: newId('phase'),
      name: phaseName,
      weeks: declaredWeeks ?? DEFAULT_PHASE_WEEKS,
      workouts,
    };
  });

  if (createdExercises.length > 0) {
    warnings.push(
      `${createdExercises.length} movement${createdExercises.length === 1 ? ' was' : 's were'} not in the library ` +
        `and ${createdExercises.length === 1 ? 'was' : 'were'} added as stubs: ` +
        `${createdExercises.map((e) => e.name).join(', ')}. ` +
        'Give them equipment and cues in the exercise library so the coaching suggests the right jump.',
    );
  }

  const now = Date.now();
  return {
    program: {
      id: programId,
      name: programName,
      source: 'Uploaded table',
      phases,
      createdAt: now,
      updatedAt: now,
    },
    createdExercises,
    warnings,
    rowCount: parsed.length,
  };
}
