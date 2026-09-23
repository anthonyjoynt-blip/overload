/**
 * Data model for the tracker.
 *
 * The spec's table (Exercise / Program / Day / ProgramExercise / ScheduledSession /
 * LoggedSet / ProgressionState) is the spine. Three additions come from the source
 * programs rather than from the spec:
 *
 *  - Phase sits between Program and Day. MAPS programs run 3-week phases, each with
 *    its own set/rep scheme and rest period, and the spec's addendum asks for a
 *    week-type sequence (normal / failure / deload) that has to live somewhere.
 *  - Block sits between Day and ProgramExercise, so a superset or a circuit
 *    ("repeat 4 times, no rest between exercises") is a real thing rather than a note.
 *  - RepTarget replaces a plain rep number, covering ranges, AMRAP, timed holds,
 *    to-failure sets and "each side".
 */

export type ID = string;
/** Calendar date, YYYY-MM-DD, always local — never a Date or an epoch. */
export type DateKey = string;

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'suspension'
  | 'band'
  | 'other';

/**
 * Drives the suggested jump size. Upper/isolation work gets the small increment,
 * lower/compound work the large one (see lib/progression.ts).
 */
export type MovementClass =
  | 'compound-lower'
  | 'compound-upper'
  | 'isolation'
  | 'core';

export type MuscleGroup =
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'full-body';

export interface ExerciseMedia {
  /** A single still, an ordered image sequence, or a short clip. */
  kind: 'image' | 'sequence' | 'clip';
  src: string[];
  attribution?: string;
}

export interface Exercise {
  id: ID;
  name: string;
  aliases?: string[];
  muscleGroups: MuscleGroup[];
  equipment: Equipment;
  movementClass: MovementClass;
  /** One limb at a time — reps are counted per side. */
  unilateral?: boolean;
  /** Form cues, shown mid-workout. Kept short enough to read between sets. */
  cues: string[];
  /** What usually goes wrong. */
  faults?: string[];
  setup?: string;
  media?: ExerciseMedia;
  /**
   * Harder variants, in ascending order. For bodyweight movements the app
   * recommends one of these instead of "add weight".
   */
  progressionVariants?: string[];
  /** User-created rather than seeded. */
  custom?: boolean;
}

// ---------------------------------------------------------------------------
// Rep targets
// ---------------------------------------------------------------------------

export type RepTargetType =
  /** A single number: 10 reps. */
  | 'fixed'
  /** A window: 8-12 reps. The basis of double progression. */
  | 'range'
  /** As many reps as possible. */
  | 'amrap'
  /** Held for time: a plank, a 5-second squeeze. */
  | 'timed'
  /** Taken to complete failure, rep count incidental. */
  | 'failure';

