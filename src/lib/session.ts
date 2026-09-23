/**
 * Flattening a workout into the order you actually perform it.
 *
 * Straight sets run down the list a movement at a time. A superset alternates.
 * A circuit runs a round of everything and then repeats. All three come out as
 * one ordered queue of slots, which is what the logging screen walks.
 */

import type { Block, Exercise, LoggedSet, ProgramExercise } from '../types';

export interface SetSlot {
  /** Stable within a session: block + exercise + round + set. */
  key: string;
  blockId: string;
  blockKind: Block['kind'];
  blockLabel?: string;
  programExercise: ProgramExercise;
  exercise: Exercise;
  /** Circuits and supersets: which time through. */
  round?: number;
  totalRounds?: number;
  /** Which set of this movement it is within the session, 1-based. */
  setNumber: number;
  totalSets: number;
  /** Seconds to rest after this slot. */
  restSeconds: number;
  /** The last movement of a circuit round — the real rest comes after this. */
  endsRound: boolean;
}

export function buildSetSlots(
  blocks: Block[],
  exerciseById: Map<string, Exercise>,
): SetSlot[] {
  const slots: SetSlot[] = [];

  for (const block of blocks) {
    const rounds =
      block.kind === 'straight' ? 1 : Math.max(1, block.rounds ?? maxSets(block));
    const perExerciseCount = new Map<string, number>();

    if (block.kind === 'straight') {
      for (const pe of block.exercises) {
        const exercise = exerciseById.get(pe.exerciseId);
        if (!exercise) continue;
        for (let set = 1; set <= pe.sets; set++) {
          slots.push({
            key: `${block.id}:${pe.id}:${set}`,
            blockId: block.id,
            blockKind: block.kind,
            blockLabel: block.label,
            programExercise: pe,
            exercise,
            setNumber: set,
            totalSets: pe.sets,
            restSeconds: pe.restSeconds,
            endsRound: set === pe.sets,
          });
        }
      }
      continue;
    }

    for (let round = 1; round <= rounds; round++) {
      block.exercises.forEach((pe, index) => {
        const exercise = exerciseById.get(pe.exerciseId);
        if (!exercise) return;
        // A superset written as "3 x 8-10" means three times through the pair.
        if (block.kind === 'superset' && round > pe.sets) return;
        const done = (perExerciseCount.get(pe.id) ?? 0) + 1;
        perExerciseCount.set(pe.id, done);
        const last = index === block.exercises.length - 1;
        slots.push({
          key: `${block.id}:${pe.id}:${round}`,
          blockId: block.id,
          blockKind: block.kind,
          blockLabel: block.label,
          programExercise: pe,
          exercise,
          round,
          totalRounds: rounds,
          setNumber: done,
          totalSets: block.kind === 'circuit' ? rounds * pe.sets : pe.sets,
          restSeconds: last
            ? block.restAfterRound ?? pe.restSeconds
            : block.restBetweenExercises ?? 0,
          endsRound: last,
        });
      });
    }
  }

  return slots;
}

function maxSets(block: Block): number {
  return block.exercises.reduce((most, pe) => Math.max(most, pe.sets), 1);
}

/** The set already logged for a slot, if there is one. */
export function findLoggedSet(sets: LoggedSet[], slot: SetSlot): LoggedSet | undefined {
  return sets.find(
    (s) =>
      s.programExerciseId === slot.programExercise.id &&
      s.setNumber === slot.setNumber &&
      (slot.round == null || s.round === slot.round),
  );
}

export interface SessionTally {
  logged: number;
  total: number;
  /** Working sets that hit the target — the "as prescribed" count. */
  onTarget: number;
}

export function tallySession(slots: SetSlot[], sets: LoggedSet[]): SessionTally {
  let logged = 0;
  let onTarget = 0;
  for (const slot of slots) {
    const set = findLoggedSet(sets, slot);
    if (!set) continue;
    logged++;
    const target = slot.programExercise.reps;
    const goal =
      target.type === 'timed'
        ? target.seconds
        : target.type === 'range'
          ? target.max ?? target.min
          : target.min;
    const done = target.type === 'timed' ? set.holdSeconds : set.reps;
    if (goal != null && done != null && done >= goal && set.goodForm) onTarget++;
  }
  return { logged, total: slots.length, onTarget };
}

/** "3 x 8-10", "4 rounds of 10", "1 minute". */
export function describeTarget(pe: ProgramExercise, blockKind?: Block['kind']): string {
  const t = pe.reps;
  const side = t.perSide ? ' each side' : '';
  const body = (() => {
    switch (t.type) {
      case 'range':
        return `${t.min}-${t.max} reps${side}`;
      case 'fixed':
        return `${t.min} reps${side}`;
      case 'timed':
        return t.seconds && t.seconds >= 60 && t.seconds % 60 === 0
          ? `${t.seconds / 60} minute${t.seconds === 60 ? '' : 's'}${side}`
          : `${t.seconds}s hold${side}`;
      case 'amrap':
        return t.min ? `AMRAP (${t.min}+)${side}` : `AMRAP${side}`;
      case 'failure':
        return `to failure${side}`;
    }
  })();
  if (blockKind === 'circuit') return body;
  return pe.sets > 1 ? `${pe.sets} × ${body}` : body;
}
