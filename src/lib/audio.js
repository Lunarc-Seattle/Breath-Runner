/**
 * Soft phase-change chimes using the Web Audio API (no audio files).
 * The AudioContext is created lazily on the first user gesture, as browsers require.
 */

const FREQUENCIES = { inhale: 528, hold: 432, exhale: 396 };
let ctx = null;

export function unlockAudio() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function playChime(phaseType) {
  const audio = unlockAudio();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume();

  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = FREQUENCIES[phaseType] || 440;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.95);
}
