/**
 * Microphone breath input: no trainer hardware needed. Breathing audibly near the mic makes
 * broadband airflow noise; when its level rises well above the room's noise floor we treat it
 * as "breathing in" and hold the game's inhale.
 *
 * createBreathDetector is pure (feed it RMS levels) so it can be unit-tested;
 * startMicBreath wires it to getUserMedia + Web Audio.
 */

export function createBreathDetector({
  calibrateSec = 1.2,  // listen to the room first
  onRatio = 2.6,       // start when level > floor x onRatio ...
  offRatio = 1.7,      // ... stop when it falls below floor x offRatio (hysteresis)
  minDelta = 0.012,    // and always at least this far above the floor
  minFloor = 0.003
} = {}) {
  let elapsed = 0;
  let sum = 0;
  let samples = 0;
  let floor = minFloor;
  let active = false;

  return {
    update(rms, dt) {
      elapsed += dt;
      if (elapsed < calibrateSec) {
        sum += rms;
        samples += 1;
        floor = Math.max(minFloor, sum / samples);
        return { active: false, calibrating: true, level: 0 };
      }
      const onAt = Math.max(floor * onRatio, floor + minDelta);
      const offAt = Math.max(floor * offRatio, floor + minDelta * 0.6);
      active = active ? rms > offAt : rms > onAt;
      // Let the floor drift with the room, but never learn from the breath itself.
      if (!active && rms < floor * 1.5) floor = Math.max(minFloor, floor * 0.995 + rms * 0.005);
      return { active, calibrating: false, level: Math.min(1, rms / onAt) };
    }
  };
}

/** Explain a getUserMedia failure in terms the user can act on. */
export function describeMicError(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone access is blocked. Allow the mic for this site (and for your browser in System Settings → Privacy → Microphone), then try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No microphone found. Connect one, or hold the screen / Space to inhale.';
    case 'NotReadableError':
      return 'The microphone is in use by another app. Close it and try again.';
    default:
      return 'Microphone unavailable. Hold the screen or Space to inhale instead.';
  }
}

/**
 * Must be called from a click: the AudioContext is created synchronously inside the gesture,
 * otherwise browsers keep it suspended and the mic reads silence.
 * Calls onUpdate({ active, calibrating, level }) every frame. Resolves to stop().
 */
export async function startMicBreath(onUpdate) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error('insecure'), { name: 'SecurityError' });
  }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctor();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    if (ctx.state === 'suspended') await ctx.resume();
  } catch (err) {
    ctx.close();
    throw err;
  }
  const source = ctx.createMediaStreamSource(stream);
  // Airflow hiss sits above voice hum and below most electrical whine.
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1800;
  band.Q.value = 0.6;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(band).connect(analyser);

  const buf = new Float32Array(analyser.fftSize);
  const detector = createBreathDetector();
  let raf = 0;
  let last = performance.now();
  const tick = now => {
    analyser.getFloatTimeDomainData(buf);
    let sq = 0;
    for (let i = 0; i < buf.length; i++) sq += buf[i] * buf[i];
    onUpdate(detector.update(Math.sqrt(sq / buf.length), Math.min(0.1, (now - last) / 1000)));
    last = now;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach(t => t.stop());
    ctx.close();
  };
}
