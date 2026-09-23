import { useEffect, useMemo, useRef, useState } from 'react';
import type { HistoryPoint } from '../state/selectors';
import { formatKey } from '../lib/dates';

/**
 * Working weight over time.
 *
 * A step line, not a smooth one: weight holds flat for a run of sessions and
 * then jumps, and drawing a diagonal between two sessions would imply loads you
 * never actually lifted. One series, so the title names it and there is no
 * legend. Dots are filled when the session qualified toward a jump and hollow
 * when it did not — shape, not colour alone, carries that.
 */

type Metric = 'weight' | 'reps' | 'volume';

const PAD = { top: 16, right: 18, bottom: 26, left: 44 };
const HEIGHT = 178;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(min: number, max: number, count = 3): number[] {
  if (min === max) return [min];
  const span = max - min;
  const rough = span / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) {
    if (v >= min - step * 0.001) ticks.push(Number(v.toFixed(4)));
  }
  return ticks;
}

export function WeightChart({
  points,
  metric,
  unit,
  title,
}: {
  points: HistoryPoint[];
  metric: Metric;
  unit: string;
  title: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(
    () =>
      points
        .map((p) => ({
          point: p,
          value:
            metric === 'weight' ? p.topWeight : metric === 'reps' ? p.bestReps : p.volume,
        }))
        .filter((d): d is { point: HistoryPoint; value: number } => d.value != null),
    [points, metric],
  );

  if (series.length === 0) {
    return (
      <div className="media-frame" style={{ aspectRatio: 'auto', height: HEIGHT }}>
        Nothing logged for this movement yet.
      </div>
    );
  }

  const inner = {
    w: Math.max(80, width - PAD.left - PAD.right),
    h: HEIGHT - PAD.top - PAD.bottom,
  };

  const values = series.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin;
  const min = span === 0 ? Math.max(0, rawMin - Math.max(1, rawMin * 0.1)) : rawMin - span * 0.15;
  const max = span === 0 ? rawMax + Math.max(1, rawMax * 0.1) : rawMax + span * 0.15;

  const times = series.map((d) => d.point.completedAt);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);

  const x = (t: number) =>
    PAD.left + (tMax === tMin ? inner.w / 2 : ((t - tMin) / (tMax - tMin)) * inner.w);
  const y = (v: number) => PAD.top + inner.h - ((v - min) / (max - min)) * inner.h;

  // Step path: hold the level until the next session, then jump.
  const path = series
    .map((d, i) => {
      const px = x(d.point.completedAt);
      const py = y(d.value);
      if (i === 0) return `M ${px} ${py}`;
      const prev = series[i - 1];
      return `L ${px} ${y(prev.value)} L ${px} ${py}`;
    })
    .join(' ');

  const last = series[series.length - 1];
  const ticks = niceTicks(rawMin, rawMax);
  const active = hover != null ? series[hover] : null;

  const label = (v: number) =>
    metric === 'weight' ? `${v} ${unit}` : metric === 'reps' ? `${v} reps` : `${v} ${unit}·reps`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        className="chart"
        width={width || 320}
        height={HEIGHT}
        role="img"
        aria-label={`${title}. ${series.length} sessions, from ${label(series[0].value)} to ${label(last.value)}.`}
        onMouseLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const px = e.clientX - box.left;
          let nearest = 0;
          let best = Infinity;
          series.forEach((d, i) => {
            const distance = Math.abs(x(d.point.completedAt) - px);
            if (distance < best) {
              best = distance;
              nearest = i;
            }
          });
          setHover(nearest);
        }}
      >
        <defs>
          <linearGradient id="chart-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="chart-axis"
              x1={PAD.left}
              x2={PAD.left + inner.w}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="chart-label" x={PAD.left - 8} y={y(tick) + 3.5} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}

        {series.length > 1 && (
          <path
            className="chart-area"
            d={`${path} L ${x(last.point.completedAt)} ${PAD.top + inner.h} L ${x(series[0].point.completedAt)} ${PAD.top + inner.h} Z`}
          />
        )}
        <path className="chart-step" d={path} />

        {active && (
          <line
            className="chart-axis"
            x1={x(active.point.completedAt)}
            x2={x(active.point.completedAt)}
            y1={PAD.top}
            y2={PAD.top + inner.h}
            style={{ stroke: 'var(--border-strong)' }}
          />
        )}

        {series.map((d, i) => (
          <circle
            key={`${d.point.completedAt}-${i}`}
            cx={x(d.point.completedAt)}
            cy={y(d.value)}
            r={hover === i ? 6 : 4.5}
            className="chart-dot"
            style={{
              fill: d.point.qualified ? 'var(--accent)' : 'var(--bg)',
              stroke: 'var(--accent)',
              strokeWidth: 2,
            }}
          />
        ))}

        <text
          className="chart-label"
          x={PAD.left}
          y={HEIGHT - 8}
          textAnchor="start"
        >
          {formatKey(series[0].point.date)}
        </text>
        {series.length > 1 && (
          <text
            className="chart-label"
            x={PAD.left + inner.w}
            y={HEIGHT - 8}
            textAnchor="end"
          >
            {formatKey(last.point.date)}
          </text>
        )}
      </svg>

      {active && (
        <div
          className="card card-tight"
          style={{
            position: 'absolute',
            top: 4,
            left: Math.min(Math.max(0, x(active.point.completedAt) - 70), Math.max(0, width - 150)),
            width: 150,
            pointerEvents: 'none',
            padding: '8px 10px',
            background: 'var(--surface-2)',
          }}
        >
          <div className="tiny dim">{formatKey(active.point.date, { weekday: true })}</div>
          <div className="strong num">{label(active.value)}</div>
          <div className="tiny" style={{ color: active.point.qualified ? 'var(--good)' : 'var(--muted)' }}>
            {active.point.qualified ? 'Qualifying session' : 'Did not qualify'}
          </div>
        </div>
      )}
    </div>
  );
}
