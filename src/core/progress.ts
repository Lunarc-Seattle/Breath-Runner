/**
 * Progress figures derived from saved Breath Runner runs: the Home and Progress pages read
 * everything here, so the numbers they show are always computed from real runs.
 */

import { dateKey } from './stats.ts';
import type { DateInput } from './stats.ts';
import type { Session } from './session.ts';

/** The run fields the progress figures read. */
export type RunLike = Pick<Session, 'completedAt'> &
  Partial<Pick<Session, 'patternId' | 'patternName' | 'durationSec' | 'coins' | 'syncPct' | 'falls' | 'rounds'>>;

/** One calendar day and the best breath sync of the runs saved that day (null: no run with a sync). */
export interface DayBest {
  dateKey: string;
  date: Date;
  best: number | null;
}

export interface RunTotals {
  runs: number;
  /** Training time in seconds. */
  seconds: number;
  bestSync: number | null;
  coins: number;
}

/** The three game levels, keyed by the map id a saved run stores as its patternId. */
export const LEVELS = [
  { id: 'MAP-FOREST-01', label: 'Forest' },
  { id: 'MAP-CANYON-02', label: 'Sunlit Canyon' },
  { id: 'MAP-GLACIER-03', label: 'Glacier Ridge' }
] as const;

const RUNNER_SUFFIX = / · Breath Runner$/;
/** The "all runs" range never shows less than a week, so a few days of runs still read as a trend. */
const MIN_ALL_DAYS = 7;

const has = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function startOfDay(date: DateInput): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "Forest · Level 1 · Breath Runner" -> "Forest · Level 1"; other names pass through. */
export function levelName(run: Pick<RunLike, 'patternName'>): string {
  return String(run.patternName || '').replace(RUNNER_SUFFIX, '') || '—';
}

/** Runs of one level (by map id); an empty id keeps every run. */
export function filterByLevel<T extends RunLike>(runs: readonly T[], levelId: string): T[] {
  return levelId ? runs.filter(r => r.patternId === levelId) : [...runs];
}

/** Runs completed within the last `days` calendar days (today included); null keeps every run. */
export function runsInRange<T extends RunLike>(
  runs: readonly T[],
  days: number | null,
  now: DateInput = new Date()
): T[] {
  if (days === null) return [...runs];
  const from = startOfDay(now);
  from.setDate(from.getDate() - (days - 1));
  return runs.filter(r => new Date(r.completedAt).getTime() >= from.getTime());
}

export function totals(runs: readonly RunLike[]): RunTotals {
  const syncs = runs.map(r => r.syncPct).filter(has);
  return {
    runs: runs.length,
    seconds: runs.reduce((sum, r) => sum + (has(r.durationSec) ? r.durationSec : 0), 0),
    bestSync: syncs.length ? Math.max(...syncs) : null,
    coins: runs.reduce((sum, r) => sum + (has(r.coins) ? r.coins : 0), 0)
  };
}

/**
 * The best breath sync of each calendar day, oldest first. With `days`, the last `days` days
 * ending today; with null, every day from the first saved run to today, and at least a week.
 */
