import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOREST_MAP } from '../src/animation/forestMap.js';
import { createRunnerState, stepRunner, groundAt, edgeDistance } from '../src/core/forestRunner.ts';
import { FOREST_LEVELS } from '../src/core/forestLevels.ts';

const DT = 1 / 60;

/** Holds for holdSec from each cliff edge; returns the state after `sec` seconds. */
function autoRun(holdSec, sec) {
  let s = createRunnerState(FOREST_MAP);
  let held = Infinity;
  let laps = 0;
  let firstFall = null;
  for (let i = 0; i < sec / DT; i++) {
    if (s.onGround && edgeDistance(FOREST_MAP, s.x, s.y, 40) < 30) held = 0;
    s = stepRunner(s, DT, held < holdSec, FOREST_MAP);
    held += DT;
    laps += s.events.filter(e => e.type === 'lap').length;
    if (!firstFall && s.events.some(e => e.type === 'fall')) firstFall = { ...s };
  }
  return { s, laps, firstFall };
}

test('runner starts standing on the first cliff of the .ai map', () => {
  const s = createRunnerState(FOREST_MAP);
  assert.equal(s.onGround, true);
  assert.equal(s.y, groundAt(FOREST_MAP, s.x, s.y));
});

test('a long steady inhale clears every gap and finishes the lap', () => {
  const { s, laps } = autoRun(1.6, 20);
  assert.equal(s.falls, 0);
  assert.equal(laps, 1);
});

test('short breaths fall into a gap and respawn on safe ground', () => {
  const { s, laps, firstFall } = autoRun(0.3, 20);
  assert.ok(s.falls > 0);
  assert.equal(laps, 0);
  assert.equal(firstFall.onGround, true);
  assert.equal(firstFall.y, groundAt(FOREST_MAP, firstFall.x, 0));
});

test('coins are collected once per lap', () => {
  const { s } = autoRun(1.6, 12);
  assert.ok(s.coins > 10);
  assert.equal(s.taken.filter(Boolean).length, s.lapCoins);
});

test('each level is harder than the one before', () => {
  const [l1, l2, l3] = ['MAP-FOREST-01', 'MAP-CANYON-02', 'MAP-GLACIER-03'].map(id => FOREST_LEVELS[id]);
  assert.ok(l1.speed < l2.speed && l2.speed < l3.speed);
  assert.ok(l1.config.lungSec > l2.config.lungSec && l2.config.lungSec > l3.config.lungSec);
  assert.ok(l1.config.coinReach > l2.config.coinReach && l2.config.coinReach > l3.config.coinReach);
  assert.ok(l2.config.breathCues.length < l3.config.breathCues.length);
});

test("following a scripted level's breath cues collects every coin without falling", () => {
  for (const id of ['MAP-CANYON-02', 'MAP-GLACIER-03']) {
    const { map, config, speed } = FOREST_LEVELS[id];
    let s = createRunnerState(map);
    let next = 0;
    let holdLeft = 0;
    while (s.lap === 1 && s.elapsed < 60) {
      if (s.onGround && next < config.breathCues.length && s.x >= config.breathCues[next][0])
        holdLeft = config.breathCues[next++][1];
      s = stepRunner(s, DT, holdLeft > 0, map, config, speed);
      holdLeft -= DT;
    }
    assert.equal(s.falls, 0, id);
    assert.equal(s.coins, map.coins.length, id);
  }
});

test('after a fall she respawns with a whole cliff of runway, not on the edge', () => {
  const { map, config, speed } = FOREST_LEVELS['MAP-FOREST-01'];
  let s = createRunnerState(map);
  let fall = null;
  for (let i = 0; i < 20 / DT && !fall; i++) {
    const clearFirstGap = s.x > 255 && s.x < 420 && (s.onGround ? s.x < 300 : true);
    s = stepRunner(s, DT, clearFirstGap, map, config, speed);
    fall = s.events.find(e => e.type === 'fall');
  }
  assert.ok(fall, 'never breathing at the big gap should fall');
  assert.ok(edgeDistance(map, s.x, s.y, 400) >= 300, 'respawn point needs runway');
  assert.ok(s.respawnSec > 0);
});

test('respawn pause: she stands still, and a breath held through it does not jump', () => {
  const { map, config, speed } = FOREST_LEVELS['MAP-FOREST-01'];
  let s = { ...createRunnerState(map), respawnSec: config.respawnPauseSec };
  const x0 = s.x;
  for (let t = 0; t < config.respawnPauseSec; t += DT) s = stepRunner(s, DT, true, map, config, speed);
  assert.equal(s.x, x0);
  s = stepRunner(s, DT, true, map, config, speed);
  assert.equal(s.onGround, true, 'still holding the same breath: no jump');
  s = stepRunner(s, DT, false, map, config, speed);
  s = stepRunner(s, DT, true, map, config, speed);
  assert.equal(s.onGround, false, 'a new inhale jumps');
});

test('never breathing cannot loop falls faster than once per cliff run', () => {
  const { map, config, speed } = FOREST_LEVELS['MAP-FOREST-01'];
  let s = createRunnerState(map);
  for (let i = 0; i < 30 / DT; i++) s = stepRunner(s, DT, false, map, config, speed);
  assert.ok(s.falls <= 30 / 2, `falls=${s.falls}`); // pause + a run to the edge, every time
});
