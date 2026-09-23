import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { activeProgram, sessionsOnDate } from '../state/selectors';
import { resolveWorkout } from '../lib/schedule';
import {
  WEEKDAY_INITIALS,
  formatKey,
  fromKey,
  isSameMonth,
  monthGrid,
  monthLabel,
  todayKey,
} from '../lib/dates';
import { Empty, Sheet } from '../components/ui';
import type { DateKey, ScheduledSession } from '../types';

export function CalendarScreen() {
  const store = useStore();
  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const d = fromKey(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState<DateKey>(today);
  const [moving, setMoving] = useState<ScheduledSession | null>(null);

  const program = activeProgram(store);
  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  const byDate = useMemo(() => {
    const map = new Map<DateKey, ScheduledSession[]>();
    for (const session of store.sessions) {
      const list = map.get(session.date) ?? [];
      list.push(session);
      map.set(session.date, list);
    }
    return map;
  }, [store.sessions]);

  if (store.sessions.length === 0) {
    return (
      <Empty
        title="Nothing on the calendar"
        action={
          <Link to="/programs" className="btn btn-primary">
            Schedule a program
          </Link>
        }
      >
        Put a program on the calendar and its sessions land on the days you train.
      </Empty>
    );
  }

  const step = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const selectedSessions = sessionsOnDate(store.sessions, selected);

  return (
    <div className="stack">
      <div className="row" style={{ marginTop: 4 }}>
        <h1 className="grow">{monthLabel(cursor.year, cursor.month)}</h1>
        <button className="btn btn-sm" onClick={() => step(-1)} aria-label="Previous month">
          ‹
        </button>
        <button
          className="btn btn-sm"
          onClick={() => {
            const d = fromKey(today);
            setCursor({ year: d.getFullYear(), month: d.getMonth() });
            setSelected(today);
          }}
        >
          Today
        </button>
        <button className="btn btn-sm" onClick={() => step(1)} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="card card-tight">
        <div className="cal-grid" style={{ marginBottom: 2 }}>
          {WEEKDAY_INITIALS.map((initial, i) => (
            <div key={i} className="cal-head">
              {initial}
            </div>
          ))}
        </div>
        <div className="cal-grid">
          {grid.map((date) => {
            const sessions = byDate.get(date) ?? [];
            return (
              <button
                key={date}
                className={[
                  'cal-day',
                  isSameMonth(date, cursor.year, cursor.month) ? '' : 'outside',
                  date === today ? 'today' : '',
                  date === selected ? 'selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelected(date)}
              >
                <span>{fromKey(date).getDate()}</span>
                <span className="marks">
                  {sessions.slice(0, 3).map((s) => (
                    <span
                      key={s.id}
                      className={`mark ${s.status === 'done' ? 'done' : s.status === 'skipped' ? 'skipped' : ''}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="row" style={{ marginTop: 2 }}>
        <h2 className="grow">{formatKey(selected, { weekday: true })}</h2>
        {selected === today && <span className="pill pill-accent">Today</span>}
      </div>

      {selectedSessions.length === 0 ? (
        <div className="card">
          <p className="small muted">Rest day — nothing scheduled.</p>
        </div>
      ) : (
        selectedSessions.map((session) => (
          <DayCard
            key={session.id}
            session={session}
            onMove={() => setMoving(session)}
          />
        ))
      )}

      <p className="tiny dim" style={{ marginTop: 6 }}>
        Moving one day moves only that day — the rest of the pattern stays where it is.
      </p>

      {moving && (
        <MoveSheet
          session={moving}
          onClose={() => setMoving(null)}
          onMoved={(date) => {
            setSelected(date);
            setMoving(null);
          }}
        />
      )}

      {program && (
        <p className="tiny dim center" style={{ marginTop: 16 }}>
          {program.name} ·{' '}
          <Link to="/programs">change program or training days</Link>
        </p>
      )}
    </div>
  );
}

function DayCard({
  session,
  onMove,
}: {
  session: ScheduledSession;
  onMove: () => void;
}) {
  const store = useStore();
  const navigate = useNavigate();
  const program = store.programs.find((p) => p.id === session.programId);
  const resolved = program ? resolveWorkout(program, session) : null;
  const phase = program?.phases.find((p) => p.id === session.phaseId);
  const logged = store.sets.filter((s) => s.sessionId === session.id).length;

  return (
    <div className="card">
      <div className="card-head">
        <div className="grow">
          <p className="tiny dim" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {phase?.name} · week {session.phaseWeek}
            {session.weekType !== 'normal' ? ` · ${session.weekType}` : ''}
          </p>
          <h3 style={{ marginTop: 4 }}>
            {resolved
              ? resolved.option
                ? `${resolved.workout.name} — ${resolved.option.name}`
                : resolved.workout.name
              : 'Session'}
          </h3>
        </div>
        <span
          className={`pill ${
            session.status === 'done'
              ? 'pill-good'
              : session.status === 'skipped'
                ? ''
                : 'pill-accent'
          }`}
        >
          {session.status}
        </span>
      </div>

      {session.movedFrom && (
        <p className="tiny dim" style={{ marginBottom: 10 }}>
          Moved from {formatKey(session.movedFrom)}.
        </p>
      )}

      <div className="row-wrap">
        <button className="btn btn-sm btn-primary" onClick={() => navigate(`/session/${session.id}`)}>
          {session.status === 'done' ? 'Review' : logged > 0 ? 'Continue' : 'Open'}
        </button>
        <button className="btn btn-sm" onClick={onMove}>
          Move
        </button>
        {session.status !== 'skipped' ? (
          <button
            className="btn btn-sm"
            onClick={() => store.updateSession({ ...session, status: 'skipped' })}
          >
            Skip
          </button>
        ) : (
          <button
            className="btn btn-sm"
            onClick={() => store.updateSession({ ...session, status: 'upcoming' })}
          >
            Un-skip
          </button>
        )}
        {session.status === 'done' && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => store.updateSession({ ...session, status: 'upcoming', completedAt: undefined })}
          >
            Re-open
          </button>
        )}
      </div>
    </div>
  );
}

function MoveSheet({
  session,
  onClose,
  onMoved,
}: {
  session: ScheduledSession;
  onClose: () => void;
  onMoved: (date: DateKey) => void;
}) {
  const store = useStore();
  const [date, setDate] = useState(session.date);

  return (
    <Sheet title="Move this session" onClose={onClose}>
      <p className="small muted" style={{ marginBottom: 14 }}>
        Currently {formatKey(session.date, { weekday: true })}. Everything logged against it
        moves with it.
      </p>
      <label className="field">
        <span>New date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn grow" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary grow"
          disabled={!date || date === session.date}
          onClick={async () => {
            await store.moveSession(session.id, date);
            onMoved(date);
          }}
        >
          Move
        </button>
      </div>
    </Sheet>
  );
}
