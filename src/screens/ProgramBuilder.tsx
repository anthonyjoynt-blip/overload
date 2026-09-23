import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { exerciseMap } from '../state/selectors';
import { describeTarget } from '../lib/session';
import { newId } from '../lib/id';
import { Empty, Sheet } from '../components/ui';
import { ExercisePicker } from '../components/ExercisePicker';
import { BackIcon, PlusIcon, TrashIcon } from '../components/Icons';
import type {
  Block,
  Exercise,
  Phase,
  Program,
  ProgramExercise,
  RepTarget,
  WeekType,
  Workout,
} from '../types';

/**
 * Edits a local draft and saves on demand, rather than writing to the database
 * on every keystroke. The draft is the program; nothing here is partial state.
 */
export function ProgramBuilder() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const navigate = useNavigate();

  const saved = store.programs.find((p) => p.id === id);
  const [draft, setDraft] = useState<Program | null>(null);
  const [picking, setPicking] = useState<{ blockId: string } | null>(null);
  const [editing, setEditing] = useState<{ blockId: string; peId: string } | null>(null);

  useEffect(() => {
    if (saved) setDraft(structuredClone(saved));
  }, [saved?.id, saved?.updatedAt]);

  const byId = useMemo(() => exerciseMap(store.exercises), [store.exercises]);

  if (!saved || !draft) {
    return <Empty title="That program is gone">It may have been deleted.</Empty>;
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify({ ...saved, updatedAt: saved.updatedAt });

  const update = (fn: (program: Program) => void) => {
    setDraft((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      fn(next);
      return next;
    });
  };

  const allBlocks = draft.phases.flatMap((phase) =>
    phase.workouts.flatMap((workout) => [workout, ...(workout.options ?? [])].flatMap((w) => w.blocks)),
  );
  const findBlock = (blockId: string) => allBlocks.find((b) => b.id === blockId);

  return (
    <div className="stack">
      <div className="row" style={{ marginTop: 4 }}>
        <button className="icon-btn" onClick={() => navigate('/programs')} aria-label="Back">
          <BackIcon />
        </button>
        <h1 className="grow">Edit program</h1>
        {dirty && <span className="pill pill-warn">Unsaved</span>}
      </div>

      <div className="card">
        <div className="stack">
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => update((p) => void (p.name = e.target.value))}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <input
              type="text"
              value={draft.description ?? ''}
              placeholder="What this block is for"
              onChange={(e) => update((p) => void (p.description = e.target.value || undefined))}
            />
          </label>
        </div>
      </div>

      {draft.phases.map((phase, phaseIndex) => (
        <PhaseEditor
          key={phase.id}
          phase={phase}
          byId={byId}
          onChange={(fn) => update((p) => fn(p.phases[phaseIndex]))}
          onRemove={
            draft.phases.length > 1
              ? () => update((p) => void p.phases.splice(phaseIndex, 1))
              : undefined
          }
          onPickExercise={(blockId) => setPicking({ blockId })}
          onEditExercise={(blockId, peId) => setEditing({ blockId, peId })}
        />
      ))}

      <button
        className="btn btn-block"
        onClick={() =>
          update((p) =>
            void p.phases.push({
              id: newId('phase'),
              name: `Phase ${p.phases.length + 1}`,
              weeks: 4,
              workouts: [{ id: newId('workout'), name: 'Day 1', kind: 'fixed', blocks: [] }],
            }),
          )
        }
      >
        <PlusIcon />
        Add a phase
      </button>

      <div className="row" style={{ marginTop: 10 }}>
        <button
          className="btn grow"
          onClick={() => setDraft(structuredClone(saved))}
          disabled={!dirty}
        >
          Discard changes
        </button>
        <button
          className="btn btn-primary grow"
          disabled={!dirty}
          onClick={() => store.saveProgram(draft)}
        >
          Save program
        </button>
      </div>

      <button
        className="btn btn-danger btn-block"
        style={{ marginTop: 6 }}
        onClick={async () => {
          await store.removeProgram(draft.id);
          navigate('/programs');
        }}
      >
        <TrashIcon />
        Delete this program
      </button>
      <p className="tiny dim">
        Deleting removes the plan. Sessions already logged against it stay in your history.
      </p>

      {picking && (
        <ExercisePicker
          exercises={store.exercises}
          onClose={() => setPicking(null)}
          onPick={(exercise) => {
            update((program) => {
              for (const phase of program.phases) {
                for (const workout of phase.workouts) {
                  for (const w of [workout, ...(workout.options ?? [])]) {
                    for (const block of w.blocks) {
                      if (block.id !== picking.blockId) continue;
                      block.exercises.push(defaultProgramExercise(exercise));
                    }
                  }
                }
              }
            });
            setPicking(null);
          }}
        />
      )}

      {editing && (() => {
        const block = findBlock(editing.blockId);
        const pe = block?.exercises.find((e) => e.id === editing.peId);
        if (!block || !pe) return null;
        return (
          <ProgramExerciseSheet
            exercise={byId.get(pe.exerciseId)}
            programExercise={pe}
            units={store.settings.units}
            onClose={() => setEditing(null)}
            onChange={(next) =>
              update((program) => {
                for (const phase of program.phases) {
                  for (const workout of phase.workouts) {
                    for (const w of [workout, ...(workout.options ?? [])]) {
                      for (const b of w.blocks) {
                        const index = b.exercises.findIndex((e) => e.id === next.id);
                        if (index !== -1) b.exercises[index] = next;
                      }
                    }
                  }
                }
              })
            }
            onRemove={() => {
              update((program) => {
                for (const phase of program.phases) {
                  for (const workout of phase.workouts) {
                    for (const w of [workout, ...(workout.options ?? [])]) {
                      for (const b of w.blocks) {
                        const index = b.exercises.findIndex((e) => e.id === editing.peId);
                        if (index !== -1) b.exercises.splice(index, 1);
                      }
                    }
                  }
                }
              });
              setEditing(null);
            }}
          />
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------

const WEEK_TYPES: WeekType[] = ['normal', 'failure', 'deload'];

function PhaseEditor({
  phase,
  byId,
  onChange,
  onRemove,
  onPickExercise,
  onEditExercise,
}: {
  phase: Phase;
  byId: Map<string, Exercise>;
  onChange: (fn: (phase: Phase) => void) => void;
  onRemove?: () => void;
  onPickExercise: (blockId: string) => void;
  onEditExercise: (blockId: string, peId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="card">
      <div className="card-head">
        <input
          type="text"
          value={phase.name}
          onChange={(e) => onChange((p) => void (p.name = e.target.value))}
          style={{ fontWeight: 650, fontSize: '1.1rem' }}
        />
        <button className="btn btn-sm" onClick={() => setOpen(!open)}>
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {open && (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <label className="field grow">
              <span>Weeks</span>
              <input
                type="number"
                min={1}
                value={phase.weeks}
                onChange={(e) => onChange((p) => void (p.weeks = Math.max(1, Number(e.target.value))))}
              />
            </label>
          </div>

          <div style={{ marginBottom: 14 }}>
            <p className="tiny dim" style={{ marginBottom: 6 }}>
              Week types, in order. Weeks past the end of the list start again at the beginning.
            </p>
            <div className="row-wrap">
              {(phase.weekTypes ?? Array.from({ length: phase.weeks }, () => 'normal' as WeekType))
                .slice(0, phase.weeks)
                .map((type, i) => (
                  <button
                    key={i}
                    className={`pill ${type === 'deload' ? 'pill-warn' : type === 'failure' ? 'pill-accent' : ''}`}
                    style={{ cursor: 'pointer', minHeight: 36 }}
                    onClick={() =>
                      onChange((p) => {
                        const list = [...(p.weekTypes ?? Array.from({ length: p.weeks }, () => 'normal' as WeekType))];
                        while (list.length < p.weeks) list.push('normal');
                        const next = WEEK_TYPES[(WEEK_TYPES.indexOf(list[i]) + 1) % WEEK_TYPES.length];
                        list[i] = next;
                        p.weekTypes = list.every((t) => t === 'normal') ? undefined : list;
                      })
                    }
                  >
                    W{i + 1} · {type}
                  </button>
                ))}
            </div>
          </div>

          <div className="stack">
            {phase.workouts.map((workout, workoutIndex) => (
              <WorkoutEditor
                key={workout.id}
                workout={workout}
                byId={byId}
                onChange={(fn) => onChange((p) => fn(p.workouts[workoutIndex]))}
                onRemove={() => onChange((p) => void p.workouts.splice(workoutIndex, 1))}
                onPickExercise={onPickExercise}
                onEditExercise={onEditExercise}
              />
            ))}
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn btn-sm grow"
              onClick={() =>
                onChange((p) =>
                  void p.workouts.push({
                    id: newId('workout'),
                    name: `Day ${p.workouts.length + 1}`,
                    kind: 'fixed',
                    blocks: [],
                  }),
                )
              }
            >
              <PlusIcon />
              Add a day
            </button>
            {onRemove && (
              <button className="btn btn-sm btn-ghost" onClick={onRemove}>
                Remove phase
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function WorkoutEditor({
  workout,
  byId,
  onChange,
  onRemove,
  onPickExercise,
  onEditExercise,
}: {
  workout: Workout;
  byId: Map<string, Exercise>;
  onChange: (fn: (workout: Workout) => void) => void;
  onRemove: () => void;
  onPickExercise: (blockId: string) => void;
  onEditExercise: (blockId: string, peId: string) => void;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: 12,
        background: 'var(--bg-elevated)',
      }}
    >
      <div className="row" style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={workout.name}
          onChange={(e) => onChange((w) => void (w.name = e.target.value))}
        />
      </div>

      <div className="row-wrap" style={{ marginBottom: 10 }}>
        <select
          value={workout.kind}
          onChange={(e) => onChange((w) => void (w.kind = e.target.value as Workout['kind']))}
          style={{ width: 'auto' }}
        >
          <option value="fixed">Fixed list</option>
          <option value="open">Open slot</option>
          <option value="choice">Choice of workouts</option>
        </select>
        <label className="checkline" style={{ minHeight: 40 }}>
          <input
            type="checkbox"
            checked={Boolean(workout.optional)}
            onChange={(e) => onChange((w) => void (w.optional = e.target.checked || undefined))}
          />
          <span className="small">Optional</span>
        </label>
      </div>

      {workout.kind === 'open' ? (
        <div className="stack-sm">
          <p className="tiny dim">
            The movements are chosen when you log this day. Set the limits here.
          </p>
          <input
            type="text"
            placeholder="Focus, e.g. abs or a weak point"
            value={workout.open?.focus ?? ''}
            onChange={(e) =>
              onChange((w) => void (w.open = { ...w.open, focus: e.target.value || undefined }))
            }
          />
          <div className="row">
            <label className="field grow">
              <span>Set cap</span>
              <input
                type="number"
                min={1}
                value={workout.open?.setCap ?? ''}
                onChange={(e) =>
                  onChange(
                    (w) =>
                      void (w.open = {
                        ...w.open,
                        setCap: e.target.value ? Number(e.target.value) : undefined,
                      }),
                  )
                }
              />
            </label>
            <label className="field grow">
              <span>Minutes cap</span>
              <input
                type="number"
                min={1}
                value={workout.open?.durationCapMinutes ?? ''}
                onChange={(e) =>
                  onChange(
                    (w) =>
                      void (w.open = {
                        ...w.open,
                        durationCapMinutes: e.target.value ? Number(e.target.value) : undefined,
                      }),
                  )
                }
              />
            </label>
          </div>
        </div>
      ) : workout.kind === 'choice' ? (
        <div className="stack-sm">
          <p className="tiny dim">
            One of these is picked on the day. Each option is edited as its own day.
          </p>
          {(workout.options ?? []).map((option, optionIndex) => (
            <div key={option.id} style={{ borderLeft: '2px solid var(--accent-line)', paddingLeft: 10 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  value={option.name}
                  onChange={(e) =>
                    onChange((w) => void (w.options![optionIndex].name = e.target.value))
                  }
                />
                <button
                  className="icon-btn"
                  onClick={() => onChange((w) => void w.options!.splice(optionIndex, 1))}
                  aria-label="Remove option"
                >
                  <TrashIcon />
                </button>
              </div>
              <BlockList
                blocks={option.blocks}
                byId={byId}
                onChange={(fn) => onChange((w) => fn(w.options![optionIndex].blocks))}
                onPickExercise={onPickExercise}
                onEditExercise={onEditExercise}
              />
            </div>
          ))}
          <button
            className="btn btn-sm"
            onClick={() =>
              onChange((w) => {
                w.options = [
                  ...(w.options ?? []),
                  {
                    id: newId('workout'),
                    name: `Option ${(w.options?.length ?? 0) + 1}`,
                    kind: 'fixed',
                    blocks: [],
                  },
                ];
              })
            }
          >
            <PlusIcon />
            Add an option
          </button>
        </div>
      ) : (
        <BlockList
          blocks={workout.blocks}
          byId={byId}
          onChange={(fn) => onChange((w) => fn(w.blocks))}
          onPickExercise={onPickExercise}
          onEditExercise={onEditExercise}
        />
      )}

      <button className="btn btn-sm btn-ghost" style={{ marginTop: 10 }} onClick={onRemove}>
        Remove this day
      </button>
    </div>
  );
}

function BlockList({
  blocks,
  byId,
  onChange,
  onPickExercise,
  onEditExercise,
}: {
  blocks: Block[];
  byId: Map<string, Exercise>;
  onChange: (fn: (blocks: Block[]) => void) => void;
  onPickExercise: (blockId: string) => void;
  onEditExercise: (blockId: string, peId: string) => void;
}) {
  return (
    <div className="stack-sm">
      {blocks.map((block, blockIndex) => (
        <div key={block.id} className="stack-sm">
          <div className="row">
            <select
              value={block.kind}
              onChange={(e) =>
                onChange((list) => void (list[blockIndex].kind = e.target.value as Block['kind']))
              }
              style={{ width: 'auto' }}
            >
              <option value="straight">Straight sets</option>
              <option value="superset">Superset</option>
              <option value="circuit">Circuit</option>
            </select>
            {block.kind === 'circuit' && (
              <input
                type="number"
                min={1}
                value={block.rounds ?? 3}
                onChange={(e) =>
                  onChange((list) => void (list[blockIndex].rounds = Math.max(1, Number(e.target.value))))
                }
                style={{ width: 90 }}
                aria-label="Rounds"
              />
            )}
            <span className="grow" />
            <button
              className="icon-btn"
              onClick={() => onChange((list) => void list.splice(blockIndex, 1))}
              aria-label="Remove block"
            >
              <TrashIcon />
            </button>
          </div>

          {block.exercises.map((pe) => (
            <button
              key={pe.id}
              className="list-button"
              onClick={() => onEditExercise(block.id, pe.id)}
            >
              <span className="grow small strong">
                {byId.get(pe.exerciseId)?.name ?? 'Unknown movement'}
              </span>
              <span className="tiny dim num">{describeTarget(pe, block.kind)}</span>
            </button>
          ))}

          <button className="btn btn-sm" onClick={() => onPickExercise(block.id)}>
            <PlusIcon />
            Add a movement
          </button>
        </div>
      ))}

      <button
        className="btn btn-sm btn-ghost"
        onClick={() =>
          onChange((list) =>
            void list.push({ id: newId('block'), kind: 'straight', exercises: [] }),
          )
        }
      >
        <PlusIcon />
        Add a block
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function defaultProgramExercise(exercise: Exercise): ProgramExercise {
  const bodyweight =
    exercise.equipment === 'bodyweight' || exercise.equipment === 'suspension';
  return {
    id: newId('pe'),
    exerciseId: exercise.id,
    sets: 3,
    reps: {
      type: 'range',
      min: 8,
      max: 12,
      perSide: exercise.unilateral || undefined,
    },
    restSeconds: exercise.movementClass === 'compound-lower' ? 120 : 90,
    weightMode: bodyweight ? 'bodyweight' : 'external',
  };
}

function ProgramExerciseSheet({
  exercise,
  programExercise,
  units,
  onChange,
  onRemove,
  onClose,
}: {
  exercise?: Exercise;
  programExercise: ProgramExercise;
  units: string;
  onChange: (next: ProgramExercise) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const pe = programExercise;
  const set = (patch: Partial<ProgramExercise>) => onChange({ ...pe, ...patch });
  const setReps = (patch: Partial<RepTarget>) => set({ reps: { ...pe.reps, ...patch } });

  return (
    <Sheet title={exercise?.name ?? 'Movement'} onClose={onClose}>
      <div className="stack">
        <div className="row">
          <label className="field grow">
            <span>Sets</span>
            <input
              type="number"
              min={1}
              value={pe.sets}
              onChange={(e) => set({ sets: Math.max(1, Number(e.target.value)) })}
            />
          </label>
          <label className="field grow">
            <span>Rest (seconds)</span>
            <input
              type="number"
              min={0}
              step={5}
              value={pe.restSeconds}
              onChange={(e) => set({ restSeconds: Math.max(0, Number(e.target.value)) })}
            />
          </label>
        </div>

        <label className="field">
          <span>Rep target</span>
          <select
            value={pe.reps.type}
            onChange={(e) => setReps({ type: e.target.value as RepTarget['type'] })}
          >
            <option value="range">Rep range (double progression)</option>
            <option value="fixed">Fixed reps</option>
            <option value="amrap">AMRAP</option>
            <option value="timed">Timed hold</option>
            <option value="failure">To failure</option>
          </select>
        </label>

        {pe.reps.type === 'timed' ? (
          <label className="field">
            <span>Seconds</span>
            <input
              type="number"
              min={1}
              value={pe.reps.seconds ?? 30}
              onChange={(e) => setReps({ seconds: Math.max(1, Number(e.target.value)) })}
            />
          </label>
        ) : pe.reps.type === 'failure' ? (
          <p className="tiny muted">
            To-failure sets are logged but never flag a jump — there is no number to beat.
          </p>
        ) : (
          <div className="row">
            <label className="field grow">
              <span>{pe.reps.type === 'range' ? 'Bottom of range' : 'Reps'}</span>
              <input
                type="number"
                min={1}
                value={pe.reps.min ?? 8}
                onChange={(e) => setReps({ min: Math.max(1, Number(e.target.value)) })}
              />
            </label>
            {pe.reps.type === 'range' && (
              <label className="field grow">
                <span>Top of range</span>
                <input
                  type="number"
                  min={1}
                  value={pe.reps.max ?? 12}
                  onChange={(e) => setReps({ max: Math.max(1, Number(e.target.value)) })}
                />
              </label>
            )}
          </div>
        )}

        <label className="checkline">
          <input
            type="checkbox"
            checked={Boolean(pe.reps.perSide)}
            onChange={(e) => setReps({ perSide: e.target.checked || undefined })}
          />
          <span className="small">Counted each side</span>
        </label>

        <label className="field">
          <span>Load</span>
          <select
            value={pe.weightMode}
            onChange={(e) => set({ weightMode: e.target.value as ProgramExercise['weightMode'] })}
          >
            <option value="external">Weighted</option>
            <option value="bodyweight">Bodyweight only</option>
            <option value="bodyweight-plus">Bodyweight plus added load</option>
          </select>
        </label>

        {pe.weightMode !== 'bodyweight' && (
          <label className="field">
            <span>Starting weight ({units})</span>
            <input
              type="number"
              min={0}
              step={2.5}
              value={pe.startingWeight ?? ''}
              onChange={(e) =>
                set({ startingWeight: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
        )}

        <label className="field">
          <span>Note</span>
          <input
            type="text"
            value={pe.note ?? ''}
            placeholder="e.g. 3 second squeeze at the top"
            onChange={(e) => set({ note: e.target.value || undefined })}
          />
        </label>

        <div className="divider" />

        <label className="field">
          <span>Qualifying sessions before a jump</span>
          <input
            type="number"
            min={1}
            max={6}
            value={pe.progression?.requiredStreak ?? ''}
            placeholder="Use my default"
            onChange={(e) =>
              set({
                progression: e.target.value
                  ? { ...pe.progression, requiredStreak: Number(e.target.value) }
                  : { ...pe.progression, requiredStreak: undefined },
              })
            }
          />
        </label>
        <p className="tiny dim">
          One session is usually enough on isolation work; compound lifts often want two or
          three. Left blank, this uses the default in settings.
        </p>

        <button className="btn btn-danger btn-block" onClick={onRemove}>
          <TrashIcon />
          Remove from this day
        </button>
      </div>
    </Sheet>
  );
}