export function dailyBestSync(runs: readonly RunLike[], days: number | null, now: DateInput = new Date()): DayBest[] {
  const best = new Map<string, number>();
  let first: Date | null = null;
  for (const r of runs) {
    const when = new Date(r.completedAt);
    if (Number.isNaN(when.getTime())) continue;
    if (!first || when < first) first = when;
    if (!has(r.syncPct)) continue;
    const key = dateKey(when);
    best.set(key, Math.max(best.get(key) ?? 0, r.syncPct));
  }

  const end = startOfDay(now);
  const cursor = startOfDay(end);
  cursor.setDate(cursor.getDate() - ((days ?? MIN_ALL_DAYS) - 1));
  if (days === null && first && first < cursor) cursor.setTime(startOfDay(first).getTime());

  const out: DayBest[] = [];
  while (cursor <= end) {
    const key = dateKey(cursor);
    out.push({ dateKey: key, date: new Date(cursor), best: best.get(key) ?? null });
    // Step via setDate so DST changes don't skip or repeat a day.
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;

/**
 * Change in the average daily best breath sync, this week (last 7 days) against the 7 days before,
 * in percentage points. Null unless both weeks have at least one run with a sync.
 */
export function weekChange(runs: readonly RunLike[], now: DateInput = new Date()): number | null {
  const days = dailyBestSync(runs, 14, now);
  const prev = days
    .slice(0, 7)
    .map(d => d.best)
    .filter(has);
  const last = days
    .slice(7)
    .map(d => d.best)
    .filter(has);
  if (!prev.length || !last.length) return null;
  return Math.round(mean(last) - mean(prev));
}

/** Index of the first day whose best reaches each threshold (-1 when it never does). */
export function firstDayOver(days: readonly DayBest[], thresholds: readonly number[]): number[] {
  return thresholds.map(t => days.findIndex(d => d.best !== null && d.best >= t));
}

export type SlotState = 'done' | 'missed' | 'next' | 'later';

export interface TodaySlot {
  id: 'morning' | 'afternoon' | 'evening';
  label: string;
  /** Planned start, shown on the marker. */
  time: string;
  state: SlotState;
}

/** Today's three sessions, each a window of the day: [start hour, end hour). */
const SLOTS = [
  { id: 'morning', label: 'Morning', time: '8:00 AM', from: 0, to: 12 },
  { id: 'afternoon', label: 'Afternoon', time: '3:00 PM', from: 12, to: 17 },
  { id: 'evening', label: 'Evening', time: '8:00 PM', from: 17, to: 24 }
] as const;

/**
 * Today's sessions: done when a run was saved in that part of today, missed when its window has
 * passed without one, and the first open one still ahead is next.
 */
export function todaySlots(runs: readonly RunLike[], now: DateInput = new Date()): TodaySlot[] {
  const today = new Date(now);
  const todayKey = dateKey(today);
  const hours = runs
    .map(r => new Date(r.completedAt))
    .filter(d => !Number.isNaN(d.getTime()) && dateKey(d) === todayKey)
    .map(d => d.getHours());
  const hour = today.getHours();

  let nextFound = false;
  return SLOTS.map(({ id, label, time, from, to }) => {
    let state: SlotState;
    if (hours.some(h => h >= from && h < to)) state = 'done';
    else if (hour >= to) state = 'missed';
    else if (!nextFound) {
      state = 'next';
      nextFound = true;
    } else state = 'later';
    return { id, label, time, state };
  });
}

/** "Good morning" before noon, "Good afternoon" until 5 PM, then "Good evening". */
export function greeting(now: DateInput = new Date()): string {
  const h = new Date(now).getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Total coins of the runs saved in the last 7 days. */
export function coinsLast7(runs: readonly RunLike[], now: DateInput = new Date()): number {
  return totals(runsInRange(runs, 7, now)).coins;
}

/**
 * Current training streak: consecutive calendar days ending on or before today that each
 * have at least one saved run. Returns 0 when the most recent run was 2+ days ago.
 */
export function currentStreak(runs: readonly RunLike[], now: DateInput = new Date()): number {
  if (!runs.length) return 0;
  const runDays = new Set(runs.map(r => dateKey(new Date(r.completedAt))));
  const cursor = startOfDay(now);
  // If nothing today, check if yesterday starts a streak; otherwise it is broken.
  if (!runDays.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!runDays.has(dateKey(cursor))) return 0;
  }
  let streak = 0;
  while (runDays.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 1,180 s -> "19 min"; 4,260 s -> "1 h 11 min"; under a minute -> "42 s". */
export function formatTrainingTime(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds));
  if (sec < 60) return `${sec} s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}
