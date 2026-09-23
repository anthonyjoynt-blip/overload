import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CloseIcon } from './Icons';

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="card-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        {children}
        {footer && <div style={{ marginTop: 18 }}>{footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  label,
  suffix,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  label: string;
  suffix?: string;
}) {
  const clamp = (n: number) => {
    let next = n;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    return Number(next.toFixed(3));
  };

  return (
    <label className="field">
      <span>
        {label}
        {suffix ? ` (${suffix})` : ''}
      </span>
      <div className="stepper">
        <button
          type="button"
          onClick={() => onChange(clamp((value ?? 0) - step))}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          step={step}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? undefined : Number(raw));
          }}
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => onChange(clamp((value ?? 0) + step))}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Progress ring
// ---------------------------------------------------------------------------

export function ProgressRing({
  value,
  total,
  size = 54,
  label,
}: {
  value: number;
  total: number;
  size?: number;
  label?: string;
}) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? Math.min(1, value / total) : 0;

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg className="ring" width={size} height={size} aria-hidden>
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <span className="ring-label">{label ?? `${value}/${total}`}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rest timer
// ---------------------------------------------------------------------------

/** A short two-tone chime. Built on the fly so nothing has to be bundled. */
function playChime() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.34);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    // An audio failure must never interrupt a workout.
  }
}

export interface RestTimerState {
  seconds: number;
  key: string;
  label?: string;
}

/**
 * Counts down from a start time rather than by ticking a counter, so a
 * backgrounded tab or a locked phone comes back with the right number.
 */
export function RestTimer({
  state,
  onDone,
  onDismiss,
  sound,
  vibrate,
}: {
  state: RestTimerState;
  onDone: () => void;
  onDismiss: () => void;
  sound: boolean;
  vibrate: boolean;
}) {
  const [remaining, setRemaining] = useState(state.seconds);
  const startedAt = useRef(Date.now());
  const fired = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();
    fired.current = false;
    setRemaining(state.seconds);
  }, [state.key, state.seconds]);

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      const left = Math.max(0, state.seconds - elapsed);
      setRemaining(left);
      if (left <= 0 && !fired.current) {
        fired.current = true;
        if (sound) playChime();
        if (vibrate && 'vibrate' in navigator) navigator.vibrate?.([120, 60, 120]);
        onDone();
      }
    };
    const id = window.setInterval(tick, 200);
    tick();
    return () => window.clearInterval(id);
  }, [state.key, state.seconds, sound, vibrate, onDone]);

  const whole = Math.ceil(remaining);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  const pct = state.seconds > 0 ? (remaining / state.seconds) * 100 : 0;

  return (
    <div className="rest-bar" role="timer" aria-live="off">
      <div className="rest-bar-inner">
        <span className="rest-count">
          {minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`}
        </span>
        <div className="grow">
          <div className="strong small">Rest</div>
          <div className="tiny dim">{state.label ?? 'Next set when the timer ends'}</div>
        </div>
        <button
          className="btn btn-sm"
          onClick={() => {
            startedAt.current -= 30_000;
          }}
        >
          −30s
        </button>
        <button className="btn btn-sm btn-primary" onClick={onDismiss}>
          Skip
        </button>
      </div>
      <div className="rest-progress" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p className="small">{children}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}
