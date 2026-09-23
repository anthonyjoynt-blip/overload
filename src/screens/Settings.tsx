import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { parseBackup } from '../db/repo';
import {
  DEFAULT_DUMBBELL_LADDER_KG,
  DEFAULT_DUMBBELL_LADDER_LB,
} from '../lib/units';
import { Sheet } from '../components/ui';
import { BackIcon } from '../components/Icons';
import type { ProgressionConfig } from '../types';

export function SettingsScreen() {
  const store = useStore();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<{ kind: 'good' | 'danger'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [ladderText, setLadderText] = useState(store.settings.dumbbellLadder.join(', '));

  const { settings } = store;
  const progression: ProgressionConfig = settings.defaultProgression;

  const download = async () => {
    const backup = await store.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `overload-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({
      kind: 'good',
      text: `Exported ${backup.sets.length} logged sets and ${backup.programs.length} programs.`,
    });
  };

  const restore = async (file: File, mode: 'merge' | 'replace') => {
    try {
      const backup = parseBackup(await file.text());
      const report = await store.importBackup(backup, mode);
      setMessage({
        kind: 'good',
        text: `Imported ${report.sets} sets, ${report.sessions} sessions, ${report.programs} programs.`,
      });
    } catch (e) {
      setMessage({
        kind: 'danger',
        text: e instanceof Error ? e.message : 'Could not read that file.',
      });
    }
  };

  return (
    <div className="stack">
      <div className="row" style={{ marginTop: 4 }}>
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <BackIcon />
        </button>
        <h1 className="grow">Settings</h1>
      </div>

      {message && (
        <div className={`banner banner-${message.kind === 'good' ? 'good' : 'danger'}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        <h3>Units and equipment</h3>
        <div className="stack" style={{ marginTop: 14 }}>
          <div className="row">
            {(['lb', 'kg'] as const).map((unit) => (
              <button
                key={unit}
                className={`btn grow ${settings.units === unit ? 'btn-primary' : ''}`}
                onClick={() => {
                  const ladder =
                    unit === 'lb' ? DEFAULT_DUMBBELL_LADDER_LB : DEFAULT_DUMBBELL_LADDER_KG;
                  setLadderText(ladder.join(', '));
                  store.saveSettings({
                    units: unit,
                    dumbbellLadder: ladder,
                    smallestIncrement: unit === 'lb' ? 2.5 : 1.25,
                  });
                }}
              >
                {unit}
              </button>
            ))}
          </div>
          <p className="tiny dim">
            Switching units swaps the default rack and increment. It does not convert weights
            you have already logged.
          </p>

          <label className="field">
            <span>Smallest increment you can actually make ({settings.units})</span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={settings.smallestIncrement}
              onChange={(e) =>
                store.saveSettings({ smallestIncrement: Math.max(0.5, Number(e.target.value)) })
              }
            />
          </label>

          <label className="field">
            <span>Dumbbell and kettlebell sizes your gym has</span>
            <input
              type="text"
              value={ladderText}
              onChange={(e) => setLadderText(e.target.value)}
              onBlur={() => {
                const ladder = ladderText
                  .split(/[,\s]+/)
                  .map(Number)
                  .filter((n) => Number.isFinite(n) && n > 0)
                  .sort((a, b) => a - b);
                if (ladder.length > 0) {
                  store.saveSettings({ dumbbellLadder: ladder });
                  setLadderText(ladder.join(', '));
                }
              }}
            />
          </label>
          <p className="tiny dim">
            Dumbbell movements jump to the next size on this list rather than by a fixed amount.
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Progression rule</h3>
        <p className="small muted" style={{ marginTop: 8 }}>
          The default for every movement. Any movement can override it in the program builder.
        </p>
        <div className="stack" style={{ marginTop: 14 }}>
          <label className="field">
            <span>Qualifying sessions in a row before a jump is flagged</span>
            <input
              type="number"
              min={1}
              max={6}
              value={progression.requiredStreak}
              onChange={(e) =>
                store.saveSettings({
                  defaultProgression: {
                    ...progression,
                    requiredStreak: Math.max(1, Number(e.target.value)),
                  },
                })
              }
            />
          </label>

          <label className="field">
            <span>Rule</span>
            <select
              value={progression.mode}
              onChange={(e) =>
                store.saveSettings({
                  defaultProgression: {
                    ...progression,
                    mode: e.target.value as ProgressionConfig['mode'],
                  },
                })
              }
            >
              <option value="both">
                Combined — top of the range, or the 2-for-2 rule on fixed reps
              </option>
              <option value="double">Double progression — top of the range</option>
              <option value="two-for-two">2-for-2 — two reps past the goal, always</option>
            </select>
          </label>

          <label className="field">
            <span>Reps past the goal the 2-for-2 rule needs</span>
            <input
              type="number"
              min={1}
              max={5}
              value={progression.twoForTwoBonus}
              onChange={(e) =>
                store.saveSettings({
                  defaultProgression: {
                    ...progression,
                    twoForTwoBonus: Math.max(1, Number(e.target.value)),
                  },
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Rest timer</h3>
        <label className="checkline">
          <input
            type="checkbox"
            checked={settings.restTimerSound}
            onChange={(e) => store.saveSettings({ restTimerSound: e.target.checked })}
          />
          <span className="small">Chime when rest is up</span>
        </label>
        <label className="checkline">
          <input
            type="checkbox"
            checked={settings.restTimerVibrate}
            onChange={(e) => store.saveSettings({ restTimerVibrate: e.target.checked })}
          />
          <span className="small">Vibrate when rest is up</span>
        </label>
      </div>

      <div className="card">
        <h3>Your data</h3>
        <p className="small muted" style={{ marginTop: 8 }}>
          Everything lives in this browser and nowhere else. Clearing site data, switching
          browsers or getting a new phone loses it — so export now and then.
        </p>
        <div className="row-wrap" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={download}>
            Export a backup
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Import a backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await restore(file, 'merge');
              e.target.value = '';
            }}
          />
        </div>
        <p className="tiny dim" style={{ marginTop: 10 }}>
          Importing merges by id: the same backup twice changes nothing, and two devices'
          histories add together.
        </p>

        <div className="divider" />

        <button className="btn btn-danger btn-block" onClick={() => setConfirmReset(true)}>
          Erase everything and start over
        </button>
      </div>

      <p className="tiny dim center" style={{ marginTop: 10 }}>
        {store.sets.length} sets · {store.sessions.filter((s) => s.status === 'done').length}{' '}
        sessions logged · {store.exercises.length} movements
      </p>

      {confirmReset && (
        <Sheet title="Erase everything?" onClose={() => setConfirmReset(false)}>
          <p className="small muted">
            This deletes every logged set, session and program in this browser and re-seeds the
            starting library. It cannot be undone. Export a backup first if you might want any
            of it back.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn grow" onClick={() => setConfirmReset(false)}>
              Keep my data
            </button>
            <button
              className="btn btn-danger grow"
              onClick={async () => {
                await store.resetEverything();
                setConfirmReset(false);
                setMessage({ kind: 'good', text: 'Everything erased and re-seeded.' });
              }}
            >
              Erase it all
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
