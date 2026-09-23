import { useMemo, useState } from 'react';
import type { Exercise, MuscleGroup } from '../types';
import { Sheet } from './ui';

const GROUPS: (MuscleGroup | 'all')[] = [
  'all',
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'core',
  'full-body',
];

export function ExercisePicker({
  exercises,
  title = 'Add a movement',
  onPick,
  onClose,
  footer,
}: {
  exercises: Exercise[];
  title?: string;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (group !== 'all' && !exercise.muscleGroups.includes(group)) return false;
      if (!q) return true;
      return (
        exercise.name.toLowerCase().includes(q) ||
        (exercise.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
        exercise.equipment.includes(q)
      );
    });
  }, [exercises, query, group]);

  return (
    <Sheet title={title} onClose={onClose} footer={footer}>
      <input
        type="search"
        placeholder="Search movements"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="row-wrap" style={{ margin: '12px 0' }}>
        {GROUPS.map((g) => (
          <button
            key={g}
            className={`pill ${group === g ? 'pill-accent' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setGroup(g)}
          >
            {g === 'all' ? 'All' : g}
          </button>
        ))}
      </div>
      <div className="stack-sm">
        {matches.map((exercise) => (
          <button
            key={exercise.id}
            className="list-button"
            onClick={() => onPick(exercise)}
          >
            <span className="grow">
              <span className="strong">{exercise.name}</span>
              <span className="tiny dim" style={{ display: 'block' }}>
                {exercise.equipment} · {exercise.muscleGroups.join(', ')}
              </span>
            </span>
          </button>
        ))}
        {matches.length === 0 && (
          <p className="small muted center" style={{ padding: 20 }}>
            Nothing matches. Add it in the exercise library first.
          </p>
        )}
      </div>
    </Sheet>
  );
}
