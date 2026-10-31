/**
 * "Forest Runner" game logic, played on the cliffs of pic/background.ai.
 * The runner moves right on her own. Starting an inhale on the ground jumps; continuing
 * to inhale in the air floats her (lower gravity) until the lung meter runs out.
 * Pure state + step function, all in .ai design units (2436 x 1125 artboard).
 */

/** One cliff: surface heights sampled every `profileStep` px from x0; null where there is no ground. */
export interface Cliff {
  x0: number;
  tops: (number | null)[];
}

export interface Coin {
  x: number;
  y: number;
  r: number;
}

/** A sprite's placement on the artboard; `bottom` is its lowest y (the runner's feet). */
export interface SpriteBox {
  x: number;
  y: number;
  w: number;
  h: number;
  bottom: number;
}

/** The playable map exported from the .ai file (see src/animation/forestMap.js). */
export interface ForestMap {
  width: number;
  height: number;
  profileStep: number;
  cliffs: Cliff[];
  coins: Coin[];
  runner: SpriteBox;
  arrow: SpriteBox;
}

/** A scripted breath: [x where the jump starts, seconds to keep inhaling]. */
export type BreathCue = [x: number, holdSec: number];

export type Cue = 'inhale' | 'exhale';

export interface RunnerConfig {
  runSpeed: number;
  gravity: number;
  /** Gravity on the way down when not inhaling: she drops faster than she rises. */
  fallGravity: number;
  floatGravity: number;
  glideVy: number;
  jumpVy: number;
  /** An inhale this soon after walking off an edge still jumps. */
  coyoteSec: number;
  lungSec: number;
  refillSec: number;
  stepUp: number;
  fallY: number;
  bodyOffset: number;
  coinReach: number;
  cueLeadPx: number;
  respawnPauseSec: number;
  respawnInset: number;
  endPad: number;
  /** Scripted levels only: cue the player along these breaths instead of reading the terrain. */
  breathCues?: BreathCue[] | null;
}

export type RunnerEvent =
  | { type: 'jump' }
  | { type: 'land' }
  | { type: 'fall'; x: number; y: number }
  | { type: 'coin'; i: number; x: number; y: number }
  | { type: 'lap'; lap: number; coins: number; sec: number; total: number };

export type RunnerEventType = RunnerEvent['type'];

export interface RunnerState {
  x: number;
  y: number;
  vy: number;
  onGround: boolean;
  wasHolding: boolean;
  /** Seconds left in which a new inhale still jumps after leaving the ground without jumping. */
  coyoteSec: number;
  /** Breath left for floating, 0..1. */
  lung: number;
  cue: Cue;
  /** Coins taken this lap, by index into map.coins. */
  taken: boolean[];
  coins: number;
  lapCoins: number;
  combo: number;
  bestCombo: number;
  falls: number;
  lap: number;
  elapsed: number;
  lapElapsed: number;
  /** Seconds the player's breath matched the cue. */
  syncSec: number;
  safeX: number;
  safeY: number;
  respawnSec: number;
  events: RunnerEvent[];
}

export interface Point {
  x: number;
  y: number;
}

export const RUNNER_CONFIG: RunnerConfig = {
  runSpeed: 165, // design px / s
  gravity: 1700, // rising
  fallGravity: 2600, // falling while exhaling: a quick, decisive landing
  floatGravity: 420, // while inhaling in the air
  glideVy: 110, // max fall speed while inhaling: a long steady breath glides far
  jumpVy: -600,
  coyoteSec: 0.2, // ~33 px of grace past an edge, for slow breath onsets (and the mic)
  lungSec: 2.4, // seconds of continuous float on a full breath
  refillSec: 1.6, // seconds to refill from empty while exhaling
  stepUp: 28, // max surface rise the runner walks over
  fallY: 1050, // feet below this = fell between cliffs
  bodyOffset: 76, // feet -> body centre, for coin pickup
  coinReach: 52,
  cueLeadPx: 120, // start cueing "inhale" this far before a gap
  respawnPauseSec: 1.2, // stand still after a fall before running again
  respawnInset: 24, // respawn this far into the cliff's flat top
  endPad: 50
};

/** Cliff-top y at x for one cliff, or null when x is outside it. */
function cliffTop(cliff: Cliff, x: number, step: number): number | null {
  const i = Math.round((x - cliff.x0) / step);
  return i >= 0 && i < cliff.tops.length ? cliff.tops[i] : null;
}

