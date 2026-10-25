/**
 * "Breath Pacer" game logic.
 * A guide band rises and falls at a slow breathing rate; the player holds to inhale
 * (rise) and releases to exhale (sink). Score = share of time spent inside the band.
 * Pure state + step function: the canvas component only renders what this returns.
 */

export const GAME_CONFIG = {
  width: 920,
  height: 300,
  roundSec: 60,
  breathPeriodSec: 10,   // 6 breaths per minute
  amplitude: 95,         // px from the vertical midline
  bandHalfWidth: 26,     // px
  riseSpeed: 40,         // px/s while holding (≈ guide travel 2·amplitude per half-period)
  sinkSpeed: 40,         // px/s while released
  response: 6,           // 1/s, how quickly velocity follows input
  margin: 24
};

/** Guide centre (canvas y) at time t. Starts at the bottom, so the first half-period is an inhale. */
export function guideY(t, cfg = GAME_CONFIG) {
  return cfg.height / 2 + cfg.amplitude * Math.cos((2 * Math.PI * t) / cfg.breathPeriodSec);
}

/** 'inhale' while the guide is moving up, 'exhale' while it moves down. */
export function guidePhase(t, cfg = GAME_CONFIG) {
  const phase = (t % cfg.breathPeriodSec) / cfg.breathPeriodSec;
  return phase < 0.5 ? 'inhale' : 'exhale';
}

export function createGameState(cfg = GAME_CONFIG) {
  return {
    t: 0,
    y: guideY(0, cfg),
    vy: 0,
    inBandSec: 0,
    running: false,
    finished: false
  };
}

export function accuracy(state) {
  return state.t > 0 ? state.inBandSec / state.t : 0;
}

/** Advance the game by dt seconds. Returns a new state object. */
export function stepGame(state, dt, holding, cfg = GAME_CONFIG) {
  if (!state.running || state.finished) return state;

  const step = Math.min(dt, cfg.roundSec - state.t);
  const targetVy = holding ? -cfg.riseSpeed : cfg.sinkSpeed;
  // Exponential approach gives a gentle, frame-rate-independent response.
  const vy = state.vy + (targetVy - state.vy) * (1 - Math.exp(-cfg.response * step));
  const y = Math.min(cfg.height - cfg.margin, Math.max(cfg.margin, state.y + vy * step));
  // Snap to the end so float accumulation (e.g. 3600 × 1/60) can't leave t a hair short.
  const finished = cfg.roundSec - (state.t + step) < 1e-6;
  const t = finished ? cfg.roundSec : state.t + step;
  const inside = Math.abs(y - guideY(t, cfg)) <= cfg.bandHalfWidth;

  return {
    ...state,
    t,
    y,
    vy,
    inBandSec: state.inBandSec + (inside ? step : 0),
    finished,
    running: !finished
  };
}
