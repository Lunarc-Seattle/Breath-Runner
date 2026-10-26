/**
 * Practice statistics derived from saved sessions.
 * Session shape: { id, patternId, patternName, rounds, durationSec, completed, completedAt (ISO string) }
 */

import type { Session } from './session.ts';

/** The session fields the statistics read. */
export type SessionLike = Pick<Session, 'patternName' | 'durationSec' | 'completed' | 'completedAt'>;

export type DateInput = string | number | Date;

export interface DayMinutes {
  dateKey: string;
  /** Short weekday name, e.g. "Mon". */
  label: string;
  minutes: number;
}

export interface StatsSummary {
  totalSessions: number;
  completedSessions: number;
  totalMinutes: number;
  todayMinutes: number;
  currentStreak: number;
  favoritePattern: string | null;
  last7: DayMinutes[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Local calendar day as YYYY-MM-DD. */
export function dateKey(date: DateInput): string {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function startOfDay(date: DateInput): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Consecutive practice days ending today (or yesterday, so the streak survives until tonight). */
export function currentStreak(sessions: readonly Pick<SessionLike, 'completedAt'>[], now: DateInput = new Date()): number {
  const days = new Set(sessions.map(s => dateKey(s.completedAt)));
  let cursor = startOfDay(now);
  if (!days.has(dateKey(cursor))) cursor = new Date(cursor.getTime() - DAY_MS);

  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak++;
    // Step back via setDate so DST changes don't skip or repeat a day.
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function lastNDays(
  sessions: readonly Pick<SessionLike, 'completedAt' | 'durationSec'>[],
  n = 7,
  now: DateInput = new Date()
): DayMinutes[] {
  const minutesByDay = new Map<string, number>();
  for (const s of sessions) {
    const key = dateKey(s.completedAt);
    minutesByDay.set(key, (minutesByDay.get(key) || 0) + s.durationSec / 60);
  }

  const out: DayMinutes[] = [];
  const cursor = startOfDay(now);
  cursor.setDate(cursor.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    const key = dateKey(cursor);
    out.push({
      dateKey: key,
      label: WEEKDAYS[cursor.getDay()],
      minutes: Math.round((minutesByDay.get(key) || 0) * 10) / 10
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function summarize(sessions: readonly SessionLike[], now: DateInput = new Date()): StatsSummary {
  const totalSec = sessions.reduce((sum, s) => sum + s.durationSec, 0);
  const todayKey = dateKey(now);
  const today = sessions.filter(s => dateKey(s.completedAt) === todayKey);

  const byPattern: Record<string, number> = {};
  for (const s of sessions) byPattern[s.patternName] = (byPattern[s.patternName] || 0) + 1;
  const favorite = Object.entries(byPattern).sort((a, b) => b[1] - a[1])[0];

  return {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.completed).length,
    totalMinutes: Math.round(totalSec / 6) / 10,
    todayMinutes: Math.round(today.reduce((sum, s) => sum + s.durationSec, 0) / 6) / 10,
    currentStreak: currentStreak(sessions, now),
    favoritePattern: favorite ? favorite[0] : null,
    last7: lastNDays(sessions, 7, now)
  };
}

/** 75 -> "1:15", 3725 -> "1:02:05" */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