/** Highest cliff surface at x that is not above fromY - reach (i.e. one we can land on or step onto). */
export function groundAt(map: ForestMap, x: number, fromY: number, reach = 0): number | null {
  let best: number | null = null;
  for (const c of map.cliffs) {
    const y = cliffTop(c, x, map.profileStep);
    if (y !== null && y >= fromY - reach && (best === null || y < best)) best = y;
  }
  return best;
}

/** Distance to where the ground ahead falls away (a gap between cliffs), or Infinity within maxPx. */
export function edgeDistance(
  map: ForestMap,
  x: number,
  feetY: number,
  maxPx: number,
  cfg: RunnerConfig = RUNNER_CONFIG
): number {
  for (let dx = 4; dx <= maxPx; dx += 4) {
    const g = groundAt(map, x + dx, feetY, cfg.stepUp);
    if (g === null || g > cfg.fallY || g - feetY > 60) return dx;
  }
  return Infinity;
}

/**
 * Where to put the runner back after a fall: the start of the flat top of the cliff she last
 * stood on, so there is a whole cliff of runway to get ready for the next breath.
 */
export function respawnPoint(map: ForestMap, safeX: number, safeY: number, cfg: RunnerConfig = RUNNER_CONFIG): Point {
  const step = map.profileStep;
  const cliff = map.cliffs.find(c => {
    const top = cliffTop(c, safeX, step);
    return top !== null && Math.abs(top - safeY) < 3;
  });
  if (cliff) {
    const tops = cliff.tops.filter((t): t is number => t !== null);
    const flat = Math.min(...tops) + 40;
    const i = cliff.tops.findIndex(t => t !== null && t <= flat);
    const x = Math.max(map.runner.x, cliff.x0 + i * step + cfg.respawnInset);
    // x lies on this cliff's flat top, so it has a surface there.
    return { x, y: cliffTop(cliff, x, step)! };
  }
  // The start position always stands on the first cliff.
  return { x: map.runner.x, y: groundAt(map, map.runner.x, map.runner.bottom - 40)! };
}

export function createRunnerState(map: ForestMap): RunnerState {
  const startX = map.runner.x;
  // The .ai places the runner standing on the first cliff, so there is ground under her.
  const startY = groundAt(map, startX, map.runner.bottom - 40)!;
  return {
    x: startX,
    y: startY,
    vy: 0,
    onGround: true,
    wasHolding: false,
    coyoteSec: 0,
    lung: 1,
    cue: 'exhale',
    taken: map.coins.map(() => false),
    coins: 0,
    lapCoins: 0,
    combo: 0,
    bestCombo: 0,
    falls: 0,
    lap: 1,
    elapsed: 0,
    lapElapsed: 0,
    syncSec: 0,
    safeX: startX,
    safeY: startY,
    respawnSec: 0,
    events: []
  };
}

export function syncPct(state: Pick<RunnerState, 'elapsed' | 'syncSec'>): number {
  return state.elapsed > 0 ? Math.round((state.syncSec / state.elapsed) * 100) : 100;
}

