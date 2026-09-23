/**
 * Progressive-overload coaching.
 *
 * Everything here is pure: logged sets in, a recommendation out. The streak is
 * never stored — it is recomputed from the logs every time, so it cannot drift
 * away from what actually happened.
 *
 * The rule, as specced:
 *
 *  1. A movement has a target rep scheme and a target set count.
 *  2. A session QUALIFIES when the required working sets reach the qualifying
 *     rep threshold with good form.
 *  3. After `requiredStreak` qualifying sessions in a row AT THE SAME WEIGHT,
 *     the movement is flagged ready to progress.
 *  4. The suggested jump depends on the movement and the equipment.
 *  5. After an increase reps drop back toward the bottom of the range. That is
 *     expected, so the streak simply restarts at the new weight — which happens
 *     on its own here, because a streak only counts sessions at one weight.
 *  6. The user can accept, delay or override. Delaying records a deferral, which
 *     clears as soon as a *new* qualifying session lands.
 *
 * Double progression and the 2-for-2 rule are combined into one default the way
 * the spec asks for: with a rep RANGE, the top of the range is the signal (hit
 * 3x12 of 8-12 and you have earned the jump); with a FIXED rep goal there is no
 * top to reach, so the 2-for-2 rule supplies one — the goal plus two reps.
 */

import type {
  Exercise,
  ID,
  LoggedSet,
  ProgramExercise,
  ProgressionConfig,
  ProgressionState,
  RepTarget,
  Settings,
} from '../types';
import { nextLadderSize, roundToIncrement } from './units';

export const DEFAULT_PROGRESSION: ProgressionConfig = {
  requiredStreak: 2,
  mode: 'both',
  twoForTwoBonus: 2,
};

/** Weights within this much of each other count as the same working weight. */
const WEIGHT_EPSILON = 0.001;

// ---------------------------------------------------------------------------
// Rep thresholds
// ---------------------------------------------------------------------------

export interface RepThreshold {
  /** Reps (or seconds, for a timed hold) a set must reach to count. */
  value: number;
  unit: 'reps' | 'seconds';
  /** Why that number, in words — shown to the user so the rule is legible. */
  explanation: string;
}

/**
 * The number a set has to reach for the session to qualify, or null when the
 * rep scheme cannot be judged automatically (AMRAP with no floor, to-failure).
 */
