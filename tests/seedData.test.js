import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seedDemoRunsIfEmpty } from '../src/data/seedData.ts';

const SESSIONS_KEY = 'breath-trainer:sessions:v1';
const SEEDED_FLAG = 'breath-trainer:demo-seeded:v1';

// Minimal localStorage mock for Node.js (seedData only uses getItem/setItem).
function makeMockStorage() {
  const store = Object.create(null);
  return {
    getItem: key => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: key => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    }
  };
}

// Fresh mock before every test so each test starts with clean localStorage.
beforeEach(() => {
  global.localStorage = makeMockStorage();
});

test('seedDemoRunsIfEmpty writes runs when storage is empty', () => {
  seedDemoRunsIfEmpty();
  const raw = global.localStorage.getItem(SESSIONS_KEY);
  assert.ok(raw, 'sessions key should be set');
  const sessions = JSON.parse(raw);
  assert.ok(Array.isArray(sessions), 'sessions should be an array');
  assert.ok(sessions.length > 0, 'should have at least one seeded run');
});

test('seeded runs have valid session shape', () => {
  seedDemoRunsIfEmpty();
  const sessions = JSON.parse(global.localStorage.getItem(SESSIONS_KEY));
  for (const s of sessions) {
    assert.ok(typeof s.id === 'string', 'each run needs an id');
    assert.ok(typeof s.patternId === 'string', 'each run needs a patternId');
    assert.ok(typeof s.completedAt === 'string', 'each run needs a completedAt');
    assert.ok(typeof s.syncPct === 'number', 'each run needs a syncPct');
    const d = new Date(s.completedAt);
    assert.ok(!Number.isNaN(d.getTime()), 'completedAt must be a valid date');
    const daysOld = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    assert.ok(daysOld >= 0 && daysOld <= 8, 'seeded run should be within the past 8 days');
  }
});

test('seedDemoRunsIfEmpty sets the seeded flag', () => {
  seedDemoRunsIfEmpty();
  assert.equal(global.localStorage.getItem(SEEDED_FLAG), '1', 'seeded flag should be set');
});

test('seedDemoRunsIfEmpty does not overwrite existing data', () => {
  const existing = JSON.stringify([{ id: 'real-run', completedAt: new Date().toISOString() }]);
  global.localStorage.setItem(SESSIONS_KEY, existing);
  seedDemoRunsIfEmpty();
  assert.equal(global.localStorage.getItem(SESSIONS_KEY), existing, 'existing sessions should not be overwritten');
});

test('seedDemoRunsIfEmpty does not seed twice', () => {
  seedDemoRunsIfEmpty();
  const first = global.localStorage.getItem(SESSIONS_KEY);
  seedDemoRunsIfEmpty();
  assert.equal(global.localStorage.getItem(SESSIONS_KEY), first, 'second call should not change sessions');
});
