/**
 * Breath session engine: maps elapsed time to the current phase and lung level.
 * Pure and deterministic, so the UI just feeds it a clock and renders the result.
 */
import { cycleSeconds } from './patterns.js';

// Smooth start/stop so the guide circle doesn't jerk at phase boundaries.
export const easeInOut = t => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2;

function phaseTarget(phase, startLevel) {
  if (phase.to !== undefined) return phase.to;
  if (phase.type === 'inhale') return 1;
  if (phase.type === 'exhale') return 0;
  return startLevel;
}

/** Lung level (0..1) at the start of every phase in one cycle. */
export function phaseStartLevels(pattern) {
  const levels = [];
  let level = 0;
  for (const ph of pattern.phases) {
    levels.push(level);
    level = phaseTarget(ph, level);
  }
  return levels;
}

export function sessionDuration(pattern, rounds) {
  return cycleSeconds(pattern) * rounds;
}

/**
 * @returns {{
 *   done: boolean, round: number, phaseIndex: number, phase: object,
 *   phaseElapsed: number, phaseRemaining: number, level: number,
 *   sessionProgress: number, remaining: number
 * }}
 */
export function getSessionFrame(pattern, rounds, elapsedSec) {
  const cycle = cycleSeconds(pattern);
  const total = cycle * rounds;
  const elapsed = Math.max(0, elapsedSec);
  const startLevels = phaseStartLevels(pattern);

  if (elapsed >= total) {
    const lastIndex = pattern.phases.length - 1;
    const lastPhase = pattern.phases[lastIndex];
    return {
      done: true,
      round: rounds,
      phaseIndex: lastIndex,
      phase: lastPhase,
      phaseElapsed: lastPhase.seconds,
      phaseRemaining: 0,
      level: phaseTarget(lastPhase, startLevels[lastIndex]),
      sessionProgress: 1,
      remaining: 0
    };
  }

  const roundIndex = Math.floor(elapsed / cycle);
  let t = elapsed - roundIndex * cycle;

  for (let i = 0; i < pattern.phases.length; i++) {
    const phase = pattern.phases[i];
    // The last phase absorbs float rounding so we always return a frame.
    if (t < phase.seconds || i === pattern.phases.length - 1) {
      const from = startLevels[i];
      const to = phaseTarget(phase, from);
      const progress = t / phase.seconds;
      return {
        done: false,
        round: roundIndex + 1,
        phaseIndex: i,
        phase,
        phaseElapsed: t,
        phaseRemaining: Math.max(0, phase.seconds - t),
        level: from + (to - from) * easeInOut(progress),
        sessionProgress: elapsed / total,
        remaining: total - elapsed
      };
    }
    t -= phase.seconds;
  }
}
