import { html, useState, useEffect, useRef, useMemo } from '../lib/react.js';
import { PATTERNS, getPattern, createCustomPattern, cycleSeconds, phaseLabel, CUSTOM_LIMITS } from '../core/patterns.js';
import { getSessionFrame, sessionDuration } from '../core/breathEngine.js';
import { formatDuration } from '../core/stats.js';
import { playChime, unlockAudio } from '../lib/audio.js';
import { BreathCircle } from './BreathCircle.js';

// Sessions stopped before this point are not worth recording.
const MIN_SAVE_SEC = 15;

export function PracticePage({ initialPatternId, soundOn, onToggleSound, onSessionEnd }) {
  const [patternId, setPatternId] = useState(initialPatternId || 'box');
  const [custom, setCustom] = useState({ inhale: 4, holdIn: 2, exhale: 6, holdOut: 0 });
  const [rounds, setRounds] = useState(getPattern(initialPatternId || 'box')?.defaultRounds || 6);
  const [status, setStatus] = useState('idle'); // idle | running | paused | done
  const [elapsed, setElapsed] = useState(0);

  const elapsedRef = useRef(0);
  const lastPhaseKeyRef = useRef(null);

  const pattern = useMemo(() => {
    if (patternId !== 'custom') return getPattern(patternId);
    try {
      return createCustomPattern(custom);
    } catch (_) {
      return null;
    }
  }, [patternId, custom]);

  const locked = status === 'running' || status === 'paused';
  const frame = pattern ? getSessionFrame(pattern, rounds, elapsed) : null;
  const totalSec = pattern ? sessionDuration(pattern, rounds) : 0;

  const record = (completed, durationSec) => {
    onSessionEnd({
      patternId: pattern.id,
      patternName: pattern.id === 'custom' ? `Custom (${pattern.description})` : pattern.name,
      rounds: completed ? rounds : frame.round - 1,
      durationSec,
      completed,
      completedAt: new Date().toISOString()
    });
  };

  // Animation clock. Derives elapsed time from performance.now() rather than
  // counting frames, so timing stays accurate even if frames are dropped.
  useEffect(() => {
    if (status !== 'running' || !pattern) return;
    const base = performance.now() - elapsedRef.current * 1000;
    let raf;

    const tick = now => {
      const t = (now - base) / 1000;
      elapsedRef.current = t;
      const f = getSessionFrame(pattern, rounds, t);

      const key = `${f.round}:${f.phaseIndex}`;
      if (key !== lastPhaseKeyRef.current) {
        lastPhaseKeyRef.current = key;
        if (soundOn && !f.done) playChime(f.phase.type);
      }

      setElapsed(t);
      if (f.done) {
        setStatus('done');
        record(true, totalSec);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, pattern, rounds, soundOn]);

  const reset = () => {
    elapsedRef.current = 0;
    lastPhaseKeyRef.current = null;
    setElapsed(0);
    setStatus('idle');
  };

  const startOrPause = () => {
    if (!pattern) return;
    if (status === 'running') return setStatus('paused');
    if (status === 'done') reset();
    if (soundOn) unlockAudio();
    setStatus('running');
  };

  const stop = () => {
    if (elapsedRef.current >= MIN_SAVE_SEC) record(false, elapsedRef.current);
    reset();
  };

  // Space = start/pause, Escape = stop.
  useEffect(() => {
    const onKey = e => {
      if (e.target instanceof HTMLInputElement) return;
      // A focused button already handles Space natively.
      if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); startOrPause(); }
      if (e.code === 'Escape' && locked) stop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const choosePattern = id => {
    setPatternId(id);
    const p = getPattern(id);
    setRounds(p ? p.defaultRounds : 6);
    reset();
  };

  const color = pattern ? pattern.color : '#999';

  return html`
    <section className="space-y-8 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/15 pb-6">
        <div>
          <span className="text-xs font-mono text-[#13A4A9]">GUIDED PRACTICE</span>
          <h2 className="text-4xl font-light tracking-tight mt-1">
            Follow the <span className="font-serif italic">circle</span>
          </h2>
        </div>
        <button onClick=${onToggleSound} className="px-4 py-2 rounded-full bg-white border border-black/10 font-mono text-xs hover:bg-black/5">
          ${soundOn ? '♪ Chimes on' : '♪ Chimes off'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Guide -->
        <div className="lg:col-span-7 p-6 lg:p-10 rounded-[28px] bg-white border border-black/10 flex flex-col items-center gap-6">
          ${pattern ? html`<${BreathCircle} frame=${frame} color=${color} idle=${status === 'idle'} />` : html`
            <div className="h-[320px] flex items-center justify-center text-sm text-neutral-500 text-center px-6">
              A custom pattern needs at least one inhale and one exhale.
            </div>
          `}

          <div className="grid grid-cols-3 gap-4 w-full max-w-md font-mono text-center">
            <div>
              <div className="text-[11px] text-neutral-500">ROUND</div>
              <div className="text-xl">${frame ? Math.min(frame.round, rounds) : 0} / ${rounds}</div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-500">ELAPSED</div>
              <div className="text-xl">${formatDuration(Math.min(elapsed, totalSec))}</div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-500">REMAINING</div>
              <div className="text-xl">${formatDuration(frame ? frame.remaining : 0)}</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick=${startOrPause}
              disabled=${!pattern}
              className="px-8 py-3.5 rounded-full bg-[#111315] text-white font-mono text-sm hover:bg-[#13A4A9] transition-colors disabled:opacity-40"
            >
              ${status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : status === 'done' ? 'Again' : 'Start'}
            </button>
            ${locked && html`
              <button onClick=${stop} className="px-6 py-3.5 rounded-full bg-white border border-black/15 font-mono text-sm hover:bg-black/5">
                Stop
              </button>
            `}
          </div>
          <p className="text-[11px] font-mono text-neutral-400">Space: start / pause · Esc: stop</p>
          ${status === 'done' && html`
            <p className="text-sm text-[#13A4A9] font-medium">Session complete: ${rounds} rounds, ${formatDuration(totalSec)}. Saved to history.</p>
          `}
        </div>

        <!-- Settings -->
        <div className="lg:col-span-5 space-y-4">
          <fieldset disabled=${locked} className="space-y-3 disabled:opacity-50">
            <legend className="text-xs font-mono text-neutral-500 mb-2">PATTERN</legend>
            ${[...PATTERNS, { id: 'custom', name: 'Custom', tagline: 'Set your own timing', color: '#E39D44' }].map(p => html`
              <button
                key=${p.id}
                onClick=${() => choosePattern(p.id)}
                className=${`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  patternId === p.id ? 'bg-white border-[#111315] shadow-sm' : 'bg-white/60 border-black/10 hover:border-black/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style=${{ backgroundColor: p.color }}></span>
                  <div>
                    <div className="text-sm font-medium">${p.name}</div>
                    <div className="text-xs text-neutral-500">${p.tagline}</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  ${p.phases ? p.phases.map(ph => ph.seconds).join('-') : '…'}
                </span>
              </button>
            `)}
          </fieldset>

          ${patternId === 'custom' && html`
            <fieldset disabled=${locked} className="p-5 rounded-2xl bg-white border border-black/10 space-y-3 disabled:opacity-50">
              ${[['inhale', 'Inhale'], ['holdIn', 'Hold (full)'], ['exhale', 'Exhale'], ['holdOut', 'Hold (empty)']].map(([key, label]) => html`
                <label key=${key} className="flex items-center gap-3 text-xs font-mono">
                  <span className="w-28">${label}</span>
                  <input
                    type="range" min=${CUSTOM_LIMITS.min} max=${CUSTOM_LIMITS.max} step="1" value=${custom[key]}
                    onChange=${e => { setCustom(c => ({ ...c, [key]: Number(e.target.value) })); reset(); }}
                    className="flex-1 accent-[#E39D44]"
                  />
                  <span className="w-8 text-right">${custom[key]}s</span>
                </label>
              `)}
            </fieldset>
          `}

          <fieldset disabled=${locked} className="p-5 rounded-2xl bg-white border border-black/10 space-y-3 disabled:opacity-50">
            <label className="flex items-center gap-3 text-xs font-mono">
              <span className="w-28">Rounds</span>
              <input
                type="range" min="1" max="30" value=${rounds}
                onChange=${e => { setRounds(Number(e.target.value)); reset(); }}
                className="flex-1 accent-[#111315]"
              />
              <span className="w-8 text-right">${rounds}</span>
            </label>
            ${pattern && html`
              <div className="text-xs text-neutral-500 leading-relaxed">
                <div>${pattern.description}</div>
                <div className="font-mono mt-2">
                  ${pattern.phases.map(ph => `${phaseLabel(ph)} ${ph.seconds}s`).join(' → ')}
                  · ${cycleSeconds(pattern)}s per round · ${formatDuration(totalSec)} total
                </div>
              </div>
            `}
          </fieldset>
        </div>
      </div>
    </section>
  `;
}
