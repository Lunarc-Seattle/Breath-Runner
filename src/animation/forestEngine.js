/**
 * Renders the Forest Runner on top of the pic/background.ai illustration.
 *  - The exported .ai artwork is an <img> panned by a CSS transform (GPU, stays crisp).
 *  - A canvas on top draws everything that moves: runner, pacer arrow, coins, mist, birds, particles.
 * Game rules live in src/core/forestRunner.ts; this file only animates what the state says.
 *
 * Type-checked via JSDoc (`@ts-check`). The typedefs below are exported, e.g. for a consumer:
 *   @import { ForestStage, HudSnapshot, StageEvent } from '../animation/forestEngine.js'
 * inside a JSDoc comment, or `import('../animation/forestEngine.js').ForestStage` in a type.
 */
// @ts-check
import { FOREST_MAP } from './forestMap.js';
import { RUNNER_CONFIG, createRunnerState, stepRunner, groundAt, syncPct } from '../core/forestRunner.ts';
import { getLevel } from '../core/forestLevels.ts';

/* ------------------------------- types ------------------------------- */

/** @typedef {import('../core/forestRunner.ts').RunnerState} RunnerState */
/** @typedef {import('../core/forestRunner.ts').RunnerEvent} RunnerEvent */
/** @typedef {import('../core/forestRunner.ts').Cue} Cue */
/** @typedef {import('../core/forestLevels.ts').Level} Level */
/** @typedef {import('../core/forestLevels.ts').LevelId} LevelId */

/**
 * Per-map look applied on top of the shared artwork.
 * @typedef {object} MapTheme
 * @property {string} filter CSS `filter` for the background image.
 * @property {string} mist Inner colour of the drifting mist gradients.
 */

/**
 * What the HUD shows; sent to `onHud` and alongside every `onEvent`.
 * @typedef {object} HudSnapshot
 * @property {boolean} running
 * @property {number} coins
 * @property {number} lapCoins
 * @property {number} totalCoins Coins on the current level's map.
 * @property {number} combo
 * @property {number} bestCombo
 * @property {number} lap
 * @property {number} falls
 * @property {number} sync Percent of time the breath matched the cue, 0..100.
 * @property {number} lung Breath left for floating, 0..1.
 * @property {Cue} cue
 * @property {boolean} onGround
 * @property {boolean} respawning
 * @property {number} elapsed Seconds run so far.
 * @property {number} progress Lap progress, 0..1.
 */

/**
 * The engine's own event: the tab was hidden mid-run, so the page should show its paused state.
 * @typedef {{ type: 'hidden' }} HiddenEvent
 */

/**
 * Everything `onEvent` can receive: the core runner events plus the engine's own.
 * @typedef {RunnerEvent | HiddenEvent} StageEvent
 */

/**
 * @typedef {object} ForestStageOptions
 * @property {HTMLElement} stage Element whose size the canvas fills.
 * @property {HTMLElement} background The artwork `<img>`, panned with a CSS transform.
 * @property {HTMLCanvasElement} canvas Overlay canvas for everything that moves.
 * @property {(hud: HudSnapshot) => void} [onHud] Called every HUD_INTERVAL_MS and on state changes.
 * @property {(event: StageEvent, hud: HudSnapshot) => void} [onEvent] Called once per event.
 */

/**
 * The handle returned by `createForestStage`.
 * @typedef {object} ForestStage
 * @property {(value: boolean) => void} setHolding Whether the player is inhaling.
 * @property {(value: boolean) => void} setRunning
 * @property {(value: number) => void} setSpeed Multiplier on the level's pace.
 * @property {(id: string) => void} setMap Switch level (unknown ids fall back to the first); restarts on change.
 * @property {() => void} restart
 * @property {() => HudSnapshot} snapshot
 * @property {() => void} destroy Stop the loop and remove every listener and observer.
 */

