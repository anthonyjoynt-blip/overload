import type { DateKey } from '../types';

/**
 * Dates are YYYY-MM-DD strings in the user's own timezone. Parsing goes through
 * local noon so a DST shift can never bump a date to the day before.
 */

export function toKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

/** 0 = Sunday. */
export function weekday(key: DateKey): number {
  return fromKey(key).getDay();
}

export function daysBetween(a: DateKey, b: DateKey): number {
  const ms = fromKey(b).getTime() - fromKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function compareKeys(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

export function formatKey(key: DateKey, opts: { weekday?: boolean } = {}): string {
  const d = fromKey(key);
  const day = opts.weekday ? `${WEEKDAY_LABELS[d.getDay()]} ` : '';
  return `${day}${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function relativeDayLabel(key: DateKey): string {
  const diff = daysBetween(todayKey(), key);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return WEEKDAY_LABELS[weekday(key)];
  return formatKey(key);
}

/**
 * Six weeks of dates covering the given month, starting on Sunday — the usual
 * month grid, with the neighbouring days that fill the corners.
 */
export function monthGrid(year: number, month: number): DateKey[] {
  const first = new Date(year, month, 1, 12);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toKey(d);
  });
}

export function isSameMonth(key: DateKey, year: number, month: number): boolean {
  const d = fromKey(key);
  return d.getFullYear() === year && d.getMonth() === month;
}
