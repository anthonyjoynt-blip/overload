import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { TechniqueCard } from '../components/Technique';
import { Sheet } from '../components/ui';
import { PlusIcon, TrashIcon } from '../components/Icons';
import { newId, slugId } from '../lib/id';
import type { Equipment, Exercise, MovementClass, MuscleGroup } from '../types';

const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'bodyweight',
  'suspension',
  'band',
  'other',
];

const MOVEMENT_CLASSES: { value: MovementClass; label: string }[] = [
  { value: 'compound-lower', label: 'Compound — lower body' },
  { value: 'compound-upper', label: 'Compound — upper body' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'core', label: 'Core' },
];

const MUSCLES: MuscleGroup[] = [
  'quads', 'hamstrings', 'glutes', 'calves', 'chest', 'back',
  'shoulders', 'biceps', 'triceps', 'core', 'full-body',
];

export function ExerciseLibrary() {
  const store = useStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<Equipment | 'all'>('all');
  const [creating, setCreating] = useState(false);

  const selected = store.exercises.find((e) => e.id === id);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.exercises.filter((exercise) => {
      if (equipment !== 'all' && exercise.equipment !== equipment) return false;
      if (!q) return true;
      return (
        exercise.name.toLowerCase().includes(q) ||
        (exercise.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
        exercise.muscleGroups.some((m) => m.includes(q))
      );
    });
  }, [store.exercises, query, equipment]);

  return (
    <div className="stack">
      <div className="row" style={{ marginTop: 4 }}>
        <h1 className="grow">Exercise library</h1>
        <button className="btn btn-sm btn-primary" onClick={() => setCreating(true)}>
          <PlusIcon />
          New
        </button>
      </div>

      <input
        type="search"
        placeholder="Search movements"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="row-wrap">
        <button
          className={`pill ${equipment === 'all' ? 'pill-accent' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setEquipment('all')}
        >
          All
        </button>
        {EQUIPMENT.map((item) => (
          <button
            key={item}
            className={`pill ${equipment === item ? 'pill-accent' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setEquipment(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <p className="tiny dim">
        {matches.length} movement{matches.length === 1 ? '' : 's'}
      </p>

      <div className="stack-sm">
        {matches.map((exercise) => (
          <Link key={exercise.id} to={`/exercises/${exercise.id}`} className="list-button">
            <span className="grow">
              <span className="strong">{exercise.name}</span>
              <span className="tiny dim" style={{ display: 'block' }}>
                {exercise.equipment} · {exercise.muscleGroups.join(', ')}
                {exercise.custom ? ' · yours' : ''}
              </span>
            </span>
            {exercise.cues.length === 0 && <span className="pill pill-warn">no cues</span>}
          </Link>
        ))}
      </div>

      {selected && (
        <ExerciseSheet
          exercise={selected}
          onClose={() => navigate('/exercises')}
        />
      )}

      {creating && (
        <ExerciseSheet
          exercise={{
            id: newId('ex'),
            name: '',
            muscleGroups: [],
            equipment: 'barbell',
            movementClass: 'isolation',
            cues: [],
            custom: true,
          }}
          isNew
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function ExerciseSheet({
  exercise,
  isNew,
  onClose,
}: {
  exercise: Exercise;
  isNew?: boolean;
  onClose: () => void;
}) {
  const store = useStore();
  const [draft, setDraft] = useState<Exercise>(exercise);
  const [editing, setEditing] = useState(Boolean(isNew));

  const set = (patch: Partial<Exercise>) => setDraft({ ...draft, ...patch });

  if (!editing) {
    return (
      <Sheet
        title={draft.name}
        onClose={onClose}
        footer={
          <div className="row">
            <button className="btn grow" onClick={() => setEditing(true)}>
              Edit
            </button>
            <Link className="btn grow" to={`/progress/${draft.id}`} onClick={onClose}>
              History
            </Link>
          </div>
        }
      >
        <div className="row-wrap" style={{ marginBottom: 14 }}>
          <span className="pill">{draft.equipment}</span>
          {draft.muscleGroups.map((group) => (
            <span key={group} className="pill">
              {group}
            </span>
          ))}
        </div>
        <TechniqueCard exercise={draft} />
      </Sheet>
    );
  }

  return (
    <Sheet title={isNew ? 'New movement' : `Edit ${exercise.name}`} onClose={onClose}>
      <div className="stack">
        <label className="field">
          <span>Name</span>
          <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </label>

        <label className="field">
          <span>Equipment</span>
          <select
            value={draft.equipment}
            onChange={(e) => set({ equipment: e.target.value as Equipment })}
          >
            {EQUIPMENT.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Movement class — this decides the size of the suggested jump</span>
          <select
            value={draft.movementClass}
            onChange={(e) => set({ movementClass: e.target.value as MovementClass })}
          >
            {MOVEMENT_CLASSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="tiny muted" style={{ marginBottom: 6, fontWeight: 600 }}>
            Muscle groups
          </p>
          <div className="row-wrap">
            {MUSCLES.map((muscle) => (
              <button
                key={muscle}
                className={`pill ${draft.muscleGroups.includes(muscle) ? 'pill-accent' : ''}`}
                style={{ cursor: 'pointer', minHeight: 36 }}
                onClick={() =>
                  set({
                    muscleGroups: draft.muscleGroups.includes(muscle)
                      ? draft.muscleGroups.filter((m) => m !== muscle)
                      : [...draft.muscleGroups, muscle],
                  })
                }
              >
                {muscle}
              </button>
            ))}
          </div>
        </div>

        <label className="checkline">
          <input
            type="checkbox"
            checked={Boolean(draft.unilateral)}
            onChange={(e) => set({ unilateral: e.target.checked || undefined })}
          />
          <span className="small">One side at a time</span>
        </label>

        <label className="field">
          <span>Set up</span>
          <input
            type="text"
            value={draft.setup ?? ''}
            onChange={(e) => set({ setup: e.target.value || undefined })}
          />
        </label>

        <label className="field">
          <span>Form cues — one per line</span>
          <textarea
            value={draft.cues.join('\n')}
            onChange={(e) =>
              set({ cues: e.target.value.split('\n').map((c) => c.trim()).filter(Boolean) })
            }
            style={{ minHeight: 100 }}
          />
        </label>

        <label className="field">
          <span>What usually goes wrong — one per line</span>
          <textarea
            value={(draft.faults ?? []).join('\n')}
            onChange={(e) => {
              const faults = e.target.value.split('\n').map((c) => c.trim()).filter(Boolean);
              set({ faults: faults.length ? faults : undefined });
            }}
            style={{ minHeight: 70 }}
          />
        </label>

        <label className="field">
          <span>Easier to harder variations — one per line</span>
          <textarea
            value={(draft.progressionVariants ?? []).join('\n')}
            onChange={(e) => {
              const variants = e.target.value.split('\n').map((c) => c.trim()).filter(Boolean);
              set({ progressionVariants: variants.length ? variants : undefined });
            }}
            style={{ minHeight: 70 }}
          />
        </label>

        <label className="field">
          <span>Visual aid — image or clip URL</span>
          <input
            type="text"
            placeholder="exercises/push-up.gif"
            value={draft.media?.src?.[0] ?? ''}
            onChange={(e) =>
              set({
                media: e.target.value
                  ? { kind: 'image', src: [e.target.value], attribution: draft.media?.attribution }
                  : undefined,
              })
            }
          />
        </label>

        <div className="row">
          <button className="btn grow" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary grow"
            disabled={!draft.name.trim()}
            onClick={async () => {
              await store.saveExercise({
                ...draft,
                id: isNew ? slugId('custom', draft.name) || draft.id : draft.id,
                name: draft.name.trim(),
                custom: draft.custom ?? true,
              });
              onClose();
            }}
          >
            Save
          </button>
        </div>

        {draft.custom && !isNew && (
          <button
            className="btn btn-danger btn-block"
            onClick={async () => {
              await store.removeExercise(draft.id);
              onClose();
            }}
          >
            <TrashIcon />
            Delete this movement
          </button>
        )}
      </div>
    </Sheet>
  );
}
