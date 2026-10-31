/**
 * Level layouts for the Forest Runner. All levels share the pic/background.ai cliffs;
 * difficulty comes from the coin layout and the breathing it asks for.
 *
 * Each level trains a different breathing skill rather than just running faster:
 *  1. Forest: learn the jump. Coins as placed in the .ai, wide pickup, quick lung refill.
 *  2. Canyon: keep a rhythm. More breaths per lap, including short hops on flat ground.
 *  3. Glacier: long, controlled breaths. Few breaths, each a long glide with coins at the top of
 *     the arc, and a slow refill that rewards a full exhale before the next inhale.
 *
 * Levels 2 and 3 are generated from a "breath script": the runner is simulated jumping at each x
 * and inhaling for `hold` seconds, and coins are dropped along the resulting flight arcs. Every
 * coin is therefore reachable, and collecting them all means reproducing that breathing.
 */
import { FOREST_MAP as GENERATED_MAP } from '../animation/forestMap.js';
import { RUNNER_CONFIG, createRunnerState, stepRunner, edgeDistance } from './forestRunner.ts';
import type { BreathCue, Coin, ForestMap, RunnerConfig, RunnerState } from './forestRunner.ts';

/** The generated map is plain JS; this is where it gets its type. */
const FOREST_MAP: ForestMap = GENERATED_MAP;

export type LevelId = 'MAP-FOREST-01' | 'MAP-CANYON-02' | 'MAP-GLACIER-03';

/** How a level differs from the base runner, and the breathing skill it trains. */
interface BaseLevelSpec {
  /** Short name of the breathing skill, shown on the start card. */
  skill: string;
  /** One sentence on what this level asks of your breathing. */
  focus: string;
  speed: number;
  /** Seconds of glide on a full breath. */
  lungSec: number;
  /** Seconds to refill the lung from empty while exhaling. */
  refillSec: number;
  coinReach: number;
}

/** Level 1: plays the coins exactly as placed in the .ai. */
export interface FixedLevelSpec extends BaseLevelSpec {
  script?: undefined;
  spacing?: undefined;
}

/** Levels 2 and 3: coins generated along a breath script, at least `spacing` px apart. */
export interface ScriptedLevelSpec extends BaseLevelSpec {
  script: BreathCue[];
  spacing: number;
}

export type LevelSpec = FixedLevelSpec | ScriptedLevelSpec;

export interface Level {
  id: LevelId;
  /** 1-based position in the level list (difficulty order). */
  number: number;
  skill: string;
  focus: string;
  /** Multiplier on RUNNER_CONFIG.runSpeed. */
  speed: number;
  config: RunnerConfig;
  map: ForestMap;
  /** Breaths a clean lap takes (scripted levels: the script; Level 1: one per gap). */
  breathsPerLap: number;
  /** Average inhale those breaths ask for, in seconds. */
  avgBreathSec: number;
}

/**
 * The .ai draws two coins at half size (a depth effect). Pickup radius follows coin size, which
 * made those two impossible to collect, so every Level 1 coin uses the artwork's standard size.
 */
const STANDARD_COIN_R = 18.5;

const DT = 1 / 60;

const LEVEL_SPECS: Record<LevelId, LevelSpec> = {
  'MAP-FOREST-01': {
    skill: 'Learn the jump',
    focus:
      'Jump at each gap and glide across. Coins sit right on your path, pickups are very generous and your breath refills fast — plenty of room to experiment.',
    speed: 1,
    lungSec: 2.7,
    refillSec: 1.2,
    coinReach: 58
  },
  'MAP-CANYON-02': {
    skill: 'Keep a rhythm',
    focus:
      'Short hops between big jumps — no rest on the long flat cliffs. The coins land exactly where a steady rhythm puts you, so match the arrow or you will miss them.',
    speed: 1.1,
    lungSec: 2.2,
    refillSec: 2.2,
    coinReach: 42,
    spacing: 58,
    // Planned with the physics: every gap plus short hops on the long flat cliffs.
    script: [
      [255, 0.7],
      [515, 0.35],
      [790, 1.35],
      [1353, 0.7],
      [1595, 0.35],
      [1837, 0.7],
      [2097, 0.35]
    ]
  },
  'MAP-GLACIER-03': {
    skill: 'Long, controlled breaths',
    focus:
      'Fast pace, tiny pickup windows, and a slow refill. Coins sit only at the very top of each long arc — a short or early breath misses them entirely. Exhale fully before the next inhale or you will run out of air mid-flight.',
    speed: 1.2,
    lungSec: 2.0,
    refillSec: 2.8,
    coinReach: 28,
    spacing: 64,
    // Four long glides, each held well past the minimum, so coins sit high on the arc.
    script: [
      [255, 1.1],
      [792, 1.6],
      [1352, 1.1],
      [1836, 1.1]
    ]
  }
};

