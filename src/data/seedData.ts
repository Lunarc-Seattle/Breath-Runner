/**
 * Seeds one week of realistic demo run history into localStorage the first time the app loads
 * with no existing data. This makes the charts and stats look alive for first-time visitors.
 * Safe to call multiple times -- the SEEDED_FLAG prevents duplicate writes.
 */
import type { LevelId } from '../core/forestLevels.ts';

const SESSIONS_KEY = 'breath-trainer:sessions:v1';
const SEEDED_FLAG = 'breath-trainer:demo-seeded:v1';

interface DemoRun {
  daysBack: number;
  hour: number;
  level: LevelId;
  name: string;
  sync: number;
  coins: number;
  total: number;
  falls: number;
  dur: number;
}

function pastISO(daysBack: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return d.toISOString();
}

// Ten runs over 7 days: progressive sync improvement on L1, with a few L2 attempts.
const DEMO_RUNS: DemoRun[] = [
  {
    daysBack: 7,
    hour: 9,
    level: 'MAP-FOREST-01',
    name: 'Forest \xB7 Level 1',
    sync: 62,
    coins: 18,
    total: 30,
    falls: 5,
    dur: 44
  },
  {
    daysBack: 6,
    hour: 8,
    level: 'MAP-FOREST-01',
    name: 'Forest \xB7 Level 1',
    sync: 68,
    coins: 21,
    total: 30,
    falls: 4,
    dur: 41
  },
  {
    daysBack: 5,
    hour: 10,
    level: 'MAP-FOREST-01',
    name: 'Forest \xB7 Level 1',
    sync: 71,
    coins: 23,
    total: 30,
    falls: 4,
    dur: 40
  },
  {
    daysBack: 5,
    hour: 15,
    level: 'MAP-FOREST-01',
    name: 'Forest \xB7 Level 1',
    sync: 74,
    coins: 25,
    total: 30,
    falls: 3,
    dur: 38
  },
  {
    daysBack: 4,
    hour: 9,
    level: 'MAP-FOREST-01',
    name: 'Forest \xB7 Level 1',
    sync: 76,
    coins: 26,
    total: 30,
    falls: 2,
    dur: 37
  },
  {
    daysBack: 3,
    hour: 8,
    level: 'MAP-CANYON-02',
    name: 'Sunlit Canyon \xB7 Level 2',
    sync: 64,
    coins: 24,
    total: 35,
    falls: 7,
    dur: 53
  },
  {
    daysBack: 3,
    hour: 15,
    level: 'MAP-FOREST-01',
    name: 'Forest \xB7 Level 1',
    sync: 79,
    coins: 27,
    total: 30,
    falls: 2,
    dur: 36
  },
  {
    daysBack: 2,
    hour: 9,
    level: 'MAP-FOREST-01',
    name: 'Forest \xB7 Level 1',
    sync: 82,
    coins: 28,
    total: 30,
    falls: 1,
    dur: 35
  },
  {
    daysBack: 1,
    hour: 8,
    level: 'MAP-FOREST-01',
    name: 'Forest \xB7 Level 1',
    sync: 85,
    coins: 29,
    total: 30,
    falls: 1,
    dur: 34
  },
  {
    daysBack: 1,
    hour: 20,
    level: 'MAP-CANYON-02',
    name: 'Sunlit Canyon \xB7 Level 2',
    sync: 70,
    coins: 26,
    total: 35,
    falls: 5,
    dur: 49
  }
];

export function seedDemoRunsIfEmpty(): void {
  try {
    if (localStorage.getItem(SEEDED_FLAG)) return;
    const existing: unknown = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]');
    if (Array.isArray(existing) && existing.length > 0) {
      localStorage.setItem(SEEDED_FLAG, '1');
      return;
    }
    const now = Date.now();
    const runs = DEMO_RUNS.map((r, i) => ({
      id: `demo-${i}-${now}`,
      patternId: r.level,
      patternName: `${r.name} \xB7 Breath Runner`,
      rounds: 1,
      durationSec: r.dur,
      completed: true,
      completedAt: pastISO(r.daysBack, r.hour),
      coins: r.coins,
      totalCoins: r.total,
      syncPct: r.sync,
      falls: r.falls
    }));
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(runs));
    localStorage.setItem(SEEDED_FLAG, '1');
  } catch {
    // localStorage unavailable -- skip silently.
  }
}
