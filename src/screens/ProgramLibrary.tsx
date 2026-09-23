import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { activeProgram } from '../state/selectors';
import { planProgram, sessionsPerWeek } from '../lib/schedule';
import { parseProgramTable } from '../lib/parseProgram';
import { WEEKDAY_LABELS, todayKey } from '../lib/dates';
import { newId } from '../lib/id';
import { Sheet } from '../components/ui';
import { PlusIcon } from '../components/Icons';
import type { Program, Schedule } from '../types';

export function ProgramLibrary() {
  const store = useStore();
  const [scheduling, setScheduling] = useState<Program | null>(null);
  const [uploading, setUploading] = useState(false);

  const active = activeProgram(store);
  const live = store.programs.filter((p) => !p.retired);
  const retired = store.programs.filter((p) => p.retired);

  return (
    <div className="stack">
      <div className="row" style={{ marginTop: 4 }}>
        <h1 className="grow">Programs</h1>
      </div>

      {live.map((program) => (
        <ProgramCard
          key={program.id}
          program={program}
          isActive={program.id === active?.id}
          schedule={store.schedules.find((s) => s.programId === program.id && s.active)}
          onSchedule={() => setScheduling(program)}
        />
      ))}

      <div className="row" style={{ marginTop: 6 }}>
        <button className="btn grow" onClick={() => setUploading(true)}>
          Upload a program
        </button>
        <NewProgramButton />
      </div>

      {retired.length > 0 && (
        <>
          <div className="section-title">Retired</div>
          {retired.map((program) => (
            <div key={program.id} className="card card-tight">
              <div className="row">
                <span className="grow strong">{program.name}</span>
                <button
                  className="btn btn-sm"
                  onClick={() => store.saveProgram({ ...program, retired: false })}
                >
                  Restore
                </button>
              </div>
              <p className="tiny dim" style={{ marginTop: 6 }}>
                Its logged history is still counted on the progress screen.
              </p>
            </div>
          ))}
        </>
      )}

      {scheduling && (
        <ScheduleSheet
          program={scheduling}
          existing={store.schedules.find((s) => s.programId === scheduling.id)}
          onClose={() => setScheduling(null)}
        />
      )}

      {uploading && <UploadSheet onClose={() => setUploading(false)} />}
    </div>
  );
}