/** Simulate a breath script and place coins along its airborne arcs. */
export function coinsFromScript(
  script: BreathCue[],
  { speed, lungSec, refillSec, spacing }: Pick<ScriptedLevelSpec, 'speed' | 'lungSec' | 'refillSec' | 'spacing'>,
  map: ForestMap = FOREST_MAP
): Coin[] {
  const cfg: RunnerConfig = { ...RUNNER_CONFIG, lungSec, refillSec };
  const empty: ForestMap = { ...map, coins: [] };
  let s = createRunnerState(empty);
  let next = 0;
  let holdLeft = 0;
  let lastCoinX = -Infinity;
  const coins: Coin[] = [];
  for (let t = 0; t < 60 && s.lap === 1; t += DT) {
    if (s.onGround && next < script.length && s.x >= script[next][0]) holdLeft = script[next++][1];
    s = stepRunner(s, DT, holdLeft > 0, empty, cfg, speed);
    holdLeft -= DT;
    if (s.events.some(e => e.type === 'fall')) throw new Error(`breath script falls near x=${Math.round(s.x)}`);
    if (!s.onGround && s.x - lastCoinX >= spacing) {
      coins.push({ x: Math.round(s.x), y: Math.round(s.y - cfg.bodyOffset), r: 18 });
      lastCoinX = s.x;
    }
  }
  return coins;
}

/**
 * The breaths a lap needs when you only jump at cliff edges: for each gap, the shortest inhale
 * (in 0.05s steps) that lands safely. Used to describe Level 1, whose coins come from the .ai.
 */
export function edgeBreaths(map: ForestMap, cfg: RunnerConfig, speed: number): BreathCue[] {
  const empty: ForestMap = { ...map, coins: [] };
  const landsWith = (from: RunnerState, hold: number): RunnerState | null => {
    let s = from;
    let left = hold;
    for (let t = 0; t < 8; t += DT) {
      s = stepRunner(s, DT, left > 0, empty, cfg, speed);
      left -= DT;
      if (s.events.some(e => e.type === 'fall')) return null;
      if (t > DT && s.onGround && left <= 0) return s;
    }
    return null;
  };
  const cues: BreathCue[] = [];
  let s = createRunnerState(empty);
  for (let t = 0; t < 60 && s.lap === 1; t += DT) {
    if (s.onGround && edgeDistance(empty, s.x, s.y, 40, cfg) < 30) {
      let landed: RunnerState | null = null;
      let hold = 0.1;
      for (; hold <= cfg.lungSec && !landed; hold += 0.05) landed = landsWith(s, hold);
      if (!landed) throw new Error(`no inhale clears the gap at x=${Math.round(s.x)}`);
      cues.push([Math.round(s.x), Math.round((hold - 0.05) * 100) / 100]);
      s = landed;
      continue;
    }
    s = stepRunner(s, DT, false, empty, cfg, speed);
  }
  return cues;
}

const mean = (xs: number[]): number => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100;

function buildLevel(id: LevelId, index: number): Level {
  const spec = LEVEL_SPECS[id];
  const coins = spec.script
    ? coinsFromScript(spec.script, spec)
    : FOREST_MAP.coins.map(c => ({ ...c, r: STANDARD_COIN_R }));
  const config: RunnerConfig = {
    ...RUNNER_CONFIG,
    lungSec: spec.lungSec,
    refillSec: spec.refillSec,
    coinReach: spec.coinReach,
    breathCues: spec.script || null
  };
  const breaths = spec.script || edgeBreaths(FOREST_MAP, config, spec.speed);
  return {
    id,
    number: index + 1,
    skill: spec.skill,
    focus: spec.focus,
    speed: spec.speed,
    config,
    map: { ...FOREST_MAP, coins },
    breathsPerLap: breaths.length,
    avgBreathSec: mean(breaths.map(([, hold]) => hold))
  };
}

/** Number of levels, for "Level n of N". */
export const LEVEL_COUNT = Object.keys(LEVEL_SPECS).length;

export const FOREST_LEVELS = Object.fromEntries(
  (Object.keys(LEVEL_SPECS) as LevelId[]).map((id, i) => [id, buildLevel(id, i)])
) as Record<LevelId, Level>;

/** Level for a map id. Own keys only, so ids like 'toString' fall back instead of hitting Object.prototype. */
export function getLevel(id: string | null | undefined): Level {
  return id && Object.hasOwn(FOREST_LEVELS, id) ? FOREST_LEVELS[id as LevelId] : FOREST_LEVELS['MAP-FOREST-01'];
}
