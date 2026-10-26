// @ts-check
import { test, expect } from '@playwright/test';

/** @typedef {{ id: string, completedAt: string }} StoredRun */

const SESSIONS = '/api/v1/sessions';

const validRun = (overrides = {}) => ({
  patternId: 'MAP-FOREST-01',
  patternName: 'API spec · Breath Runner',
  rounds: 1,
  durationSec: 42,
  completed: true,
  coins: 12,
  totalCoins: 30,
  syncPct: 87,
  falls: 2,
  ...overrides
});

test.describe('sessions API', () => {
  test('POST a valid run returns 201 with a server-generated id', async ({ request }) => {
    const res = await request.post(SESSIONS, { data: validRun() });
    expect(res.status()).toBe(201);
    const { session } = await res.json();
    expect(session).toMatchObject({ patternId: 'MAP-FOREST-01', coins: 12, totalCoins: 30, syncPct: 87, falls: 2 });
    expect(typeof session.id).toBe('string');
    expect(session.id.length).toBeGreaterThan(0);
    expect(Number.isNaN(Date.parse(session.completedAt))).toBe(false);
  });

  test('a client-supplied id is ignored', async ({ request }) => {
    const res = await request.post(SESSIONS, { data: validRun({ id: 'client-chosen-id' }) });
    expect(res.status()).toBe(201);
    const { session } = await res.json();
    expect(session.id).not.toBe('client-chosen-id');

    /** @type {{ sessions: StoredRun[] }} */
    const { sessions } = await (await request.get(SESSIONS)).json();
    expect(sessions.some(s => s.id === 'client-chosen-id')).toBe(false);
  });

  for (const syncPct of [101, -1, 50.5]) {
    test(`syncPct ${syncPct} is rejected with 400`, async ({ request }) => {
      const res = await request.post(SESSIONS, { data: validRun({ syncPct }) });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toMatch(/syncPct/);
    });
  }

  test('an oversized body returns 413', async ({ request }) => {
    const res = await request.post(SESSIONS, { data: validRun({ notes: 'x'.repeat(20 * 1024) }) });
    expect(res.status()).toBe(413);
    expect((await res.json()).error).toMatch(/too large/i);
  });

  test('GET returns runs newest first', async ({ request }) => {
    const base = Date.now() - 60 * 60 * 1000;
    const stamps = [base, base + 2000, base + 1000].map(t => new Date(t).toISOString());
    /** @type {string[]} */
    const ids = [];
    for (const completedAt of stamps) {
      const res = await request.post(SESSIONS, { data: validRun({ completedAt }) });
      expect(res.status()).toBe(201);
      ids.push((await res.json()).session.id);
    }

    const res = await request.get(SESSIONS);
    expect(res.ok()).toBe(true);
    /** @type {{ sessions: StoredRun[] }} */
    const { sessions } = await res.json();
    const times = sessions.map(s => Date.parse(s.completedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));

    const ours = sessions.filter(s => ids.includes(s.id)).map(s => s.id);
    expect(ours).toEqual([ids[1], ids[2], ids[0]]);
  });
});