export function qualifyingThreshold(
  target: RepTarget,
  config: ProgressionConfig,
): RepThreshold | null {
  const bonus = config.twoForTwoBonus;

  switch (target.type) {
    case 'range': {
      const top = target.max ?? target.min;
      if (top == null) return null;
      // Double progression: the top of the range is the signal. Forcing the
      // 2-for-2 rule on a range means overshooting a window you were told to
      // stay inside, so only do it when explicitly asked.
      const value = config.mode === 'two-for-two' ? top + bonus : top;
      return {
        value,
        unit: 'reps',
        explanation:
          config.mode === 'two-for-two'
            ? `${top} + ${bonus} reps (2-for-2 rule)`
            : `top of the ${target.min}-${top} range`,
      };
    }
    case 'fixed': {
      const goal = target.min;
      if (goal == null) return null;
      // No range to top out, so the 2-for-2 rule supplies the threshold.
      const value = config.mode === 'double' ? goal : goal + bonus;
      return {
        value,
        unit: 'reps',
        explanation:
          config.mode === 'double'
            ? `${goal} reps as prescribed`
            : `${goal} + ${bonus} reps (2-for-2 rule)`,
      };
    }
    case 'timed': {
      const seconds = target.seconds;
      if (seconds == null) return null;
      return {
        value: seconds,
        unit: 'seconds',
        explanation: `${seconds}s hold`,
      };
    }
    case 'amrap': {
      // AMRAP with a stated floor can still be judged; a bare AMRAP cannot.
      if (target.min == null) return null;
      return {
        value: target.min + bonus,
        unit: 'reps',
        explanation: `${target.min} + ${bonus} reps (2-for-2 rule)`,
      };
    }
    case 'failure':
      // You were told to go to failure. There is no number to beat.
      return null;
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface SessionSets {
  sessionId: ID;
  /** Sort key — sessions must arrive oldest first. */
  completedAt: number;
  date: string;
  sets: LoggedSet[];
}

export interface SessionVerdict {
  sessionId: ID;
  date: string;
  /** The weight the session was worked at, or undefined for unloaded work. */
  weight?: number;
  qualifies: boolean;
  /** Working sets that reached the threshold with good form. */
  setsAtThreshold: number;
  workingSets: number;
  /** Best rep (or second) count of the session. */
  best?: number;
  reason: string;
}

/**
 * The weight a session was worked at: the LOWEST weight across its working sets.
 * If the last set had to be dropped, the movement has not been owned at the
 * higher weight yet, so the lower number is the honest one.
 */
function sessionWeight(sets: LoggedSet[]): number | undefined {
  const weights = sets
    .map((s) => s.weight)
    .filter((w): w is number => typeof w === 'number');
  if (weights.length === 0) return undefined;
  return Math.min(...weights);
}

function achieved(set: LoggedSet, unit: 'reps' | 'seconds'): number | undefined {
  return unit === 'seconds' ? set.holdSeconds : set.reps;
}

/** Judge one session's worth of sets for a single movement. */
export function judgeSession(
  session: SessionSets,
  target: RepTarget,
  targetSets: number,
  config: ProgressionConfig,
): SessionVerdict {
  const threshold = qualifyingThreshold(target, config);
  const workingSets = session.sets;
  const weight = sessionWeight(workingSets);

  const base = {
    sessionId: session.sessionId,
    date: session.date,
    weight,
    workingSets: workingSets.length,
  };

  if (workingSets.length === 0) {
    return { ...base, qualifies: false, setsAtThreshold: 0, reason: 'nothing logged' };
  }

  if (!threshold) {
    const best = Math.max(
      ...workingSets.map((s) => s.reps ?? s.holdSeconds ?? 0),
    );
    return {
      ...base,
      qualifies: false,
      setsAtThreshold: 0,
      best,
      reason:
        target.type === 'failure'
          ? 'taken to failure — judged by feel, not by the app'
          : 'open-ended rep target — no threshold to check',
    };
  }

  const required = Math.min(config.requiredSets ?? targetSets, targetSets);
  const setsAtThreshold = workingSets.filter((s) => {
    const done = achieved(s, threshold.unit);
    return s.goodForm && done != null && done >= threshold.value;
  }).length;

  const best = Math.max(
    ...workingSets.map((s) => achieved(s, threshold.unit) ?? 0),
  );

  const qualifies = setsAtThreshold >= required;
  const label = threshold.unit === 'seconds' ? 's' : ' reps';

  return {
    ...base,
    qualifies,
    setsAtThreshold,
    best,
    reason: qualifies
      ? `${setsAtThreshold}/${required} sets at ${threshold.value}${label}`
      : `${setsAtThreshold}/${required} sets at ${threshold.value}${label} — short of the mark`,
  };
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

export interface StreakResult {
  /** Consecutive qualifying sessions at the current working weight. */
  streak: number;
  /** The weight those sessions were worked at. */
  weight?: number;
  verdicts: SessionVerdict[];
  /** True when the most recent session was worked heavier than the one before. */
  justIncreased: boolean;
}

/**
 * Walk backwards from the most recent session, counting qualifying sessions
 * until one falls short or the weight changes. A weight change ends the streak
 * by definition — which is what makes rule 5 (reps drop after a jump, and that
 * is fine) fall out for free.
 */
export function computeStreak(
  sessions: SessionSets[],
  target: RepTarget,
  targetSets: number,
  config: ProgressionConfig,
): StreakResult {
  const ordered = [...sessions].sort((a, b) => a.completedAt - b.completedAt);
  const verdicts = ordered.map((s) => judgeSession(s, target, targetSets, config));

  if (verdicts.length === 0) {
    return { streak: 0, weight: undefined, verdicts, justIncreased: false };
  }

  const latest = verdicts[verdicts.length - 1];
  const reference = latest.weight;

  let streak = 0;
  for (let i = verdicts.length - 1; i >= 0; i--) {
    const v = verdicts[i];
    const sameWeight =
      reference == null
        ? v.weight == null
        : v.weight != null && Math.abs(v.weight - reference) < WEIGHT_EPSILON;
    if (!sameWeight || !v.qualifies) break;
    streak++;
  }

  const previous = verdicts.length >= 2 ? verdicts[verdicts.length - 2] : undefined;
  const justIncreased =
    reference != null &&
    previous?.weight != null &&
    reference - previous.weight > WEIGHT_EPSILON;

  return { streak, weight: reference, verdicts, justIncreased };
}

// ---------------------------------------------------------------------------
// The jump
// ---------------------------------------------------------------------------

export type RecommendationKind =
  | 'add-weight'
  | 'next-dumbbell'
  | 'add-reps'
  | 'harder-variant';

export interface Recommendation {
  kind: RecommendationKind;
  currentWeight?: number;
  /** What to load next time. Absent for unloaded progressions. */
  suggestedWeight?: number;
  /** The band the suggestion came from, for the "why". */
  rangeLow?: number;
  rangeHigh?: number;
  headline: string;
  detail: string;
}

/** Which increment band a movement falls in, per the spec's two buckets. */
function incrementBand(exercise: Exercise): {
  low: number;
  high: number;
  pct: number;
  step: number;
  label: string;
} {
  const isBig =
    exercise.movementClass === 'compound-lower' ||
    exercise.movementClass === 'compound-upper';
  return isBig
    ? { low: 5, high: 10, pct: 0.05, step: 5, label: 'compound movement' }
    : { low: 2.5, high: 5, pct: 0.05, step: 2.5, label: 'upper-body / smaller movement' };
}

export function suggestIncrease(
  exercise: Exercise,
  programExercise: ProgramExercise,
  currentWeight: number | undefined,
  settings: Settings,
  state?: ProgressionState,
): Recommendation {
  const unit = settings.units;

  // Bodyweight-only: there is no plate to add.
  if (programExercise.weightMode === 'bodyweight' || exercise.equipment === 'bodyweight' || exercise.equipment === 'suspension') {
    const variants = exercise.progressionVariants ?? [];
    const current = state?.currentVariant;
    const nextVariant = current
      ? variants[variants.indexOf(current) + 1]
      : variants[0];

    if (nextVariant) {
      return {
        kind: 'harder-variant',
        headline: `Move up to ${nextVariant}`,
        detail:
          'Bodyweight movement — progress by making the movement harder rather than by loading it. ' +
          'Adding reps or a band or vest works too if you would rather stay on this variation.',
      };
    }
    return {
      kind: 'add-reps',
      headline: 'Add reps, resistance, or a harder variation',
      detail:
        'Bodyweight movement — there is no weight to add. Push the rep target up, ' +
        'add a band or a vest, or move to a harder variation.',
    };
  }

  // Dumbbells (and kettlebells) come in fixed sizes; the jump is whatever the
  // rack offers next, not a tidy percentage.
  if (exercise.equipment === 'dumbbell' || exercise.equipment === 'kettlebell') {
    const next = nextLadderSize(currentWeight, settings.dumbbellLadder);
    const noun = exercise.equipment === 'dumbbell' ? 'dumbbell' : 'kettlebell';
    if (next == null) {
      return {
        kind: 'add-reps',
        headline: `Past the top of the ${noun} rack`,
        detail:
          `No heavier ${noun} is listed in your settings. Add reps or sets, slow the ` +
          'tempo, or switch to a loaded variation.',
      };
    }
    return {
      kind: 'next-dumbbell',
      currentWeight,
      suggestedWeight: next,
      headline:
        currentWeight == null
          ? `Start at ${next} ${unit}`
          : `Go up to the ${next} ${unit} ${noun}s`,
      detail:
        `Fixed-size equipment, so the jump is the next size on the rack` +
        (currentWeight != null ? ` (${currentWeight} → ${next} ${unit}).` : '.'),
    };
  }

  // Loaded movements: a percentage of the working weight, rounded to something
  // the gym can actually make, clamped to the band for the movement.
  const band = incrementBand(exercise);
  if (currentWeight == null) {
    return {
      kind: 'add-weight',
      rangeLow: band.low,
      rangeHigh: band.high,
      headline: `Add ${band.low}-${band.high} ${unit}`,
      detail: `No working weight recorded yet — log one and the suggestion sharpens up.`,
    };
  }

  const step = Math.max(band.step, settings.smallestIncrement);
  const raw = currentWeight * band.pct;
  const rounded = roundToIncrement(raw, step);
  const delta = Math.min(Math.max(rounded, band.low), band.high);
  const suggested = currentWeight + delta;

  return {
    kind: 'add-weight',
    currentWeight,
    suggestedWeight: suggested,
    rangeLow: band.low,
    rangeHigh: band.high,
    headline: `Go to ${suggested} ${unit}`,
    detail:
      `+${delta} ${unit} on ${currentWeight} — about ${Math.round(band.pct * 100)}% for a ` +
      `${band.label}, which the spec puts at ${band.low}-${band.high} ${unit}.`,
  };
}

// ---------------------------------------------------------------------------
// The whole picture for one movement
// ---------------------------------------------------------------------------

export type ProgressionStatus =
  /** Nothing logged yet. */
  | 'no-data'
  /** Logged, but the rep scheme cannot be judged automatically. */
  | 'not-tracked'
  /** Building a streak. */
  | 'building'
  /** Streak met — add weight. */
  | 'ready'
  /** Streak met but the user asked to hold off. */
  | 'deferred'
  /** Streak met and the jump was accepted; it lands next session. */
  | 'accepted'
  /** Weight went up last session; reps are expected to be down. */
  | 'settling';

export interface MovementProgress {
  exerciseId: ID;
  status: ProgressionStatus;
  streak: number;
  requiredStreak: number;
  workingWeight?: number;
  threshold: RepThreshold | null;
  verdicts: SessionVerdict[];
  recommendation?: Recommendation;
  /** One line explaining the status, for the card. */
  summary: string;
}

export function resolveConfig(
  settings: Settings,
  programExercise?: ProgramExercise,
  state?: ProgressionState,
): ProgressionConfig {
  return {
    ...DEFAULT_PROGRESSION,
    ...settings.defaultProgression,
    ...state?.config,
    ...programExercise?.progression,
  };
}

export function evaluateMovement(args: {
  exercise: Exercise;
  programExercise: ProgramExercise;
  sessions: SessionSets[];
  settings: Settings;
  state?: ProgressionState;
}): MovementProgress {
  const { exercise, programExercise, sessions, settings, state } = args;
  const config = resolveConfig(settings, programExercise, state);
  const target = programExercise.reps;
  const threshold = qualifyingThreshold(target, config);

  const { streak, weight, verdicts, justIncreased } = computeStreak(
    sessions,
    target,
    programExercise.sets,
    config,
  );

  const workingWeight = weight ?? state?.workingWeight ?? programExercise.startingWeight;

  const base = {
    exerciseId: exercise.id,
    streak,
    requiredStreak: config.requiredStreak,
    workingWeight,
    threshold,
    verdicts,
  };

  if (sessions.length === 0) {
    return {
      ...base,
      status: 'no-data',
      summary: 'No sessions logged yet.',
    };
  }

  if (!threshold) {
    return {
      ...base,
      status: 'not-tracked',
      summary:
        target.type === 'failure'
          ? 'Taken to failure — progression is your call on this one.'
          : 'Open-ended rep target — the app tracks it but will not flag a jump.',
    };
  }

  const latest = verdicts[verdicts.length - 1];
  const deferred =
    state?.deferredAfterSessionId != null &&
    state.deferredAfterSessionId === latest.sessionId;
  const accepted =
    state?.acceptedAfterSessionId != null &&
    state.acceptedAfterSessionId === latest.sessionId;

  if (streak >= config.requiredStreak) {
    const recommendation = suggestIncrease(
      exercise,
      programExercise,
      workingWeight,
      settings,
      state,
    );
    if (accepted) {
      return {
        ...base,
        status: 'accepted',
        recommendation,
        summary: recommendation.suggestedWeight != null
          ? `Jump taken — ${recommendation.suggestedWeight} ${settings.units} is loaded for next time.`
          : 'Jump taken — it lands next session.',
      };
    }
    if (deferred) {
      return {
        ...base,
        status: 'deferred',
        recommendation,
        summary: `Ready, but you asked to hold at ${workingWeight ?? 'this weight'}.`,
      };
    }
    return {
      ...base,
      status: 'ready',
      recommendation,
      summary: `${streak} qualifying sessions in a row — ${recommendation.headline.toLowerCase()}.`,
    };
  }

  if (justIncreased && !latest.qualifies) {
    return {
      ...base,
      status: 'settling',
      summary:
        `Weight just went up. Reps dropping back toward the bottom of the range is ` +
        `expected — build back up from here.`,
    };
  }

  const need = config.requiredStreak - streak;
  return {
    ...base,
    status: 'building',
    summary:
      streak === 0
        ? `Last session: ${latest.reason}.`
        : `${streak} qualifying session${streak === 1 ? '' : 's'} — ${need} more to earn the jump.`,
  };
}
