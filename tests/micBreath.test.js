import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBreathDetector } from '../src/lib/micBreath.js';

const DT = 1 / 60;
const feed = (d, rms, sec) => {
  let out;
  for (let t = 0; t < sec; t += DT) out = d.update(rms, DT);
  return out;
};

test('stays idle while calibrating to the room', () => {
  const d = createBreathDetector();
  assert.equal(feed(d, 0.2, 1).calibrating, true);
  assert.equal(feed(d, 0.2, 0.1).active, false);
});

test('a breath well above the noise floor turns on, room noise does not', () => {
  const d = createBreathDetector();
  feed(d, 0.01, 1.3);
  assert.equal(feed(d, 0.012, 0.5).active, false);
  assert.equal(feed(d, 0.06, 0.2).active, true);
  assert.equal(feed(d, 0.008, 0.2).active, false);
});

test('hysteresis: a breath that fades a little keeps holding', () => {
  const d = createBreathDetector();
  feed(d, 0.01, 1.3);
  feed(d, 0.06, 0.2);
  assert.equal(feed(d, 0.025, 0.3).active, true); // below "on", above "off"
  assert.equal(feed(d, 0.012, 0.1).active, false);
});

test('silent rooms still need a real breath', () => {
  const d = createBreathDetector();
  feed(d, 0, 1.3);
  assert.equal(feed(d, 0.01, 0.2).active, false);
  assert.equal(feed(d, 0.03, 0.2).active, true);
});
