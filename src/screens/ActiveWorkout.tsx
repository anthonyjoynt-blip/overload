import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { exerciseMap } from '../state/selectors';
import { effectiveBlocks, resolveWorkout } from '../lib/schedule';
import {
  buildSetSlots,
  describeTarget,
  findLoggedSet,
  tallySession,
  type SetSlot,
} from '../lib/session';
import { formatDuration, formatWeight } from '../lib/units';
import { newId } from '../lib/id';
import { Empty, ProgressRing, RestTimer, Sheet, Stepper, type RestTimerState } from '../components/ui';
import { TechniqueSheet } from '../components/Technique';
import { ExercisePicker } from '../components/ExercisePicker';
import { BackIcon, CheckIcon, InfoIcon, PlusIcon, TrashIcon } from '../components/Icons';
import type { Block, Exercise, LoggedSet, ProgramExercise } from '../types';

interface Draft {
  weight?: number;
  reps?: number;
  holdSeconds?: number;
  goodForm: boolean;
}

export function ActiveWorkout() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const navigate = useNavigate();

  const session = store.sessions.find((s) => s.id === id);
  const program = store.programs.find((p) => p.id === session?.programId);
  const byId = useMemo(() => exerciseMap(store.exercises), [store.exercises]);

  const resolved = program && session ? resolveWorkout(program, session) : null;

  const blocks: Block[] = useMemo(() => {
    const base = resolved ? effectiveBlocks(resolved) : [];
    return [...base, ...(session?.adHocBlocks ?? [])];
  }, [resolved, session]);

  const slots = useMemo(() => buildSetSlots(blocks, byId), [blocks, byId]);
  const sets = useMemo(
    () => store.sets.filter((s) => s.sessionId === session?.id),
    [store.sets, session?.id],
  );

  const [cursor, setCursor] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rest, setRest] = useState<RestTimerState | null>(null);
  const [technique, setTechnique] = useState<Exercise | null>(null);
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Land on the first set that has not been logged.
  useEffect(() => {
    const first = slots.findIndex((slot) => !findLoggedSet(sets, slot));
    setCursor(first === -1 ? Math.max(0, slots.length - 1) : first);
    // Only when the session changes — moving the cursor afterwards is the
    // user's business, not this effect's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, slots.length]);

  const slot = slots[cursor];

  useEffect(() => {
    if (!slot) {
      setDraft(null);
      return;
    }
    setDraft(buildDraft(slot, sets, store));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot?.key]);

  if (!session) {
    return <Empty title="That session is gone">It may have been removed from the calendar.</Empty>;
  }

  if (!program || !resolved) {
    return (
      <Empty title="The program behind this session is missing">
        Re-schedule the program from the program library.
      </Empty>
    );
  }

  const workout = resolved.option ?? resolved.workout;
  const isOpenSlot = resolved.workout.kind === 'open';
  // A choice day reached straight from the calendar has not been decided yet.
  const needsChoice = resolved.workout.kind === 'choice' && !session.chosenOptionId;
  const tally = tallySession(slots, sets);
  const allLogged = slots.length > 0 && tally.logged >= slots.length;

  const logSet = async () => {
    if (!slot || !draft) return;
    const existing = findLoggedSet(sets, slot);
    const set: LoggedSet = {
      id: existing?.id ?? newId('set'),
      sessionId: session.id,
      exerciseId: slot.exercise.id,
      programExerciseId: slot.programExercise.id,
      blockId: slot.blockId,
      round: slot.round,
      setNumber: slot.setNumber,
      weight: draft.weight,
      reps: slot.programExercise.reps.type === 'timed' ? undefined : draft.reps,
      holdSeconds: slot.programExercise.reps.type === 'timed' ? draft.holdSeconds : undefined,
      goodForm: draft.goodForm,
      timestamp: Date.now(),
    };
    await store.logSet(set);

    if (!session.startedAt) {
      await store.updateSession({ ...session, startedAt: Date.now() });
    }

    if (slot.restSeconds > 0) {
      setRest({
        seconds: slot.restSeconds,
        key: `${slot.key}-${Date.now()}`,
        label: nextLabel(slots, cursor),
      });
    }

    const next = slots.findIndex((s, i) => i > cursor && !findLoggedSet(sets, s) && s.key !== slot.key);
    setCursor(next === -1 ? Math.min(cursor + 1, slots.length - 1) : next);
  };

  const addMovement = async (exercise: Exercise) => {
    const pe: ProgramExercise = {
      id: newId('pe'),
      exerciseId: exercise.id,
      sets: resolved.workout.open?.setCap ?? 3,
      reps: resolved.workout.open?.repScheme ?? { type: 'range', min: 8, max: 12 },
      restSeconds: resolved.workout.open?.restSeconds ?? 60,
      weightMode:
        exercise.equipment === 'bodyweight' || exercise.equipment === 'suspension'
          ? 'bodyweight'
          : 'external',
    };
    const block: Block = {
      id: newId('block'),
      kind: 'straight',
      label: 'Added on the day',
      exercises: [pe],
    };
    await store.updateSession({
      ...session,
      adHocBlocks: [...(session.adHocBlocks ?? []), block],
    });
    setAdding(false);
  };

  const finish = async () => {
    await store.updateSession({
      ...session,
      status: 'done',
      completedAt: Date.now(),
    });
    navigate('/');
  };

  return (
    <div style={{ paddingTop: 10 }}>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <BackIcon />
        </button>
        <div className="grow">
          <p className="tiny dim" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {program.name}
          </p>
          <h2>{workout.name}</h2>
        </div>
        <ProgressRing value={tally.logged} total={slots.length} />
      </div>

      {isOpenSlot && <OpenSlotBanner workout={resolved.workout} />}

      {needsChoice ? (
        <div className="card card-accent">
          <h3>Pick one</h3>
          <p className="small muted" style={{ margin: '6px 0 14px 0' }}>
            {resolved.workout.notes ?? 'This day is a choice — take whichever you need today.'}
          </p>
          <div className="stack-sm">
            {(resolved.workout.options ?? []).map((option) => (
              <button
                key={option.id}
                className="list-button"
                onClick={() => store.updateSession({ ...session, chosenOptionId: option.id })}
              >
                <span className="grow strong">{option.name}</span>
                <span className="tiny dim">
                  {option.blocks.flatMap((b) => b.exercises).length} movements
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : slot && draft ? (
        <div className="card card-accent">
          <div className="card-head">
            <div className="grow">
              {slot.blockLabel && <span className="pill pill-accent">{slot.blockLabel}</span>}
              <h2 style={{ marginTop: slot.blockLabel ? 8 : 0 }}>{slot.exercise.name}</h2>
              <p className="small muted" style={{ marginTop: 4 }}>
                {slot.round
                  ? `Round ${slot.round} of ${slot.totalRounds} · `
                  : `Set ${slot.setNumber} of ${slot.totalSets} · `}
                {describeTarget(slot.programExercise, slot.blockKind)}
                {slot.programExercise.optional ? ' · optional' : ''}
                {slot.programExercise.note ? ` · ${slot.programExercise.note}` : ''}
              </p>
            </div>
            <button
              className="icon-btn"
              onClick={() => setTechnique(slot.exercise)}
              aria-label="How to do this"
            >
              <InfoIcon />
            </button>
          </div>

          <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {slot.programExercise.weightMode !== 'bodyweight' && (
              <Stepper
                label="Weight"
                suffix={store.settings.units}
                value={draft.weight}
                step={weightStep(slot.exercise.equipment, store.settings.smallestIncrement)}
                onChange={(weight) => setDraft({ ...draft, weight })}
              />
            )}
            {slot.programExercise.reps.type === 'timed' ? (
              <Stepper
                label="Held"
                suffix="seconds"
                value={draft.holdSeconds}
                step={5}
                onChange={(holdSeconds) => setDraft({ ...draft, holdSeconds })}
              />
            ) : (
              <Stepper
                label={slot.programExercise.reps.perSide ? 'Reps each side' : 'Reps'}
                value={draft.reps}
                step={1}
                onChange={(reps) => setDraft({ ...draft, reps })}
              />
            )}
          </div>

          <label className="checkline" style={{ marginTop: 6 }}>
            <input
              type="checkbox"
              checked={draft.goodForm}
              onChange={(e) => setDraft({ ...draft, goodForm: e.target.checked })}
            />
            <span className="small">
              Clean reps
              <span className="dim"> — a set you were not happy with will not count toward a jump</span>
            </span>
          </label>

          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 12 }} onClick={logSet}>
            <CheckIcon />
            {findLoggedSet(sets, slot) ? 'Update set' : 'Log set'}
          </button>

          <div className="row" style={{ marginTop: 10 }}>
            <button
              className="btn btn-sm grow"
              disabled={cursor === 0}
              onClick={() => setCursor(cursor - 1)}
            >
              Previous
            </button>
            <button
              className="btn btn-sm grow"
              disabled={cursor >= slots.length - 1}
              onClick={() => setCursor(cursor + 1)}
            >
              Next
            </button>
            {slot.restSeconds > 0 && (
              <button
                className="btn btn-sm"
                onClick={() =>
                  setRest({
                    seconds: slot.restSeconds,
                    key: `manual-${Date.now()}`,
                    label: nextLabel(slots, cursor),
                  })
                }
              >
                Rest {formatDuration(slot.restSeconds)}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <h3>{isOpenSlot ? 'Pick your movements' : 'Nothing to log'}</h3>
          <p className="small muted" style={{ marginTop: 6 }}>
            {isOpenSlot
              ? 'This is an open slot — add the movements you are doing today.'
              : 'This workout has no movements in it yet.'}
          </p>
        </div>
      )}

      {!needsChoice && <div className="section-title">Session</div>}
      <div className="stack-sm">
        {(needsChoice ? [] : slots).map((s, i) => {
          const logged = findLoggedSet(sets, s);
          const target = s.programExercise.reps;
          const goal = target.type === 'timed' ? target.seconds : target.type === 'range' ? target.max : target.min;
          const done = target.type === 'timed' ? logged?.holdSeconds : logged?.reps;
          const hit = logged && goal != null && done != null && done >= goal && logged.goodForm;
          return (
            <button
              key={s.key}
              className={`set-row ${logged ? (hit ? 'done' : 'short') : ''}`}
              style={{
                cursor: 'pointer',
                outline: i === cursor ? '2px solid var(--accent)' : 'none',
                outlineOffset: -1,
                textAlign: 'left',
              }}
              onClick={() => setCursor(i)}
            >
              <span className="set-index">{s.round ?? s.setNumber}</span>
              <span className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.exercise.name}
                {s.programExercise.optional && <span className="dim tiny"> · optional</span>}
              </span>
              <span className="small num dim">
                {logged
                  ? target.type === 'timed'
                    ? `${logged.holdSeconds ?? 0}s`
                    : `${logged.weight != null ? `${logged.weight} × ` : ''}${logged.reps ?? 0}`
                  : describeTarget({ ...s.programExercise, sets: 1 }, s.blockKind)}
              </span>
              <span className={`set-check ${logged ? 'on' : ''}`} aria-hidden>
                {logged ? <CheckIcon /> : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 14, display: needsChoice ? 'none' : undefined }}>
        <button className="btn grow" onClick={() => setAdding(true)}>
          <PlusIcon />
          Add a movement
        </button>
        <button
          className="btn btn-primary grow"
          onClick={() => (allLogged ? finish() : setFinishing(true))}
        >
          Finish
        </button>
      </div>

      {session.status === 'done' && (
        <p className="tiny dim center" style={{ marginTop: 12 }}>
          Logged{' '}
          {session.completedAt ? new Date(session.completedAt).toLocaleString() : ''} · editing
          a set here updates the coaching.
        </p>
      )}

      {rest && (
        <RestTimer
          state={rest}
          sound={store.settings.restTimerSound}
          vibrate={store.settings.restTimerVibrate}
          onDone={() => undefined}
          onDismiss={() => setRest(null)}
        />
      )}

      {technique && (
        <TechniqueSheet exercise={technique} onClose={() => setTechnique(null)} />
      )}

      {adding && (
        <ExercisePicker
          exercises={store.exercises}
          onPick={addMovement}
          onClose={() => setAdding(false)}
        />
      )}

      {finishing && (
        <Sheet title="Finish early?" onClose={() => setFinishing(false)}>
          <p className="small muted">
            {tally.logged} of {slots.length} sets logged. Finishing marks the session done and
            leaves the rest unlogged — the unlogged sets simply do not count toward any
            movement's streak.
          </p>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn grow" onClick={() => setFinishing(false)}>
              Keep going
            </button>
            <button className="btn btn-primary grow" onClick={finish}>
              Finish session
            </button>
          </div>
          <button
            className="btn btn-danger btn-block"
            style={{ marginTop: 10 }}
            onClick={async () => {
              await store.updateSession({ ...session, status: 'skipped' });
              navigate('/');
            }}
          >
            <TrashIcon />
            Mark the whole session skipped
          </button>
        </Sheet>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function OpenSlotBanner({ workout }: { workout: { name: string; open?: { focus?: string; durationCapMinutes?: number; setCap?: number; guidance?: string } } }) {
  const open = workout.open;
  if (!open) return null;
  return (
    <div className="banner banner-info" style={{ marginBottom: 14 }}>
      <strong>Open slot.</strong>{' '}
      {open.focus ? `Focus: ${open.focus}. ` : ''}
      {open.setCap ? `Up to ${open.setCap} sets per movement. ` : ''}
      {open.durationCapMinutes ? `Keep it under ${open.durationCapMinutes} minutes. ` : ''}
      {open.guidance ?? 'Pick the movements yourself — the app tracks whatever you log.'}
    </div>
  );
}

function weightStep(equipment: Exercise['equipment'], smallest: number): number {
  if (equipment === 'barbell') return 5;
  if (equipment === 'dumbbell' || equipment === 'kettlebell') return 2.5;
  return smallest;
}

function nextLabel(slots: SetSlot[], cursor: number): string {
  const next = slots[cursor + 1];
  if (!next) return 'Last set — nice work';
  return `Next: ${next.exercise.name}`;
}

/** Sensible starting numbers, so a set is two taps and not four. */
function buildDraft(
  slot: SetSlot,
  sets: LoggedSet[],
  store: ReturnType<typeof useStore>,
): Draft {
  const existing = findLoggedSet(sets, slot);
  if (existing) {
    return {
      weight: existing.weight,
      reps: existing.reps,
      holdSeconds: existing.holdSeconds,
      goodForm: existing.goodForm,
    };
  }

  const target = slot.programExercise.reps;
  const state = store.progression.find((p) => p.exerciseId === slot.exercise.id);

  // Earlier sets of this movement in this same session come first — you do not
  // change the weight between sets very often.
  const thisSession = sets
    .filter((s) => s.exerciseId === slot.exercise.id)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  const historical = store.sets
    .filter((s) => s.exerciseId === slot.exercise.id)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  const weight =
    thisSession?.weight ??
    state?.workingWeight ??
    historical?.weight ??
    slot.programExercise.startingWeight;

  return {
    weight,
    reps: target.type === 'timed' ? undefined : target.min ?? historical?.reps,
    holdSeconds: target.type === 'timed' ? target.seconds : undefined,
    goodForm: true,
  };
}

export function formatSetSummary(set: LoggedSet, units: string): string {
  if (set.holdSeconds != null) return `${set.holdSeconds}s`;
  const weight = set.weight != null ? `${formatWeight(set.weight, { units: units as 'lb' })} × ` : '';
  return `${weight}${set.reps ?? 0}`;
}