function NewProgramButton() {
  const store = useStore();
  const navigate = useNavigate();
  return (
    <button
      className="btn btn-primary grow"
      onClick={async () => {
        const now = Date.now();
        const program: Program = {
          id: newId('program'),
          name: 'New program',
          source: 'Built here',
          phases: [
            {
              id: newId('phase'),
              name: 'Phase I',
              weeks: 8,
              workouts: [
                { id: newId('workout'), name: 'Day 1', kind: 'fixed', blocks: [] },
              ],
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        await store.saveProgram(program);
        navigate(`/programs/${program.id}`);
      }}
    >
      <PlusIcon />
      Build one
    </button>
  );
}

function ProgramCard({
  program,
  isActive,
  schedule,
  onSchedule,
}: {
  program: Program;
  isActive: boolean;
  schedule?: Schedule;
  onSchedule: () => void;
}) {
  const store = useStore();
  const navigate = useNavigate();
  const totalWorkouts = program.phases.reduce((sum, p) => sum + p.workouts.length, 0);
  const totalWeeks = program.phases.reduce((sum, p) => sum + p.weeks, 0);
  const planned = planProgram(program, schedule?.includeOptional ?? false).length;

  return (
    <div className={`card ${isActive ? 'card-accent' : ''}`}>
      <div className="card-head">
        <div className="grow">
          <h2>{program.name}</h2>
          <p className="tiny dim" style={{ marginTop: 4 }}>
            {program.phases.length} phase{program.phases.length === 1 ? '' : 's'} ·{' '}
            {totalWeeks} weeks · {totalWorkouts} workouts
            {schedule ? ` · ${planned} sessions planned` : ''}
          </p>
        </div>
        {isActive && <span className="pill pill-accent">Active</span>}
      </div>

      {program.description && (
        <p className="small muted" style={{ marginBottom: 12 }}>
          {program.description}
        </p>
      )}

      {schedule && (
        <p className="tiny muted" style={{ marginBottom: 12 }}>
          {schedule.mode === 'weekdays'
            ? `Training ${(schedule.weekdays ?? []).map((d) => WEEKDAY_LABELS[d]).join(', ')}`
            : `${schedule.rotationDaysOn} days on, ${schedule.rotationDaysOff} off`}
          {schedule.includeOptional ? ', optional days included' : ''}
        </p>
      )}

      <div className="row-wrap">
        <button className="btn btn-sm btn-primary" onClick={onSchedule}>
          {schedule ? 'Re-schedule' : 'Put on the calendar'}
        </button>
        <button className="btn btn-sm" onClick={() => navigate(`/programs/${program.id}`)}>
          Edit
        </button>
        <button
          className="btn btn-sm"
          onClick={async () => {
            const now = Date.now();
            await store.saveProgram({
              ...structuredClone(program),
              id: newId('program'),
              name: `${program.name} (copy)`,
              createdAt: now,
              updatedAt: now,
            });
          }}
        >
          Duplicate
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => store.saveProgram({ ...program, retired: true })}
        >
          Retire
        </button>
      </div>
      {program.source && (
        <p className="tiny dim" style={{ marginTop: 12 }}>
          Source: {program.source}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ScheduleSheet({
  program,
  existing,
  onClose,
}: {
  program: Program;
  existing?: Schedule;
  onClose: () => void;
}) {
  const store = useStore();
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayKey());
  const [mode, setMode] = useState<Schedule['mode']>(existing?.mode ?? 'weekdays');
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? [1, 2, 3, 4, 5, 6]);
  const [daysOn, setDaysOn] = useState(existing?.rotationDaysOn ?? 3);
  const [daysOff, setDaysOff] = useState(existing?.rotationDaysOff ?? 1);
  const [includeOptional, setIncludeOptional] = useState(existing?.includeOptional ?? false);
  const [saving, setSaving] = useState(false);

  const perWeek = sessionsPerWeek(program, includeOptional);
  const chosen = mode === 'weekdays' ? weekdays.length : (daysOn / (daysOn + daysOff)) * 7;
  const mismatch = mode === 'weekdays' && weekdays.length > 0 && weekdays.length !== perWeek;

  const toggle = (day: number) =>
    setWeekdays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort(),
    );

  return (
    <Sheet title={`Schedule ${program.name}`} onClose={onClose}>
      <div className="stack">
        <label className="field">
          <span>Start date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>

        <div className="row">
          <button
            className={`btn grow ${mode === 'weekdays' ? 'btn-primary' : ''}`}
            onClick={() => setMode('weekdays')}
          >
            Set weekdays
          </button>
          <button
            className={`btn grow ${mode === 'rotation' ? 'btn-primary' : ''}`}
            onClick={() => setMode('rotation')}
          >
            Rotation
          </button>
        </div>

        {mode === 'weekdays' ? (
          <div className="row-wrap">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={day}
                className={`pill ${weekdays.includes(day) ? 'pill-accent' : ''}`}
                style={{ cursor: 'pointer', minHeight: 40, padding: '0 14px' }}
                onClick={() => toggle(day)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="row">
            <label className="field grow">
              <span>Days on</span>
              <input
                type="number"
                min={1}
                value={daysOn}
                onChange={(e) => setDaysOn(Math.max(1, Number(e.target.value)))}
              />
            </label>
            <label className="field grow">
              <span>Days off</span>
              <input
                type="number"
                min={0}
                value={daysOff}
                onChange={(e) => setDaysOff(Math.max(0, Number(e.target.value)))}
              />
            </label>
          </div>
        )}

        <label className="checkline">
          <input
            type="checkbox"
            checked={includeOptional}
            onChange={(e) => setIncludeOptional(e.target.checked)}
          />
          <span className="small">Include the optional days</span>
        </label>

        <p className="small muted">
          This program asks for <strong>{perWeek}</strong> sessions a week. You have picked{' '}
          <strong>{Math.round(chosen * 10) / 10}</strong> training days a week.
        </p>

        {mismatch && (
          <div className="banner banner-warn">
            Those do not match, which is allowed — sessions just run in order and a program
            week will drift across calendar weeks.
          </div>
        )}

        <button
          className="btn btn-primary btn-lg btn-block"
          disabled={saving || (mode === 'weekdays' && weekdays.length === 0)}
          onClick={async () => {
            setSaving(true);
            try {
              await store.scheduleProgram({
                programId: program.id,
                startDate,
                mode,
                weekdays: mode === 'weekdays' ? weekdays : undefined,
                rotationDaysOn: mode === 'rotation' ? daysOn : undefined,
                rotationDaysOff: mode === 'rotation' ? daysOff : undefined,
                includeOptional,
              });
              onClose();
            } finally {
              setSaving(false);
            }
          }}
        >
          {existing ? 'Re-schedule' : 'Put on the calendar'}
        </button>

        {existing && (
          <p className="tiny dim">
            Re-scheduling rebuilds the upcoming days. Sessions you have already logged against
            stay exactly where they are.
          </p>
        )}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

const SAMPLE = `Day,Exercise,Sets,Reps,Rest,Starting Weight
Push,Barbell Bench Press,3,8-12,90,135
Push,Dumbbell Shoulder Press,3,8-12,90,40
Push,Triceps Pushdown,3,10-15,60,50
Pull,Barbell Row,3,8-12,90,115
Pull,Lat Pulldown,3,8-12,90,120
Pull,Dumbbell Curl,3,10-12,60,25
Legs,Barbell Back Squat,3,8-12,120,185
Legs,Romanian Deadlift,3,8-12,90,135
Legs,Standing Calf Raise,4,12-15,45,90`;

function UploadSheet({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [name, setName] = useState('My program');
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return { result: parseProgramTable(text, store.exercises, name), error: null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : 'Could not read that.' };
    }
  }, [text, store.exercises, name]);

  return (
    <Sheet title="Upload a program" onClose={onClose}>
      <p className="small muted" style={{ marginBottom: 14 }}>
        Paste a table — CSV, tab-separated, or a markdown table. Columns it understands:
        Phase, Weeks, Day, Group, Exercise, Sets, Reps, Rest, Weight, Notes. Only
        Exercise is required.
      </p>

      <label className="field" style={{ marginBottom: 12 }}>
        <span>Program name</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="field">
        <span>The table</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={SAMPLE}
          spellCheck={false}
        />
      </label>

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn btn-sm" onClick={() => setText(SAMPLE)}>
          Use the example
        </button>
        <label className="btn btn-sm">
          Choose a file
          <input
            type="file"
            accept=".csv,.tsv,.txt,.md"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setText(await file.text());
              setName(file.name.replace(/\.[^.]+$/, ''));
            }}
          />
        </label>
      </div>

      {preview?.error && (
        <div className="banner banner-danger" style={{ marginTop: 14 }}>
          {preview.error}
        </div>
      )}

      {preview?.result && (
        <div style={{ marginTop: 14 }}>
          <div className="banner banner-good">
            Read {preview.result.rowCount} rows into{' '}
            {preview.result.program.phases.length} phase
            {preview.result.program.phases.length === 1 ? '' : 's'} and{' '}
            {preview.result.program.phases.reduce((n, p) => n + p.workouts.length, 0)} days.
          </div>
          {preview.result.warnings.length > 0 && (
            <ul className="cue-list tiny muted" style={{ marginTop: 12 }}>
              {preview.result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="banner banner-danger" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary btn-lg btn-block"
        style={{ marginTop: 16 }}
        disabled={!preview?.result}
        onClick={async () => {
          if (!preview?.result) return;
          setError(null);
          try {
            for (const exercise of preview.result.createdExercises) {
              await store.saveExercise({ ...exercise, custom: true });
            }
            await store.saveProgram(preview.result.program);
            onClose();
            navigate(`/programs/${preview.result.program.id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save that program.');
          }
        }}
      >
        Save program
      </button>
    </Sheet>
  );
}
