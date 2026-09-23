import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import {
  activeProgram,
  allMovementProgress,
  missedSessions,
  nextSessions,
  readyToProgress,
  sessionStreak,
  sessionsOnDate,
  exerciseMap,
  type MovementContext,
} from '../state/selectors';
import { effectiveBlocks, resolveWorkout } from '../lib/schedule';
import { describeTarget } from '../lib/session';
import { formatKey, relativeDayLabel, todayKey } from '../lib/dates';
import { formatWeight } from '../lib/units';
import { Empty, ProgressRing, Sheet } from '../components/ui';
import { TrendUpIcon } from '../components/Icons';
import type { ScheduledSession, Workout } from '../types';

export function Today() {
  const store = useStore();
  const navigate = useNavigate();
  const today = todayKey();

  const program = activeProgram(store);
  const todays = sessionsOnDate(store.sessions, today);
  const missed = missedSessions(store.sessions);
  const upcoming = nextSessions(store.sessions, 4).filter((s) => s.date !== today);
  const streak = sessionStreak(store.sessions);

  const contexts = useMemo(() => allMovementProgress(store), [store]);
  const ready = readyToProgress(contexts);

  if (!program || store.schedules.every((s) => !s.active)) {
    return (
      <Empty
        title="No program on the calendar yet"
        action={
          <Link to="/programs" className="btn btn-primary">
            Choose a program
          </Link>
        }
      >
        Pick a program, set which days you train, and today's session shows up here.
      </Empty>
    );
  }

  return (
    <div className="stack">
      <div className="row" style={{ marginTop: 4, marginBottom: 2 }}>
        <div className="grow">
          <h1>{relativeDayLabel(today)}</h1>
          <p className="muted small">{formatKey(today, { weekday: true })}</p>
        </div>
        {streak > 0 && (
          <span className="pill pill-good">
            <span className="dot" />
            {streak} session{streak === 1 ? '' : 's'} in a row
          </span>
        )}
      </div>

      {todays.length === 0 ? (
        <div className="card">
          <h2>Rest day</h2>
          <p className="muted small" style={{ marginTop: 8 }}>
            Nothing scheduled. {upcoming[0] ? `Next up ${relativeDayLabel(upcoming[0].date)}.` : ''}
          </p>
        </div>
      ) : (
        todays.map((session) => (
          <SessionCard key={session.id} session={session} onStart={(id) => navigate(`/session/${id}`)} />
        ))
      )}

      {ready.length > 0 && (
        <>
          <div className="section-title">Ready to progress</div>
          <div className="stack-sm">
            {ready.map((context) => (
              <ReadyCard key={context.exercise.id} context={context} />
            ))}
          </div>
        </>
      )}

      {missed.length > 0 && (
        <>
          <div className="section-title">Missed</div>
          <div className="banner banner-warn">
            {missed.length} scheduled session{missed.length === 1 ? '' : 's'} before today
            {' '}
            {missed.length === 1 ? 'was' : 'were'} never logged.{' '}
            <Link to="/calendar">Move or skip them</Link> so the plan stays honest.
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <div className="section-title">Coming up</div>
          <div className="stack-sm">
            {upcoming.map((session) => (
              <UpcomingRow key={session.id} session={session} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SessionCard({
  session,
  onStart,
}: {
  session: ScheduledSession;
  onStart: (id: string) => void;
}) {
  const store = useStore();
  const [choosing, setChoosing] = useState(false);

  const program = store.programs.find((p) => p.id === session.programId);
  const resolved = program ? resolveWorkout(program, session) : null;
  const byId = useMemo(() => exerciseMap(store.exercises), [store.exercises]);
  const phase = program?.phases.find((p) => p.id === session.phaseId);

  if (!program || !resolved) {
    return (
      <div className="card">
        <h2>Scheduled session</h2>
        <p className="muted small">
          The workout this day points at is no longer in the program. Remove it from the
          calendar or re-schedule the program.
        </p>
      </div>
    );
  }

  const { workout } = resolved;
  const needsChoice = workout.kind === 'choice' && !session.chosenOptionId;
  const blocks = effectiveBlocks(resolved);
  const loggedSets = store.sets.filter((s) => s.sessionId === session.id);
  const totalSets = blocks.reduce(
    (sum, block) =>
      sum +
      block.exercises.reduce(
        (inner, pe) => inner + (block.kind === 'circuit' ? (block.rounds ?? 1) * pe.sets : pe.sets),
        0,
      ),
    0,
  );

  const done = session.status === 'done';

  return (
    <div className={`card ${done ? '' : 'card-accent'}`}>
      <div className="card-head">
        <div className="grow">
          <p className="tiny dim" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {program.name} · {phase?.name} · week {session.phaseWeek}
            {session.weekType !== 'normal' ? ` · ${session.weekType} week` : ''}
          </p>
          <h2 style={{ marginTop: 4 }}>
            {resolved.option ? `${workout.name} — ${resolved.option.name}` : workout.name}
          </h2>
        </div>
        {loggedSets.length > 0 && <ProgressRing value={loggedSets.length} total={totalSets} />}
      </div>

      {workout.notes && <p className="tiny muted" style={{ marginBottom: 10 }}>{workout.notes}</p>}

      {needsChoice ? (
        <>
          <p className="small muted" style={{ marginBottom: 12 }}>
            This day is a choice — pick one.
          </p>
          <div className="stack-sm">
            {(workout.options ?? []).map((option) => (
              <button
                key={option.id}
                className="list-button"
                onClick={async () => {
                  await store.updateSession({ ...session, chosenOptionId: option.id });
                  onStart(session.id);
                }}
              >
                <span className="grow strong">{option.name}</span>
                <span className="tiny dim">
                  {option.blocks.flatMap((b) => b.exercises).length} movements
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="stack-sm" style={{ marginBottom: 16 }}>
            {blocks.map((block) => (
              <div key={block.id}>
                {block.kind !== 'straight' && (
                  <p className="tiny pill pill-accent" style={{ marginBottom: 6 }}>
                    {block.label ?? (block.kind === 'circuit' ? 'Circuit' : 'Superset')}
                  </p>
                )}
                {block.exercises.map((pe) => {
                  const exercise = byId.get(pe.exerciseId);
                  return (
                    <div key={pe.id} className="row small" style={{ padding: '5px 0' }}>
                      <span className="grow">
                        {exercise?.name ?? 'Unknown movement'}
                        {pe.optional && <span className="dim tiny"> · optional</span>}
                      </span>
                      <span className="dim num tiny">{describeTarget(pe, block.kind)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="row">
            <button
              className="btn btn-primary btn-lg grow"
              onClick={() => onStart(session.id)}
            >
              {done ? 'Review session' : loggedSets.length > 0 ? 'Continue session' : 'Start session'}
            </button>
            {workout.kind === 'choice' && (
              <button className="btn btn-lg" onClick={() => setChoosing(true)}>
                Swap
              </button>
            )}
          </div>
        </>
      )}

      {choosing && (
        <ChoiceSheet
          workout={workout}
          onPick={async (option) => {
            await store.updateSession({ ...session, chosenOptionId: option.id });
            setChoosing(false);
          }}
          onClose={() => setChoosing(false)}
        />
      )}
    </div>
  );
}

function ChoiceSheet({
  workout,
  onPick,
  onClose,
}: {
  workout: Workout;
  onPick: (option: Workout) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={workout.name} onClose={onClose}>
      <div className="stack-sm">
        {(workout.options ?? []).map((option) => (
          <button key={option.id} className="list-button" onClick={() => onPick(option)}>
            <span className="grow strong">{option.name}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

function ReadyCard({ context }: { context: MovementContext }) {
  const store = useStore();
  const { exercise, progress } = context;
  const recommendation = progress.recommendation;
  if (!recommendation) return null;

  const latest = progress.verdicts.at(-1);
  const existing = store.progression.find((p) => p.exerciseId === exercise.id);

  const accept = async () => {
    await store.saveProgression({
      ...existing,
      exerciseId: exercise.id,
      workingWeight: recommendation.suggestedWeight ?? progress.workingWeight,
      currentVariant:
        recommendation.kind === 'harder-variant'
          ? recommendation.headline.replace(/^Move up to /, '')
          : existing?.currentVariant,
      lastIncreaseAt: Date.now(),
      // The streak is derived from the logs, so without marking this session
      // answered the same flag would fire again until the heavier one is logged.
      acceptedAfterSessionId: latest?.sessionId,
      deferredAfterSessionId: undefined,
    });
  };

  const defer = async () => {
    await store.saveProgression({
      ...existing,
      exerciseId: exercise.id,
      deferredAfterSessionId: latest?.sessionId,
      acceptedAfterSessionId: undefined,
    });
  };

  return (
    <div className="card card-tight">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="pill pill-good" style={{ marginTop: 2 }}>
          <TrendUpIcon />
        </span>
        <div className="grow">
          <h3>{exercise.name}</h3>
          <p className="small" style={{ color: 'var(--good)', marginTop: 2 }}>
            {recommendation.headline}
          </p>
          <p className="tiny muted" style={{ marginTop: 6 }}>
            {progress.streak} qualifying session{progress.streak === 1 ? '' : 's'} in a row at{' '}
            {formatWeight(progress.workingWeight, store.settings)} —{' '}
            {progress.threshold?.explanation}. {recommendation.detail}
          </p>
        </div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-sm btn-primary grow" onClick={accept}>
          {recommendation.suggestedWeight != null
            ? `Use ${formatWeight(recommendation.suggestedWeight, store.settings)}`
            : 'Accept'}
        </button>
        <button className="btn btn-sm grow" onClick={defer}>
          Not yet
        </button>
        <Link className="btn btn-sm" to={`/progress/${exercise.id}`}>
          History
        </Link>
      </div>
    </div>
  );
}

function UpcomingRow({ session }: { session: ScheduledSession }) {
  const store = useStore();
  const program = store.programs.find((p) => p.id === session.programId);
  const resolved = program ? resolveWorkout(program, session) : null;
  return (
    <Link to="/calendar" className="list-button">
      <span className="pill">{relativeDayLabel(session.date)}</span>
      <span className="grow small">{resolved?.workout.name ?? 'Session'}</span>
      <span className="tiny dim">{formatKey(session.date)}</span>
    </Link>
  );
}