/** Advance by dt seconds. Returns a new state; `events` lists what happened this step. */
export function stepRunner(
  prev: RunnerState,
  dt: number,
  holding: boolean,
  map: ForestMap,
  cfg: RunnerConfig = RUNNER_CONFIG,
  speedMul = 1
): RunnerState {
  const s: RunnerState = { ...prev, events: [] };
  s.elapsed += dt;
  s.lapElapsed += dt;

  const startedInhale = holding && !prev.wasHolding;
  s.wasHolding = holding;

  // Standing still after a fall. A breath held through the pause does not jump; a new one will.
  if (s.respawnSec > 0) {
    s.respawnSec = Math.max(0, s.respawnSec - dt);
    s.syncSec += dt;
    s.cue = 'exhale';
    if (!holding) s.lung = Math.min(1, s.lung + dt / cfg.refillSec);
    return s;
  }

  // A late inhale just past a rounded rock edge, where she has already started to drop, still jumps.
  if (startedInhale && (s.onGround || s.coyoteSec > 0)) {
    s.vy = cfg.jumpVy;
    s.onGround = false;
    s.coyoteSec = 0;
    s.events.push({ type: 'jump' });
  } else if (!s.onGround) s.coyoteSec = Math.max(0, s.coyoteSec - dt);

  const floating = holding && !s.onGround && s.lung > 0;
  if (floating) s.lung = Math.max(0, s.lung - dt / cfg.lungSec);
  else if (!holding) s.lung = Math.min(1, s.lung + dt / cfg.refillSec);

  const prevY = s.y;
  s.x += cfg.runSpeed * speedMul * dt;

  if (s.onGround) {
    const g = groundAt(map, s.x, s.y, cfg.stepUp);
    if (g !== null && g - s.y < 6) s.y = g;
    else {
      s.onGround = false; // walked off an edge
      s.coyoteSec = cfg.coyoteSec;
    }
  }

  if (!s.onGround) {
    const gravity = floating && s.vy > -200 ? cfg.floatGravity : s.vy > 0 && !holding ? cfg.fallGravity : cfg.gravity;
    s.vy += gravity * dt;
    if (floating) s.vy = Math.min(s.vy, cfg.glideVy);
    s.y += s.vy * dt;
    if (s.vy >= 0) {
      const g = groundAt(map, s.x, prevY, 2);
      if (g !== null && s.y >= g && g < cfg.fallY) {
        s.y = g;
        s.vy = 0;
        s.onGround = true;
        s.safeX = s.x;
        s.safeY = s.y;
        s.events.push({ type: 'land' });
      }
    }
  } else {
    s.safeX = s.x;
    s.safeY = s.y;
  }

  if (s.y > cfg.fallY) {
    s.falls += 1;
    s.combo = 0;
    const back = respawnPoint(map, s.safeX, s.safeY, cfg);
    s.x = back.x;
    s.y = back.y;
    s.safeX = back.x;
    s.safeY = back.y;
    s.vy = 0;
    s.onGround = true;
    s.coyoteSec = 0;
    s.respawnSec = cfg.respawnPauseSec;
    s.events.push({ type: 'fall', x: s.x, y: s.y });
  }

  const bodyY = s.y - cfg.bodyOffset;
  map.coins.forEach((c, i) => {
    if (s.taken[i] || Math.abs(c.x - s.x) > cfg.coinReach) return;
    if (Math.hypot(c.x - s.x, c.y - bodyY) < cfg.coinReach + c.r * 0.5) {
      if (s.taken === prev.taken) s.taken = [...prev.taken];
      s.taken[i] = true;
      s.coins += 1;
      s.lapCoins += 1;
      s.combo += 1;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      s.events.push({ type: 'coin', i, x: c.x, y: c.y });
    }
  });

  // In the air, keep inhaling while there is still a gap below.
  const overGap = (): boolean => {
    const g = groundAt(map, s.x, s.y, 2);
    return g === null || g > cfg.fallY;
  };
  // Scripted levels cue "inhale" just before each jump point as a heads-up. Breathing in there
  // jumps early, so that stretch counts as in sync whatever the player does.
  let leadIn = false;
  if (cfg.breathCues) {
    // Scripted levels: inhale from just before each scripted jump until its hold ends.
    const pxPerSec = cfg.runSpeed * speedMul;
    leadIn = cfg.breathCues.some(([cx]) => s.x > cx - cfg.cueLeadPx && s.x < cx);
    s.cue =
      leadIn || cfg.breathCues.some(([cx, hold]) => s.x >= cx && s.x < cx + hold * pxPerSec) ? 'inhale' : 'exhale';
  } else {
    s.cue = !s.onGround
      ? s.vy < 0 || overGap()
        ? 'inhale'
        : 'exhale'
      : edgeDistance(map, s.x, s.y, cfg.cueLeadPx, cfg) < cfg.cueLeadPx
        ? 'inhale'
        : 'exhale';
  }
  if (leadIn || (s.cue === 'inhale') === holding) s.syncSec += dt;

  if (s.x >= map.width - cfg.endPad) {
    s.events.push({ type: 'lap', lap: s.lap, coins: s.lapCoins, sec: s.lapElapsed, total: map.coins.length });
    const fresh = createRunnerState(map);
    Object.assign(s, {
      x: fresh.x,
      y: fresh.y,
      vy: 0,
      onGround: true,
      safeX: fresh.x,
      safeY: fresh.y,
      respawnSec: 0,
      coyoteSec: 0,
      taken: fresh.taken,
      lap: s.lap + 1,
      lapCoins: 0,
      lapElapsed: 0
    });
  }

  return s;
}
