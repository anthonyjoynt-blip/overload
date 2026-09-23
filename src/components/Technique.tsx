import { useState } from 'react';
import type { Exercise } from '../types';
import { Sheet } from './ui';

/**
 * The visual aid. Media is dropped in by scripts/fetch-exercise-media.mjs and
 * referenced by exercise id; until then the frame says so rather than showing a
 * broken image, and the cues carry the load.
 */
export function ExerciseVisual({ exercise }: { exercise: Exercise }) {
  const [broken, setBroken] = useState(false);
  const media = exercise.media;
  const src = media?.src?.[0];

  if (!src || broken) {
    return (
      <div className="media-frame">
        <div>
          <div className="strong" style={{ color: 'var(--muted)', marginBottom: 6 }}>
            No visual bundled yet
          </div>
          <div className="tiny">
            Run <code>npm run fetch:media</code> to bundle an open exercise image set,
            or add your own clip in the exercise editor.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="media-frame" style={{ borderStyle: 'solid', padding: 0 }}>
      <img
        src={src}
        alt={`${exercise.name} demonstration`}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

export function TechniqueCard({ exercise }: { exercise: Exercise }) {
  return (
    <div className="stack">
      <ExerciseVisual exercise={exercise} />
      {exercise.setup && (
        <div>
          <div className="section-title" style={{ marginTop: 4 }}>
            Set up
          </div>
          <p className="small muted">{exercise.setup}</p>
        </div>
      )}
      {exercise.cues.length > 0 && (
        <div>
          <div className="section-title" style={{ marginTop: 4 }}>
            Cues
          </div>
          <ul className="cue-list small">
            {exercise.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </div>
      )}
      {exercise.faults && exercise.faults.length > 0 && (
        <div>
          <div className="section-title" style={{ marginTop: 4 }}>
            What usually goes wrong
          </div>
          <ul className="cue-list small muted">
            {exercise.faults.map((fault) => (
              <li key={fault}>{fault}</li>
            ))}
          </ul>
        </div>
      )}
      {exercise.progressionVariants && exercise.progressionVariants.length > 0 && (
        <div>
          <div className="section-title" style={{ marginTop: 4 }}>
            Easier to harder
          </div>
          <div className="row-wrap">
            {exercise.progressionVariants.map((variant, i) => (
              <span key={variant} className="pill">
                {i + 1}. {variant}
              </span>
            ))}
          </div>
        </div>
      )}
      {exercise.media?.attribution && (
        <p className="tiny dim">{exercise.media.attribution}</p>
      )}
    </div>
  );
}

export function TechniqueSheet({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  return (
    <Sheet title={exercise.name} onClose={onClose}>
      <div className="row-wrap" style={{ marginBottom: 14 }}>
        <span className="pill">{exercise.equipment}</span>
        {exercise.muscleGroups.map((group) => (
          <span key={group} className="pill">
            {group}
          </span>
        ))}
        {exercise.unilateral && <span className="pill">one side at a time</span>}
      </div>
      <TechniqueCard exercise={exercise} />
    </Sheet>
  );
}
