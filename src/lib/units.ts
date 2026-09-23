import type { Settings } from '../types';

/** The sizes a typical rack actually carries, in lb. */
export const DEFAULT_DUMBBELL_LADDER_LB = [
  5, 8, 10, 12, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90,
  95, 100, 110, 120,
];

/** The same rack in kg. */
export const DEFAULT_DUMBBELL_LADDER_KG = [
  2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 45, 50,
];

/** Round to the nearest achievable step, never down to zero. */
export function roundToIncrement(value: number, increment: number): number {
  if (increment <= 0) return value;
  const rounded = Math.round(value / increment) * increment;
  const snapped = Number(rounded.toFixed(3));
  return snapped === 0 ? increment : snapped;
}

/**
 * The next size up on a fixed-size rack. Returns null at the top of the rack —
 * the caller has to suggest something other than more weight.
 */
export function nextLadderSize(
  current: number | undefined,
  ladder: number[],
): number | null {
  const sizes = [...ladder].sort((a, b) => a - b);
  if (sizes.length === 0) return null;
  if (current == null) return sizes[0];
  const next = sizes.find((s) => s > current + 0.001);
  return next ?? null;
}

/** Trim trailing zeros: 52.5 stays, 50.0 becomes 50. */
export function formatWeight(
  weight: number | undefined | null,
  settings: Pick<Settings, 'units'>,
): string {
  if (weight == null) return '—';
  const n = Number(weight.toFixed(2));
  return `${n} ${settings.units}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem}s`;
  return `${m}:${String(rem).padStart(2, '0')}`;
}
