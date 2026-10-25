import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, currentStreak, lastNDays, formatDuration, dateKey } from '../src/core/stats.js';

const now = new Date(2026, 9, 25, 18, 0); // Oct 25 2026, local time
const at = (day, hour = 9) => new Date(2026, 9, day, hour).toISOString();
const session = (day, durationSec = 120, extra = {}) => ({
  id: `s${day}-${durationSec}`, patternId: 'box', patternName: 'Box Breathing',
  rounds: 4, durationSec, completed: true, completedAt: at(day), ...extra
});

test('streak counts consecutive days ending today', () => {
  assert.equal(currentStreak([session(25), session(24), session(23), session(21)], now), 3);
});

test('streak still counts if today has no session yet', () => {
  assert.equal(currentStreak([session(24), session(23)], now), 2);
});

test('streak is zero after a missed day', () => {
  assert.equal(currentStreak([session(22)], now), 0);
  assert.equal(currentStreak([], now), 0);
});

test('lastNDays buckets minutes per day, oldest first, ending today', () => {
  const days = lastNDays([session(25, 90), session(25, 30), session(20, 60)], 7, now);
  assert.equal(days.length, 7);
  assert.equal(days[0].dateKey, dateKey(new Date(2026, 9, 19)));
  assert.equal(days[6].dateKey, dateKey(now));
  assert.equal(days[6].minutes, 2);
  assert.equal(days[1].minutes, 1);
});

test('summarize aggregates totals and favorite pattern', () => {
  const s = summarize([
    session(25, 300),
    session(24, 60, { patternName: '4-7-8 Relax', completed: false }),
    session(23, 240)
  ], now);
  assert.equal(s.totalSessions, 3);
  assert.equal(s.completedSessions, 2);
  assert.equal(s.totalMinutes, 10);
  assert.equal(s.todayMinutes, 5);
  assert.equal(s.currentStreak, 3);
  assert.equal(s.favoritePattern, 'Box Breathing');
});

test('formatDuration', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(75), '1:15');
  assert.equal(formatDuration(3725), '1:02:05');
});
