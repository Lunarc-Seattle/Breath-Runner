import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS,
  levelName,
  filterByLevel,
  runsInRange,
  totals,
  dailyBestSync,
  weekChange,
  firstDayOver,
  todaySlots,
  greeting,
  coinsLast7,
  formatTrainingTime
} from '../src/core/progress.ts';

const now = new Date(2026, 9, 26, 14, 0); // Mon Oct 26 2026, 2 PM local time
const at = (day, hour = 9) => new Date(2026, 9, day, hour).toISOString();
const run = (day, extra = {}) => ({
  patternId: 'MAP-FOREST-01',
  patternName: 'Forest · Level 1 · Breath Runner',
  durationSec: 60,
  coins: 10,
  syncPct: 70,
  completedAt: at(day),
  ...extra
});

test('levelName drops the Breath Runner suffix and keeps other names', () => {
  assert.equal(levelName(run(1)), 'Forest · Level 1');
  assert.equal(levelName({ patternName: 'Box Breathing' }), 'Box Breathing');
  assert.equal(levelName({}), '—');
});

test('filterByLevel keeps one level, or all runs for an empty id', () => {
  const runs = [run(1), run(2, { patternId: 'MAP-GLACIER-03' })];
  assert.equal(filterByLevel(runs, 'MAP-GLACIER-03').length, 1);
  assert.equal(filterByLevel(runs, '').length, 2);
  assert.deepEqual(
    LEVELS.map(l => l.label),
    ['Forest', 'Sunlit Canyon', 'Glacier Ridge']
  );
});

test('runsInRange counts calendar days with today included', () => {
  const runs = [run(26), run(20, { completedAt: new Date(2026, 9, 20, 0, 0).toISOString() }), run(19)];
  assert.equal(runsInRange(runs, 7, now).length, 2);
  assert.equal(runsInRange(runs, null, now).length, 3);
});

test('totals sum time and coins and skip missing fields', () => {
  const t = totals([run(1, { syncPct: 81 }), run(2, { coins: undefined, durationSec: undefined, syncPct: undefined })]);
  assert.deepEqual(t, { runs: 2, seconds: 60, bestSync: 81, coins: 10 });
  assert.deepEqual(totals([]), { runs: 0, seconds: 0, bestSync: null, coins: 0 });
});

test('dailyBestSync takes the best run of each day and leaves empty days null', () => {
  const days = dailyBestSync([run(26, { syncPct: 60 }), run(26, { syncPct: 88 }), run(24, { syncPct: 50 })], 7, now);
  assert.equal(days.length, 7);
  assert.equal(days[0].dateKey, '2026-10-20');
  assert.equal(days[6].best, 88);
  assert.equal(days[4].best, 50);
  assert.equal(days[5].best, null);
});

test('dailyBestSync with no range starts at the first saved run', () => {
  const days = dailyBestSync([run(22), run(24, { syncPct: undefined }), { completedAt: 'not a date' }], null, now);
  assert.equal(days[0].dateKey, '2026-10-22');
  assert.equal(days.length, 5);
  assert.equal(days[2].best, null);
  assert.equal(dailyBestSync([], null, now).length, 1);
});

test('weekChange compares the average daily best of two weeks', () => {
  assert.equal(weekChange([run(25, { syncPct: 80 }), run(15, { syncPct: 60 }), run(14, { syncPct: 70 })], now), 15);
  assert.equal(weekChange([run(25)], now), null);
});

test('firstDayOver finds the first day reaching each threshold', () => {
  const days = dailyBestSync([run(21, { syncPct: 81 }), run(23, { syncPct: 92 })], 7, now);
  assert.deepEqual(firstDayOver(days, [80, 90, 99]), [1, 3, -1]);
});

test('todaySlots marks done, missed, next and later', () => {
  assert.deepEqual(
    todaySlots([run(26, { completedAt: at(26, 8) })], now).map(s => s.state),
    ['done', 'next', 'later']
  );
  const evening = new Date(2026, 9, 26, 18, 0);
  assert.deepEqual(
    todaySlots([run(25, { completedAt: at(25, 13) }), { completedAt: 'bad' }], evening).map(s => s.state),
    ['missed', 'missed', 'next']
  );
  assert.deepEqual(
    todaySlots([run(26, { completedAt: at(26, 15) }), run(26, { completedAt: at(26, 21) })], evening).map(s => s.state),
    ['missed', 'done', 'done']
  );
});

test('greeting follows the time of day', () => {
  assert.equal(greeting(new Date(2026, 9, 26, 7)), 'Good morning');
  assert.equal(greeting(now), 'Good afternoon');
  assert.equal(greeting(new Date(2026, 9, 26, 20)), 'Good evening');
});

test('coinsLast7 sums only this week', () => {
  assert.equal(coinsLast7([run(26), run(21), run(10)], now), 20);
});

test('formatTrainingTime', () => {
  assert.equal(formatTrainingTime(42), '42 s');
  assert.equal(formatTrainingTime(1180), '19 min');
  assert.equal(formatTrainingTime(4260), '1 h 11 min');
  assert.equal(formatTrainingTime(-5), '0 s');
});
