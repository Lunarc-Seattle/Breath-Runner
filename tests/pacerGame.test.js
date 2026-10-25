import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CONFIG as CFG, createGameState, stepGame, guideY, guidePhase, accuracy } from '../src/core/pacerGame.js';

const run = (state, seconds, holdingAt, dt = 1 / 60) => {
  for (let i = 0; i < Math.round(seconds / dt); i++) state = stepGame(state, dt, holdingAt(state.t));
  return state;
};

test('guide starts at the bottom and rises during the first half-period', () => {
  assert.ok(guideY(0) > guideY(CFG.breathPeriodSec / 4));
  assert.equal(guidePhase(1), 'inhale');
  assert.equal(guidePhase(CFG.breathPeriodSec * 0.75), 'exhale');
});

test('a stopped game does not advance', () => {
  const s = createGameState();
  assert.equal(stepGame(s, 1, true), s);
});

test('holding raises the player, releasing lowers it, within bounds', () => {
  const start = { ...createGameState(), running: true };
  const up = run(start, 3, () => true);
  assert.ok(up.y < start.y);
  const down = run({ ...up }, 6, () => false);
  assert.ok(down.y > up.y);
  assert.ok(down.y <= CFG.height - CFG.margin);
});

test('following the guide scores higher than never breathing', () => {
  const start = { ...createGameState(), running: true };
  const follow = run(start, CFG.roundSec, t => guidePhase(t) === 'inhale');
  const idle = run(start, CFG.roundSec, () => false);
  assert.equal(follow.finished, true);
  assert.equal(follow.running, false);
  assert.ok(Math.abs(follow.t - CFG.roundSec) < 1e-9);
  assert.ok(accuracy(follow) > 0.6, `follow accuracy ${accuracy(follow)}`);
  assert.ok(accuracy(follow) > accuracy(idle) + 0.3);
});