export interface RepTarget {
  type: RepTargetType;
  /** fixed: the number. range: the bottom. */
  min?: number;
  /** range: the top — the number double progression watches. */
  max?: number;
  /** timed: seconds to hold. */
  seconds?: number;
  /** Reps are per side, so a "set" is really two. */
  perSide?: boolean;
  /** e.g. "3 second squeeze at top", "+ partials after". */
  note?: string;
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

export type WeightMode =
  /** Weight is loaded externally and is what progresses. */
  | 'external'
  /** Bodyweight only — progress by reps, added resistance or a harder variant. */
  | 'bodyweight'
  /** Bodyweight plus optional added load (weighted dips, vest). */
  | 'bodyweight-plus';

export interface ProgressionConfig {
  /** Qualifying sessions in a row before the app flags a jump. Spec default: 2. */
  requiredStreak: number;
  /**
   * Working sets that must hit the top of the range for the session to qualify.
   * Undefined means all of them.
   */
  requiredSets?: number;
  /**
   * double     — every working set at the top of the range.
   * two-for-two — the 2-for-2 rule: 2+ reps past the goal.
   * both       — either one qualifies the session (the spec's combined default).
   */
  mode: 'double' | 'two-for-two' | 'both';
  /** How far past the goal the 2-for-2 rule needs. Default 2. */
  twoForTwoBonus: number;
}

export interface ProgramExercise {
  id: ID;
  exerciseId: ID;
  sets: number;
  reps: RepTarget;
  restSeconds: number;
  /** lb (or kg, per settings). Undefined until the first session sets it. */
  startingWeight?: number;
  weightMode: WeightMode;
  note?: string;
  /** Prescribed but not required — do it if you have the time and the energy. */
  optional?: boolean;
  /** Per-movement override of the user's default progression rule. */
  progression?: Partial<ProgressionConfig>;
}

export type BlockKind =
  /** Sets of one movement, then the next movement. */
  | 'straight'
  /** Alternated back to back, rest after the pair. */
  | 'superset'
  /** A round of every movement with no rest, rest after the round. */
  | 'circuit';

export interface Block {
  id: ID;
  kind: BlockKind;
  label?: string;
  /** circuit: "repeat 4 times". */
  rounds?: number;
  /** circuit/superset: usually 0. */
  restBetweenExercises?: number;
  /** circuit/superset: the real rest, taken after a full round. */
  restAfterRound?: number;
  exercises: ProgramExercise[];
}

export type WeekType = 'normal' | 'failure' | 'deload';

export interface OpenSlotConstraints {
  /** "Abs or glutes", "a weak point", "upper body". */
  focus?: string;
  durationCapMinutes?: number;
  setCap?: number;
  repScheme?: RepTarget;
  restSeconds?: number;
  guidance?: string;
}

/**
 * The spec's "Day". Named Workout because MAPS programs number workouts inside a
 * phase rather than naming weekdays, and the calendar maps them onto dates.
 */
export interface Workout {
  id: ID;
  name: string;
  kind:
    /** A fixed list of movements, set in the builder. */
    | 'fixed'
    /** A slot on the calendar; the movements are chosen when logging. */
    | 'open'
    /** Pick one of several prepared workouts (MAPS: "Abs or Butt"). */
    | 'choice';
  optional?: boolean;
  /** Only scheduled on these week types. Undefined means every week. */
  weekTypes?: WeekType[];
  blocks: Block[];
  open?: OpenSlotConstraints;
  /** kind === 'choice': the alternatives. Each carries its own blocks. */
  options?: Workout[];
  notes?: string;
}

export interface Phase {
  id: ID;
  name: string;
  weeks: number;
  objective?: string;
  whatToExpect?: string;
  setRepSummary?: string;
  restSummary?: string;
  /**
   * Week types in order, indexed by week within the phase and cycled if shorter.
   * Undefined means every week is 'normal'.
   */
  weekTypes?: WeekType[];
  /** In rotation order: workout 1, workout 2, ... */
  workouts: Workout[];
}

export interface Program {
  id: ID;
  name: string;
  description?: string;
  /** Where it came from: "MAPS 15 Minutes", "pasted table", "built here". */
  source?: string;
  phases: Phase[];
  createdAt: number;
  updatedAt: number;
  /** Retired programs keep their history but leave the active list. */
  retired?: boolean;
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface Schedule {
  id: ID;
  programId: ID;
  startDate: DateKey;
  mode:
    /** Train on chosen weekdays, taking workouts in rotation. */
    | 'weekdays'
    /** N days on, M days off, regardless of weekday. */
    | 'rotation';
  weekdays?: number[];
  rotationDaysOn?: number;
  rotationDaysOff?: number;
  includeOptional: boolean;
  active: boolean;
  createdAt: number;
}

export type SessionStatus = 'upcoming' | 'done' | 'skipped';

export interface ScheduledSession {
  id: ID;
  date: DateKey;
  scheduleId: ID;
  programId: ID;
  phaseId: ID;
  workoutId: ID;
  /** kind === 'choice': which option was taken. */
  chosenOptionId?: ID;
  weekType: WeekType;
  status: SessionStatus;
  /** Week number within the phase, 1-based — for display. */
  phaseWeek: number;
  /** Set when the user drags a session to another date. */
  movedFrom?: DateKey;
  /**
   * Movements chosen while logging rather than while building: everything in an
   * open-slot session, plus anything added on the fly to a fixed one. They are
   * real prescriptions, so the progression rule judges them like any other.
   */
  adHocBlocks?: Block[];
  startedAt?: number;
  completedAt?: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export interface LoggedSet {
  id: ID;
  sessionId: ID;
  exerciseId: ID;
  /** Absent for sets added ad hoc or logged into an open slot. */
  programExerciseId?: ID;
  blockId?: ID;
  /** Circuit round this set belongs to, 1-based. */
  round?: number;
  setNumber: number;
  /** Added load. Absent for unloaded bodyweight work. */
  weight?: number;
  reps?: number;
  holdSeconds?: number;
  reachedFailure?: boolean;
  /** The user's own call on whether the set was clean. Gates progression. */
  goodForm: boolean;
  rpe?: number;
  note?: string;
  timestamp: number;
}

/**
 * What the app remembers per movement. The streak itself is *derived* from the
 * logs (see lib/progression.ts) so it can never drift out of sync; this record
 * holds only what the logs cannot say — the current working weight and the
 * user's answer to a recommendation.
 */
export interface ProgressionState {
  exerciseId: ID;
  workingWeight?: number;
  lastIncreaseAt?: number;
  /** Set when a flag is dismissed; cleared once a new qualifying session lands. */
  deferredAfterSessionId?: ID;
  /**
   * Set when a jump is accepted. The streak is derived from the logs, so
   * without this the same flag would keep firing until the heavier session is
   * actually logged.
   */
  acceptedAfterSessionId?: ID;
  /** Bodyweight movements: the variant currently being trained. */
  currentVariant?: string;
  config?: Partial<ProgressionConfig>;
}

export interface Settings {
  units: 'lb' | 'kg';
  /** The sizes the user's gym actually has, ascending. */
  dumbbellLadder: number[];
  /** Smallest change possible on a barbell or a stack. */
  smallestIncrement: number;
  defaultProgression: ProgressionConfig;
  restTimerSound: boolean;
  restTimerVibrate: boolean;
  activeProgramId?: ID;
  activeScheduleId?: ID;
  /** Bumped by seeding so a later version can re-seed without clobbering edits. */
  seedVersion?: number;
}

/** The whole database, for export/import. */
export interface Backup {
  format: 'overload-backup';
  version: number;
  exportedAt: number;
  exercises: Exercise[];
  programs: Program[];
  schedules: Schedule[];
  sessions: ScheduledSession[];
  sets: LoggedSet[];
  progression: ProgressionState[];
  settings: Settings;
}
