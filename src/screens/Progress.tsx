import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import {
  allMovementProgress,
  movementProgress,
  weightHistory,
  type MovementContext,
} from '../state/selectors';
import { WeightChart } from '../components/WeightChart';
import { Empty } from '../components/ui';
import { formatKey } from '../lib/dates';
import { formatWeight } from '../lib/units';
import { describeTarget } from '../lib/session';
import { BackIcon } from '../components/Icons';
import type { ProgressionStatus } from '../lib/progression';

const STATUS_LABEL: Record<ProgressionStatus, string> = {
  ready: 'Ready to progress',
  accepted: 'Jump taken',
  building: 'Building',
  settling: 'Settling in',
  deferred: 'Holding',
  'no-data': 'Not started',
  'not-tracked': 'Not auto-tracked',
};

const STATUS_PILL: Record<ProgressionStatus, string> = {
  ready: 'pill-good',
  accepted: 'pill-good',
  building: 'pill-accent',
  settling: 'pill-warn',
  deferred: '',
  'no-data': '',
  'not-tracked': '',
};

export function Progress() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const store = useStore();

  const contexts = useMemo(() => allMovementProgress(store), [store]);
  const single = useMemo(
    () => (exerciseId ? movementProgress(store, exerciseId) : null),
    [store, exerciseId],
  );

  if (exerciseId) {
    if (!single) {
      return (
        <Empty title="Nothing to show for that movement">
          It is not in a program and has no logged sets.
        </Empty>
      );
    }
    return <MovementDetail context={single} />;
  }

  const withHistory = contexts.filter((c) => c.sessions.length > 0);
  const untouched = contexts.filter((c) => c.sessions.length === 0);

  if (contexts.length === 0) {
    return (
      <Empty title="Nothing logged yet" action={<Link className="btn btn-primary" to="/">Start a session</Link>}>
        Log a session and the trend for every movement in it shows up here.
      </Empty>
    );
  }

  return (
    <div className="stack">
      <h1 style={{ marginTop: 4 }}>Progress</h1>

      {withHistory.length > 0 && (
        <>
          <div className="section-title">Trained</div>
          <div className="stack-sm">
            {withHistory
              .sort((a, b) => rank(a) - rank(b) || a.exercise.name.localeCompare(b.exercise.name))
              .map((context) => (
                <MovementRow key={context.exercise.id} context={context} />
              ))}
          </div>
        </>
      )}

      {untouched.length > 0 && (
        <>
          <div className="section-title">In the program, not yet logged</div>
          <div className="stack-sm">
            {untouched.map((context) => (
              <Link
                key={context.exercise.id}
                to={`/progress/${context.exercise.id}`}
                className="list-button"
              >
                <span className="grow small">{context.exercise.name}</span>
                <span className="tiny dim">
                  {describeTarget(context.prescription.programExercise, context.prescription.block.kind)}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function rank(context: MovementContext): number {
  const order: ProgressionStatus[] = [
    'ready',
    'accepted',
    'building',
    'settling',
    'deferred',
    'not-tracked',
    'no-data',
  ];
  return order.indexOf(context.progress.status);
}

function MovementRow({ context }: { context: MovementContext }) {
  const store = useStore();
  const { exercise, progress } = context;
  const history = weightHistory(context);
  const first = history[0]?.topWeight;
  const last = history.at(-1)?.topWeight;
  const gain = first != null && last != null ? last - first : undefined;

  return (
    <Link to={`/progress/${exercise.id}`} className="list-button">
      <span className="grow">
        <span className="strong">{exercise.name}</span>
        <span className="tiny dim" style={{ display: 'block' }}>
          {history.length} session{history.length === 1 ? '' : 's'}
          {last != null ? ` · now ${formatWeight(last, store.settings)}` : ''}
          {gain != null && gain > 0 ? ` · +${gain} since the first` : ''}
        </span>
      </span>
      <span className={`pill ${STATUS_PILL[progress.status]}`}>
        {progress.status === 'building'
          ? `${progress.streak}/${progress.requiredStreak}`
          : STATUS_LABEL[progress.status]}
      </span>
    </Link>
  );
}

function MovementDetail({ context }: { context: MovementContext }) {
  const store = useStore();
  const { exercise, progress, prescription } = context;
  const history = weightHistory(context);
  const [metric, setMetric] = useState<'weight' | 'reps' | 'volume'>(
    prescription.programExercise.weightMode === 'bodyweight' ? 'reps' : 'weight',
  );

  const recommendation = progress.recommendation;

  return (
    <div className="stack">
      <div className="row" style={{ marginTop: 4 }}>
        <Link to="/progress" className="icon-btn" aria-label="Back">
          <BackIcon />
        </Link>
        <div className="grow">
          <h1>{exercise.name}</h1>
          <p className="tiny dim">
            {describeTarget(prescription.programExercise, prescription.block.kind)} ·{' '}
            {prescription.origin}
          </p>
        </div>
      </div>

      <div className={`card ${progress.status === 'ready' ? 'card-accent' : ''}`}>
        <div className="card-head">
          <div className="grow">
            <span className={`pill ${STATUS_PILL[progress.status]}`}>
              {STATUS_LABEL[progress.status]}
            </span>
            <h3 style={{ marginTop: 10 }}>{progress.summary}</h3>
          </div>
        </div>

        <div className="row-wrap small muted">
          <span>
            Working weight: <strong>{formatWeight(progress.workingWeight, store.settings)}</strong>
          </span>
          <span>
            Streak: <strong>{progress.streak}</strong> of {progress.requiredStreak}
          </span>
          {progress.threshold && (
            <span>
              Qualifies at <strong>{progress.threshold.value}</strong>{' '}
              {progress.threshold.unit === 'seconds' ? 'seconds' : 'reps'} per set (
              {progress.threshold.explanation})
            </span>
          )}
        </div>

        {recommendation && (
          <div className="banner banner-good" style={{ marginTop: 14 }}>
            <strong>{recommendation.headline}.</strong> {recommendation.detail}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h3 className="grow">
            {metric === 'weight'
              ? 'Working weight over time'
              : metric === 'reps'
                ? 'Best set over time'
                : 'Volume over time'}
          </h3>
        </div>
        <div className="row-wrap" style={{ marginBottom: 12 }}>
          {(['weight', 'reps', 'volume'] as const).map((option) => (
            <button
              key={option}
              className={`pill ${metric === option ? 'pill-accent' : ''}`}
              style={{ cursor: 'pointer', minHeight: 34 }}
              onClick={() => setMetric(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <WeightChart
          points={history}
          metric={metric}
          unit={store.settings.units}
          title={`${exercise.name} — ${metric}`}
        />
        <p className="tiny dim" style={{ marginTop: 10 }}>
          Filled dots are sessions that qualified toward a jump; hollow dots did not.
        </p>
      </div>

      <div className="section-title">Every session</div>
      <div className="stack-sm">
        {[...progress.verdicts].reverse().map((verdict) => (
          <div key={verdict.sessionId} className="card card-tight">
            <div className="row">
              <span className="grow small strong">{formatKey(verdict.date, { weekday: true })}</span>
              <span className={`pill ${verdict.qualifies ? 'pill-good' : ''}`}>
                {verdict.qualifies ? 'qualified' : 'no'}
              </span>
            </div>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              {formatWeight(verdict.weight, store.settings)} · {verdict.reason}
            </p>
          </div>
        ))}
        {progress.verdicts.length === 0 && (
          <p className="small muted">No sessions logged for this movement yet.</p>
        )}
      </div>
    </div>
  );
}