/**
 * A coin-burst or fall particle (`color`), or a floating score label (`text`).
 * @typedef {{ x: number, y: number, vx: number, vy: number, life: number, color: string, text?: undefined }
 *   | { x: number, y: number, vx: number, vy: number, life: number, text: string, color?: undefined }} Particle
 */

/** @typedef {{ x: number, y: number, vx: number, vy: number, life: number }} Dust */
/** @typedef {{ x: number, y: number, w: number, h: number, v: number }} MistBand */
/** @typedef {{ x: number, y: number, s: number, v: number, p: number }} Bird */
/** @typedef {{ x: number, y: number, r: number, v: number, p: number }} Spark */
/** @typedef {{ w: number, h: number, scale: number, offY: number, dpr: number }} View */

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/forest/`;
const HUD_INTERVAL_MS = 120;
// Phones draw the artboard at about half scale: keep coins at least this many CSS px across.
const MIN_COIN_CSS_PX = 24;
// Narrowest a coin gets mid-spin, as a share of its width; any thinner reads as a smaller coin.
const MIN_COIN_SPIN = 0.55;
const RUNNER_W = FOREST_MAP.runner.w;
const RUNNER_H = FOREST_MAP.runner.h;

// Per-map look: the Forest art is the .ai as drawn; other scenes re-grade it until their own art exists.
// Difficulty (coin layout, pace, lung size) lives in src/core/forestLevels.ts.
/** @type {Record<LevelId, MapTheme>} */
export const MAP_THEMES = {
  'MAP-FOREST-01': { filter: 'none', mist: 'rgba(246,233,223,0.32)' },
  'MAP-CANYON-02': {
    filter: 'sepia(0.55) saturate(1.7) hue-rotate(-30deg) brightness(1.03)',
    mist: 'rgba(255,214,170,0.3)'
  },
  'MAP-GLACIER-03': { filter: 'saturate(0.5) brightness(1.14) hue-rotate(14deg)', mist: 'rgba(235,245,255,0.42)' }
};

/**
 * Theme for a map id; unknown ids fall back to the first map (mirrors getLevel).
 * @param {string} id
 * @returns {MapTheme}
 */
function themeFor(id) {
  // Same lookup as getLevel in src/core/forestLevels.ts: own keys only, anything else falls back.
  return Object.hasOwn(MAP_THEMES, id) ? MAP_THEMES[/** @type {LevelId} */ (id)] : MAP_THEMES['MAP-FOREST-01'];
}

/**
 * The canvas's 2D context. getContext('2d') is null only when the canvas already holds another
 * context type or the browser has no 2D canvas; fail loudly here rather than on the first draw.
 * @param {HTMLCanvasElement} canvas
 * @returns {CanvasRenderingContext2D}
 */
function get2dContext(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Forest Runner: 2D canvas context unavailable');
  return ctx;
}

/** @param {string} name */
function loadImage(name) {
  const img = new Image();
  img.src = ASSET_BASE + name;
  return img;
}

export const FOREST_BACKGROUND_URL = ASSET_BASE + 'background.jpg';

/**
 * @param {ForestStageOptions} options
 * @returns {ForestStage}
 */
export function createForestStage({ stage, background, canvas, onHud, onEvent }) {
  const ctx = get2dContext(canvas);
  const sprites = { runner: loadImage('runner.png'), arrow: loadImage('arrow.png'), coin: loadImage('coin.png') };
  const W = FOREST_MAP.width;
  const H = FOREST_MAP.height;

  let level = getLevel('MAP-FOREST-01');
  let state = createRunnerState(level.map);
  let running = false;
  let holding = false;
  let speedMul = 1;
  let theme = MAP_THEMES['MAP-FOREST-01'];
  let time = 0;
  let camX = 0;
  /** @type {View} */
  let view = { w: 0, h: 0, scale: 1, offY: 0, dpr: 1 };
  let raf = 0;
  let last = performance.now();
  let lastHud = 0;
  let landSquash = 0;

  // ── Web Worker for off-main-thread physics ──────────────────────────────
  /** @type {Worker | null} */
  let physicsWorker = null;
  /** @type {import('../core/forestRunner.ts').RunnerState | null} */
  let pendingState = null;
  let workerBusy = false;

  try {
    physicsWorker = new Worker(new URL('../core/physicsWorker.ts', import.meta.url), { type: 'module' });
    physicsWorker.onmessage = ({ data }) => {
      if (data.type === 'stepped') {
        pendingState = data.state;
        workerBusy = false;
      }
    };
    physicsWorker.onerror = () => {
      // Worker failed to load (unsupported, CSP, etc.) — fall back to synchronous physics.
      physicsWorker = null;
    };
  } catch {
    physicsWorker = null;
  }
  // ────────────────────────────────────────────────────────────────────────

  // Reduced motion: ambient scenery (mist, birds, sparks) holds still and coins don't spin.
  // Gameplay (runner, arrow, coins, particles) is unchanged.
  const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reducedMotion = !!motionQuery?.matches;
  /** @param {MediaQueryListEvent} e */
  const onMotionChange = e => {
    reducedMotion = e.matches;
  };
  motionQuery?.addEventListener?.('change', onMotionChange);

  // Gradients are built once at the origin and positioned with translate.
  /** @type {Map<number, CanvasGradient>} */
  const glowCache = new Map(); // coin size -> radial gradient
  /** @type {Map<number, CanvasGradient>} */
  const mistCache = new Map(); // mist width -> radial gradient (for the current theme)
  /** @param {number} size */
  function coinGlow(size) {
    let g = glowCache.get(size);
    if (!g) {
      g = ctx.createRadialGradient(0, 0, 2, 0, 0, size);
      g.addColorStop(0, 'rgba(253,224,71,0.5)');
      g.addColorStop(1, 'rgba(253,224,71,0)');
      glowCache.set(size, g);
    }
    return g;
  }
  /** @param {number} w */
  function mistGradient(w) {
    let g = mistCache.get(w);
    if (!g) {
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
      g.addColorStop(0, theme.mist);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      mistCache.set(w, g);
    }
    return g;
  }
  /** @param {MapTheme} next */
  function applyTheme(next) {
    theme = next;
    mistCache.clear();
    background.style.filter = theme.filter;
  }
  applyTheme(theme);

  /** @type {Particle[]} */
  const particles = [];
  /** @type {Dust[]} */
  const dust = [];
  /** @type {MistBand[]} */
  const mist = Array.from({ length: 6 }, (_, i) => ({
    x: (i / 6) * W,
    y: 380 + (i % 3) * 120,
    w: 520 + (i % 2) * 260,
    h: 46 + (i % 3) * 18,
    v: 8 + (i % 3) * 5
  }));
  /** @type {Bird[]} */
  const birds = [
    { x: 300, y: 250, s: 0.9, v: 34, p: 0 },
    { x: 1300, y: 170, s: 0.7, v: 26, p: 1.7 },
    { x: 2000, y: 300, s: 0.6, v: 30, p: 3.1 }
  ];
  /** @type {Spark[]} */
  const sparks = Array.from({ length: 36 }, () => ({
    x: Math.random() * W,
    y: 520 + Math.random() * 520,
    r: 1.6 + Math.random() * 2.6,
    v: 6 + Math.random() * 14,
    p: Math.random() * Math.PI * 2
  }));

  function resize() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Fill the stage height; on very wide stages fill the width and keep the cliffs (bottom) in view.
    const scale = Math.max(rect.height / H, rect.width / W);
    view = { w: rect.width, h: rect.height, scale, offY: rect.height - H * scale, dpr };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    background.style.width = `${W * scale}px`;
    background.style.height = `${H * scale}px`;
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  resize();

  /**
   * @param {number} x
   * @param {number} y
   */
  function spawnCoinBurst(x, y) {
    for (let k = 0; k < 14; k++) {
      const a = (Math.PI * 2 * k) / 14;
      const v = 90 + Math.random() * 120;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 40,
        life: 1,
        color: k % 2 ? '#fbb03b' : '#fde047'
      });
    }
    particles.push({ x, y: y - 20, vx: 0, vy: -70, life: 1.2, text: '+1' });
  }

  /** @param {RunnerEvent[]} events */
  function handleEvents(events) {
    for (const e of events) {
      if (e.type === 'coin') spawnCoinBurst(e.x, e.y);
      if (e.type === 'land') {
        landSquash = 1;
        for (let k = 0; k < 6; k++)
          dust.push({
            x: state.x - 10 + k * 4,
            y: state.y,
            vx: -40 - Math.random() * 60,
            vy: -20 - Math.random() * 30,
            life: 0.7
          });
      }
      if (e.type === 'fall') {
        for (let k = 0; k < 18; k++)
          particles.push({
            x: e.x,
            y: e.y - 60,
            vx: (Math.random() - 0.5) * 220,
            vy: -Math.random() * 200,
            life: 1,
            color: '#7accf3'
          });
      }
      if (onEvent) onEvent(e, snapshot());
    }
  }

  /** @returns {HudSnapshot} */
  function snapshot() {
    return {
      running,
      coins: state.coins,
      lapCoins: state.lapCoins,
      totalCoins: level.map.coins.length,
      combo: state.combo,
      bestCombo: state.bestCombo,
      lap: state.lap,
      falls: state.falls,
      sync: syncPct(state),
      lung: state.lung,
      cue: state.cue,
      onGround: state.onGround,
      respawning: state.respawnSec > 0,
      elapsed: state.elapsed,
      progress: Math.min(1, (state.x - FOREST_MAP.runner.x) / (W - RUNNER_CONFIG.endPad - FOREST_MAP.runner.x))
    };
  }

  /** @param {number} dt Seconds since the last frame. */
  function update(dt) {
    time += dt;
    if (running) {
      if (physicsWorker) {
        // Off-main-thread path: apply buffered result from the previous frame, then
        // dispatch the next step immediately so the Worker stays one frame ahead.
        if (pendingState) {
          handleEvents(pendingState.events);
          state = pendingState;
          pendingState = null;
        }
        if (!workerBusy) {
          workerBusy = true;
          physicsWorker.postMessage({ type: 'step', state, dt, holding, speed: speedMul });
        }
      } else {
        // Synchronous fallback (Worker unavailable or blocked by CSP).
        state = stepRunner(state, dt, holding, level.map, level.config, speedMul * level.speed);
        handleEvents(state.events);
      }
      if (state.onGround && !state.respawnSec && Math.random() < dt * 9) {
        dust.push({
          x: state.x - 18,
          y: state.y,
          vx: -30 - Math.random() * 40,
          vy: -10 - Math.random() * 20,
          life: 0.5
        });
      }
    }
    landSquash = Math.max(0, landSquash - dt * 4);

    const visW = view.w / view.scale;
    const target = Math.min(Math.max(0, state.x - visW * 0.32), Math.max(0, W - visW));
    camX += (target - camX) * Math.min(1, dt * 4);
    if (Math.abs(target - camX) > visW) camX = target; // lap restart: cut, don't sweep back

    if (!reducedMotion) {
      mist.forEach(m => {
        m.x += m.v * dt;
        if (m.x > W + m.w) m.x = -m.w;
      });
      birds.forEach(b => {
        b.x += b.v * dt;
        if (b.x > W + 80) b.x = -80;
      });
      sparks.forEach(s => {
        s.y -= s.v * dt;
        if (s.y < 480) {
          s.y = 1100;
          s.x = Math.random() * W;
        }
      });
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.text ? 0 : 300) * dt;
      p.life -= dt * 1.5;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt * 1.6;
      if (d.life <= 0) dust.splice(i, 1);
    }
  }

  /* ------------------------------ drawing ------------------------------ */

  function drawMist() {
    mist.forEach(m => {
      ctx.fillStyle = mistGradient(m.w);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.scale(1, m.h / (m.w / 2));
      ctx.beginPath();
      ctx.arc(0, 0, m.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawBirds() {
    birds.forEach(b => {
      const flap = reducedMotion ? 0.5 : Math.sin(time * 7 + b.p);
      const y = reducedMotion ? b.y : b.y + Math.sin(time * 1.6 + b.p) * 10;
      ctx.save();
      ctx.translate(b.x, y);
      ctx.scale(b.s, b.s);
      const g = ctx.createLinearGradient(-26, 0, 26, 0);
      g.addColorStop(0, '#9fd3f2');
      g.addColorStop(1, '#6f8fd8');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-26, -12 * flap);
      ctx.quadraticCurveTo(-10, -16 - 9 * flap, 0, 0);
      ctx.quadraticCurveTo(10, -18 - 9 * flap, 28, -10 * flap);
      ctx.quadraticCurveTo(12, -4 - 4 * flap, 2, 6);
      ctx.quadraticCurveTo(-10, -4 - 4 * flap, -26, -12 * flap);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawCoins() {
    const img = sprites.coin;
    level.map.coins.forEach((c, i) => {
      if (state.taken[i]) return;
      const bob = Math.sin(time * 3 + i * 0.7) * 5;
      const spin = reducedMotion ? 1 : Math.cos(time * 3.6 + i * 0.5);
      const size = Math.round(Math.max(c.r * 2, MIN_COIN_CSS_PX / view.scale)); // rounded: glows are cached by size
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      ctx.fillStyle = coinGlow(size);
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.scale(MIN_COIN_SPIN + (1 - MIN_COIN_SPIN) * Math.abs(spin), 1);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    });
  }

  function drawArrow() {
    const ax = state.x + 150;
    const ground = groundAt(FOREST_MAP, ax, state.y - 40, 60) ?? state.y;
    const inhale = state.cue === 'inhale';
    const breath = Math.sin(time * 2.4) * 10;
    const ay = Math.min(ground, state.y) - 150 + breath - (inhale ? 40 : 0);
    const angle = inhale ? -0.45 : 0.08 + Math.sin(time * 2.4) * 0.05;
    const size = FOREST_MAP.arrow.w * (1 + Math.sin(time * 4) * 0.05) * (inhale ? 1.15 : 1);

    // Dotted golden guide from runner to arrow.
    ctx.strokeStyle = inhale ? 'rgba(253,224,71,0.85)' : 'rgba(253,224,71,0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 9]);
    ctx.lineDashOffset = -time * 40;
    ctx.beginPath();
    ctx.moveTo(state.x + 30, state.y - 110);
    ctx.quadraticCurveTo((state.x + ax) / 2, ay - 30, ax - 26, ay);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(250,204,21,0.9)';
    ctx.shadowBlur = inhale ? 26 : 14;
    if (sprites.arrow.complete && sprites.arrow.naturalWidth)
      ctx.drawImage(sprites.arrow, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawRunner() {
    const img = sprites.runner;
    const ground = groundAt(FOREST_MAP, state.x, state.y, 2);
    if (ground !== null && ground < RUNNER_CONFIG.fallY) {
      const lift = Math.max(0, ground - state.y);
      const k = Math.max(0.3, 1 - lift / 260);
      ctx.fillStyle = `rgba(4,33,75,${0.28 * k})`;
      ctx.beginPath();
      ctx.ellipse(state.x, ground + 2, 34 * k, 8 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    dust.forEach(d => {
      ctx.fillStyle = `rgba(246,233,223,${d.life * 0.8})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 4 + (1 - d.life) * 8, 0, Math.PI * 2);
      ctx.fill();
    });

    const runPhase = state.elapsed * 11 * speedMul;
    const bounce = state.onGround && running && !state.respawnSec ? Math.abs(Math.sin(runPhase)) * 7 : 0;
    const lean = state.onGround ? 0.05 + Math.sin(runPhase) * 0.035 : state.vy < 0 ? -0.12 : 0.1;
    const squashY = 1 - landSquash * 0.12 + (!state.onGround && state.vy < 0 ? 0.05 : 0);
    const squashX = 1 + landSquash * 0.1;

    ctx.save();
    ctx.translate(state.x, state.y - bounce);
    ctx.rotate(lean);
    ctx.scale(squashX, squashY);
    if (holding && !state.onGround && state.lung > 0) {
      // Inhale glide: a soft breath aura around the runner.
      const aura = ctx.createRadialGradient(0, -RUNNER_H / 2, 10, 0, -RUNNER_H / 2, RUNNER_H * 0.75);
      aura.addColorStop(0, 'rgba(122,204,243,0.35)');
      aura.addColorStop(1, 'rgba(122,204,243,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, -RUNNER_H / 2, RUNNER_H * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.respawnSec > 0) ctx.globalAlpha = Math.sin(time * 18) > 0 ? 1 : 0.3; // "get ready" blink
    if (img.complete && img.naturalWidth) ctx.drawImage(img, -RUNNER_W / 2, -RUNNER_H, RUNNER_W, RUNNER_H);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawEffects() {
    sparks.forEach(s => {
      const t = reducedMotion ? 0 : time;
      ctx.globalAlpha = 0.25 + (Math.sin(t * 3 + s.p) * 0.5 + 0.5) * 0.55;
      ctx.fillStyle = '#fdf6b2';
      ctx.beginPath();
      ctx.arc(s.x + Math.sin(t + s.p) * 10, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      // Discriminate on presence (labels are never empty), so the else branch is a coloured dot.
      if (p.text !== undefined) {
        ctx.fillStyle = '#fde047';
        ctx.strokeStyle = 'rgba(4,33,75,0.6)';
        ctx.lineWidth = 4;
        ctx.font = '800 34px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  function render() {
    const { scale, offY, dpr } = view;
    background.style.transform = `translate3d(${-camX * scale}px, ${offY}px, 0)`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -camX * scale * dpr, offY * dpr);
    drawMist();
    drawBirds();
    drawCoins();
    drawArrow();
    drawRunner();
    drawEffects();
  }

  /** @param {DOMHighResTimeStamp} now */
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); // clamp after tab switches
    last = now;
    update(dt);
    render();
    if (onHud && now - lastHud > HUD_INTERVAL_MS) {
      lastHud = now;
      onHud(snapshot());
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // Hidden tab: stop the loop entirely; resume without a time jump when it's visible again.
  function onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      // Don't resume a run behind the user's back: let the page show its paused state.
      if (running && onEvent) onEvent({ type: 'hidden' }, snapshot());
    } else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  /** @type {ForestStage} */
  const api = {
    setHolding(value) {
      holding = value;
    },
    setRunning(value) {
      // A breath already held when the run starts (e.g. through the count-in) doesn't jump; a new one will.
      if (value && !running) state = { ...state, wasHolding: holding };
      running = value;
      if (onHud) onHud(snapshot());
    },
    setSpeed(value) {
      speedMul = value;
    },
    setMap(id) {
      const nextTheme = themeFor(id);
      if (nextTheme !== theme) applyTheme(nextTheme);
      const nextLevel = getLevel(id);
      if (nextLevel !== level) {
        level = nextLevel;
        // Tell the Worker about the new level so it pre-loads the right map.
        if (physicsWorker) physicsWorker.postMessage({ type: 'setMap', mapId: id });
        this.restart();
      }
    },
    restart() {
      state = createRunnerState(level.map);
      pendingState = null;
      workerBusy = false;
      camX = 0;
      particles.length = 0;
      if (onHud) onHud(snapshot());
    },
    snapshot,
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      physicsWorker?.terminate();
      physicsWorker = null;
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery?.removeEventListener?.('change', onMotionChange);
      resizeObserver.disconnect();
    }
  };
  return api;
}
