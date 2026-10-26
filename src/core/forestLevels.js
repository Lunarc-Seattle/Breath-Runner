/**
 * Level layouts for the Forest Runner. All levels share the pic/background.ai cliffs;
 * difficulty comes from the coin layout and the breathing it asks for.
 *
 * Level 1 uses the coins exactly as placed in the .ai. Levels 2 and 3 are generated from a
 * "breath script": the runner is simulated jumping at each x and inhaling for `hold` seconds,
 * and coins are dropped along the resulting flight arcs. Every coin is therefore reachable,
 * and collecting them all means reproducing that rhythm: more breaths per lap, longer glides,
 * a smaller lung, a faster pace and a tighter pickup radius.
 */
import { FOREST_MAP } from '../animation/forestMap.js';
import { RUNNER_CONFIG, createRunnerState, stepRunner } from './forestRunner.js';

const DT = 1 / 60;

const LEVEL_SPECS = {
  'MAP-FOREST-01': { speed: 1, lungSec: 2.4, coinReach: 52 },
  'MAP-CANYON-02': {
    speed: 1.1, lungSec: 2.2, coinReach: 44, spacing: 58,
    script: [[255, 0.6], [500, 0.5], [775, 1.8], [1150, 0.6], [1345, 1.4], [1600, 0.6], [1835, 1.6]]
  },
  'MAP-GLACIER-03': {
    speed: 1.2, lungSec: 2.0, coinReach: 38, spacing: 72,
    script: [[150, 0.5], [255, 0.8], [480, 0.45], [790, 2.0], [1080, 0.4], [1220, 0.45], [1350, 1.6], [1540, 0.45], [1690, 0.4], [1815, 2.0]]
  }
};

/** Simulate a breath script and place coins along its airborne arcs. */
export function coinsFromScript(script, { speed, lungSec, spacing }, map = FOREST_MAP) {
  const cfg = { ...RUNNER_CONFIG, lungSec };
  const empty = { ...map, coins: [] };
  let s = createRunnerState(empty);
  let next = 0;
  let holdLeft = 0;
  let lastCoinX = -Infinity;
  const coins = [];
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

function buildLevel(id) {
  const spec = LEVEL_SPECS[id];
  return {
    id,
    speed: spec.speed,
    config: { ...RUNNER_CONFIG, lungSec: spec.lungSec, coinReach: spec.coinReach, breathCues: spec.script || null },
    map: { ...FOREST_MAP, coins: spec.script ? coinsFromScript(spec.script, spec) : FOREST_MAP.coins }
  };
}

export const FOREST_LEVELS = Object.fromEntries(Object.keys(LEVEL_SPECS).map(id => [id, buildLevel(id)]));

export function getLevel(id) {
  return FOREST_LEVELS[id] || FOREST_LEVELS['MAP-FOREST-01'];
}
