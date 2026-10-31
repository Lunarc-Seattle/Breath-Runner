/**
 * Records one clean lap of each level as PNG frames, for the README GIFs.
 *
 * The breathing is planned here with the game's own physics (stepRunner), then replayed in a real
 * browser that only advances when told to: requestAnimationFrame and performance.now are replaced,
 * so each step is exactly one 1/60 s frame and the run on screen is the planned one, frame for frame,
 * however slow the screenshots are.
 *
 *   npx vite --port 5199 &
 *   node scripts/media/record-gameplay.mjs <out-dir> [http://localhost:5199] [level ids...]
 *   python3 scripts/media/make-gifs.py <out-dir> docs/media
 */
/* global window, document -- frameDriver and the evaluate callbacks run in the page */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { createRunnerState, stepRunner, edgeDistance } from '../../src/core/forestRunner.ts';
import { FOREST_LEVELS } from '../../src/core/forestLevels.ts';

const DT = 1 / 60;
const SHOT_EVERY = 2; // 30 fps
const TAIL_FRAMES = 110; // keep recording after the lap ends, for the result card

const LEVEL_TABS = {
  'MAP-FOREST-01': /^Forest · Level 1/,
  'MAP-CANYON-02': /^Sunlit Canyon · Level 2/,
  'MAP-GLACIER-03': /^Glacier Ridge · Level 3/
};

/** Runs in the page before the app: animation frames fire only when __step() is called. */
function frameDriver() {
  let now = 0;
  let nextId = 0;
  let queue = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = cb => (queue.set(++nextId, cb), nextId);
  window.cancelAnimationFrame = handle => queue.delete(handle);
  window.__step = n => {
    for (let i = 0; i < n; i++) {
      now += 1000 / 60;
      const due = queue;
      queue = new Map();
      due.forEach(cb => cb(now));
    }
  };
}

/** Per-frame "inhaling?" for one lap. Scripted levels breathe their script; Level 1 breathes the
 *  way the game teaches: in while the arrow tilts up, out when it tilts down. */
function planLap(level) {
  const { map, config: cfg, speed } = level;
  const script = cfg.breathCues;
  const frames = [];
  let s = createRunnerState(map);
  let holdLeft = 0;
  let next = 0;
  while (s.lap === 1 && frames.length < 60 / DT) {
    let holding;
    if (script) {
      if (s.onGround && holdLeft <= 0 && next < script.length && s.x >= script[next][0]) holdLeft = script[next++][1];
      holding = holdLeft > 0;
    } else {
      holding = s.onGround
        ? edgeDistance(map, s.x, s.y, cfg.cueLeadPx, cfg) < cfg.cueLeadPx
        : s.cue === 'inhale' && s.lung > 0;
    }
    s = stepRunner(s, DT, holding, map, cfg, speed);
    holdLeft -= DT;
    frames.push(holding);
    if (s.events.some(e => e.type === 'fall')) throw new Error(`${level.id}: planned run falls at x=${s.x}`);
  }
  return { frames, coins: s.coins, total: map.coins.length };
}

async function recordLevel(browser, baseUrl, level, outDir) {
  const plan = planLap(level);
  console.log(`${level.id}: ${plan.frames.length} frames, ${plan.coins}/${plan.total} coins planned`);

  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await page.addInitScript(frameDriver);
  await page.goto(`${baseUrl}/#/play`);
  await page.getByRole('button', { name: LEVEL_TABS[level.id] }).click();
  // Let the map's colour filter (a CSS transition) settle and the "switched map" toast go away.
  await expect(page.getByRole('status').filter({ hasText: /^Switched/ })).toHaveCount(0, { timeout: 10_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__step(30));

  // Screenshot a fixed region: element screenshots wait for the element to be "stable", which
  // takes about a second per frame here.
  const clip = await page.locator('.no-touch-callout').boundingBox();
  await page.getByRole('button', { name: '▶ Start running' }).click();
  await page.mouse.move(0, 0);
  // The 3-2-1 count-in runs on real timers; frames stay frozen until it and its "Go!" are gone.
  await expect(page.getByRole('button', { name: 'Pause' })).toBeEnabled({ timeout: 10_000 });
  await expect(page.getByText('Go!', { exact: true })).toHaveCount(0, { timeout: 5_000 });

  mkdirSync(outDir, { recursive: true });
  let holding = false;
  let shot = 0;
  const total = plan.frames.length + TAIL_FRAMES;
  for (let i = 0; i < total; i++) {
    const want = plan.frames[i] ?? false;
    if (want !== holding) {
      await (want ? page.keyboard.down('Space') : page.keyboard.up('Space'));
      holding = want;
    }
    await page.evaluate(() => window.__step(1));
    if (i % SHOT_EVERY === 0) {
      await page.screenshot({ path: join(outDir, `${String(shot++).padStart(4, '0')}.png`), clip, caret: 'hide' });
    }
  }
  // The lap card confirms the browser played the plan: same coins, no slips.
  const card = await page.getByText(/ s · \d+% breath sync · \d+ slips$/).textContent();
  const coins = Number(
    await page
      .getByText(/^\d+ \/ \d+ coins$/)
      .textContent()
      .then(t => t.split(' ')[0])
  );
  console.log(`  played: ${coins} coins, ${card}`);
  if (coins !== plan.coins || !card.endsWith(' 0 slips')) throw new Error(`${level.id}: browser run left the plan`);
  writeFileSync(join(outDir, 'plan.json'), JSON.stringify({ ...plan, frames: undefined, shots: shot }));
  await page.close();
}

const [outRoot = 'gameplay-frames', baseUrl = 'http://localhost:5199', ...only] = process.argv.slice(2);
const levels = Object.values(FOREST_LEVELS).filter(l => !only.length || only.includes(l.id));
const browser = await chromium.launch();
try {
  for (const level of levels) await recordLevel(browser, baseUrl, level, join(outRoot, level.id));
} finally {
  await browser.close();
}
