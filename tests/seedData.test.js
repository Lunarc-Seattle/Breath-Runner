import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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

let mockStorage;

beforeEach(() => {
  mockStorage = makeMockStorage();
  // Inject mock into global scope so seedData.js can use it.
  global.localStorage = mockStorage;
});

// Dynamic import so each test gets a fresh module with a clean closure.
async function loadSeed() {
  const url = new URL('../src/data/seedData.js', import.meta.url);
  // Bust the cache by appending a counter so each test re-evaluates the module.
  return import(`${url.href}?t=${Date.now()}`);
}

test('seedDemoRunsIfEmpty writes runs when storage is empty', async () => {
  const { seedDemoRunsIfEmpty } = await loadSeed();
  seedDemoRunsIfEmpty();

  const raw = mockStorage.getItem(SESSIONS_KEY);
  assert.ok(raw, 'sessions key should be set');
  const sessions = JSON.parse(raw);
  assert.ok(Array.isArray(sessions), 'sessions should be an array');
  assert.ok(sessions.length > 0, 'should have at least one seeded run');
});

test('seeded runs have valid session shape', async () => {
  const { seedDemoRunsIfEmpty } = await loadSeed();
  seedDemoRunsIfEmpty();

  const sessions = JSON.parse(mockStorage.getItem(SESSIONS_KEY));
  for (const s of sessions) {
    assert.ok(typeof s.id === 'string', 'each run needs an id');
    assert.ok(typeof s.patternId === 'string', 'each run needs a patternId');
    assert.ok(typeof s.completedAt === 'string', 'each run needs a completedAt');
    assert.ok(typeof s.syncPct === 'number', 'each run needs a syncPct');
    // completedAt must be a valid ISO date in the past 7 days
    const d = new Date(s.completedAt);
    assert.ok(!Number.isNaN(d.getTime()), 'completedAt must be a valid date');
    const daysOld = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    assert.ok(daysOld >= 0 && daysOld <= 8, 'seeded run should be within the past 8 days');
  }
});

test('seedDemoRunsIfEmpty sets the seeded flag', async () => {
  const { seedDemoRunsIfEmpty } = await loadSeed();
  seedDemoRunsIfEmpty();
  assert.equal(mockStorage.getItem(SEEDED_FLAG), '1', 'seeded flag should be set');
});

test('seedDemoRunsIfEmpty does not overwrite existing data', async () => {
  const { seedDemoRunsIfEmpty } = await loadSeed();
  const existing = JSON.stringify([{ id: 'real-run', completedAt: new Date().toISOString() }]);
  mockStorage.setItem(SESSIONS_KEY, existing);
  seedDemoRunsIfEmpty();

  const raw = mockStorage.getItem(SESSIONS_KEY);
  assert.equal(raw, existing, 'existing sessions should not be overwritten');
});

test('seedDemoRunsIfEmpty does not seed twice', async () => {
  const { seedDemoRunsIfEmpty } = await loadSeed();
  seedDemoRunsIfEmpty();
  const first = mockStorage.getItem(SESSIONS_KEY);

  // Simulate a second page load by calling again (flag is already set).
  seedDemoRunsIfEmpty();
  const second = mockStorage.getItem(SESSIONS_KEY);
  assert.equal(first, second, 'second call should not change sessions');
});
