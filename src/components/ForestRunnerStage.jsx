import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createForestStage, FOREST_BACKGROUND_URL } from '../animation/forestEngine.js';
import { getSessionRepository } from '../services/apiClient.js';
import { playChime, playCoin, unlockAudio } from '../lib/audio.js';
import { getLevel, LEVEL_COUNT } from '../core/forestLevels.ts';
import { solidStyle } from '../data/simStore.js';
import { startMicBreath, describeMicError } from '../lib/micBreath.js';

const COIN_ICON_URL = `${import.meta.env.BASE_URL}assets/forest/coin.png`;
// 3-2-1 before every run, at a calm breathing pace: time to settle and breathe out first.
const COUNT_FROM = 3;
const COUNT_STEP_MS = 1500;
// Breath sync over the first moments of a run is mostly noise, so it shows "—" until then.
const SYNC_SETTLE_SEC = 2;
// The start card's breathing steps: icon, action, breath.
const START_STEPS = [
  ['↑', 'Jump', 'inhale when the arrow tilts up'],
  ['〰', 'Glide', 'keep inhaling'],
  ['↓', 'Land', 'exhale']
];
const GLASS =
  'bg-game-navy/60 backdrop-blur-md border border-white/20 text-white shadow-[0_12px_32px_rgba(4,33,75,0.28)]';

function Stat({ label, value, tone, hint }) {
  return (
    <div className="min-w-[52px] sm:min-w-[64px]">
      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/60 font-mono">{label}</div>
      <div className={`text-base sm:text-lg font-bold font-mono leading-tight ${tone}`}>{value}</div>
      {hint && <div className="hidden sm:block text-[10px] text-white/55 leading-tight">{hint}</div>}
    </div>
  );
}

/**
 * Page 04: full-bleed Forest Runner stage. The .ai illustration is the map; HUD panels float on it.
 */
export function ForestRunnerStage({
  map,
  maps,
  bleConnected,
  bleScanning,
  deviceName,
  onToggleDevice,
  onSelectMap,
  notify
}) {
  const stageRef = useRef(null);
  const bgRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const soundRef = useRef(true);
  const [hud, setHud] = useState(null);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [holding, setHoldingState] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sound, setSound] = useState(true);
  const [lapResult, setLapResult] = useState(null);
  const [fallHint, setFallHint] = useState(false);
  const [countdown, setCountdown] = useState(null); // 3, 2, 1, 'go', or null
  const countdownTimer = useRef(null);
  const fallHintTimer = useRef(null);
  const [micStatus, setMicStatus] = useState('off'); // off | asking | calibrating | on
  const manualHoldRef = useRef(false);
  const micHoldRef = useRef(false);
  const micStopRef = useRef(null);
  const unmountedRef = useRef(false);
  const micMeterRef = useRef(null);
  const micChangeRef = useRef(() => {});
  const keyHandlersRef = useRef(null);
  const startButtonRef = useRef(null);
  const nextLapButtonRef = useRef(null);
  const [prevBestSync, setPrevBestSync] = useState(null); // best sync % from prior laps this session
  // Keep the higher of the session best and a new sync %.
  const recordBestSync = sync => setPrevBestSync(best => (best === null || sync > best ? sync : best));
  // Latest HUD from the engine, with placeholders before the first frame.
  const h = hud || {
    coins: 0,
    totalCoins: 30,
    lapCoins: 0,
    combo: 0,
    lap: 1,
    sync: 100,
    lung: 1,
    cue: 'exhale',
    progress: 0,
    falls: 0
  };

  useEffect(() => {
    const engine = createForestStage({
      stage: stageRef.current,
      background: bgRef.current,
      canvas: canvasRef.current,
      onHud: setHud,
      onEvent: e => {
        if (soundRef.current) {
          if (e.type === 'coin') playCoin();
          if (e.type === 'jump') playChime('inhale');
          if (e.type === 'lap') playChime('hold');
        }
        if (e.type === 'fall') {
          setFallHint(true);
          clearTimeout(fallHintTimer.current);
          fallHintTimer.current = setTimeout(() => setFallHint(false), 2600);
        }
        if (e.type === 'hidden') {
          engine.setRunning(false);
          engine.setHolding(false);
          setHoldingState(false);
          setPaused(true);
        }
        if (e.type === 'lap') {
          setLapResult(e);
          engine.setRunning(false);
          engine.setHolding(false);
          setHoldingState(false);
          setPaused(true);
        }
      }
    });
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  const stopCountdown = () => {
    clearTimeout(countdownTimer.current);
    countdownTimer.current = null;
    setCountdown(null);
  };

  // Switching level: new coin layout, back to the start card.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setRunning(false);
    engine.setHolding(false);
    engine.setMap(map.id);
    stopCountdown();
    setStarted(false);
    setPaused(false);
    setLapResult(null);
    setHoldingState(false);
  }, [map.id]);
  useEffect(() => {
    engineRef.current?.setSpeed(speed);
  }, [speed]);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  // Inhale = pointer/Space hold OR an audible breath on the mic.
  const applyHolding = () => {
    const value = manualHoldRef.current || micHoldRef.current;
    engineRef.current?.setHolding(value);
    setHoldingState(value);
  };
  const setHolding = value => {
    manualHoldRef.current = value;
    applyHolding();
  };

  // Count 3-2-1 at a breathing pace, then run. Used for the first start, every lap and resume.
  const begin = () => {
    if (countdownTimer.current) return;
    // Record best sync before discarding the current lap result.
    if (lapResult !== null && h !== null) recordBestSync(h.sync ?? 0);
    unlockAudio();
    setStarted(true);
    setPaused(false);
    setLapResult(null);
    engineRef.current?.setRunning(false);
    const tick = n => {
      if (document.hidden) {
        // Left the tab mid-count: wait on the pause button instead of starting unseen.
        stopCountdown();
        setPaused(true);
        return;
      }
      if (n > 0) {
        setCountdown(n);
        if (soundRef.current) playChime('exhale');
        countdownTimer.current = setTimeout(() => tick(n - 1), COUNT_STEP_MS);
        return;
      }
      setCountdown('go');
      if (soundRef.current) playChime('inhale');
      engineRef.current?.setRunning(true);
      countdownTimer.current = setTimeout(() => {
        countdownTimer.current = null;
        setCountdown(null);
      }, 700);
    };
    tick(COUNT_FROM);
  };
  const counting = countdown !== null && countdown !== 'go';

  const togglePause = () => {
    setHolding(false);
    if (paused) begin();
    else {
      setPaused(true);
      engineRef.current?.setRunning(false);
    }
  };

  const pressStart = () => {
    if (!started || lapResult) begin();
    else if (paused) togglePause();
    setHolding(true);
  };

  // Re-bound after every commit so the mic loop always sees current state. A layout effect (not a render-time
  // write) runs before any later event or animation frame, and never exposes handlers from an uncommitted render.
  useLayoutEffect(() => {
    micChangeRef.current = active => {
      micHoldRef.current = active;
      if (active && !started) begin();
      applyHolding();
    };
  });

  const toggleMic = async () => {
    if (micStatus === 'asking') return;
    if (micStopRef.current) {
      micStopRef.current();
      micStopRef.current = null;
      micChangeRef.current(false);
      if (micMeterRef.current) micMeterRef.current.style.transform = 'scaleX(0)';
      setMicStatus('off');
      return;
    }
    setMicStatus('asking');
    try {
      let status = '';
      const stop = await startMicBreath(u => {
        if (unmountedRef.current) return;
        const next = u.calibrating ? 'calibrating' : 'on';
        if (next !== status) {
          setMicStatus((status = next));
          if (next === 'on')
            notify('Mic ready: breathe in audibly close to the mic to jump. The bar shows what it hears.');
        }
        if (micMeterRef.current) micMeterRef.current.style.transform = `scaleX(${u.level})`;
        if (u.active !== micHoldRef.current) micChangeRef.current(u.active);
      });
      // Left the page while the permission prompt was open: release the mic right away.
      if (unmountedRef.current) return stop();
      micStopRef.current = stop;
    } catch (err) {
      if (unmountedRef.current) return;
      setMicStatus('off');
      notify(describeMicError(err));
    }
  };
  useEffect(
    () => () => {
      unmountedRef.current = true;
      micStopRef.current?.();
      clearTimeout(fallHintTimer.current);
      clearTimeout(countdownTimer.current);
    },
    []
  );
  const micLabel = { off: 'Mic', asking: 'Allow mic…', calibrating: 'Stay quiet…', on: 'Mic on' }[micStatus];

  // Hold Space (or ↑) to inhale. Bound once; the listeners read the latest handlers through a ref, refreshed
  // after every commit. Layout effects run before passive ones, so the ref is set before the listeners attach.
  useLayoutEffect(() => {
    keyHandlersRef.current = { pressStart, setHolding };
  });
  useEffect(() => {
    const isBreathKey = e => e.code === 'Space' || e.code === 'ArrowUp';
    const down = e => {
      if (!isBreathKey(e) || e.repeat) return;
      // Space/↑ on a focused control should operate that control, not the game
      // (except the hold-to-inhale button, which is itself the breath input).
      if (
        e.target instanceof HTMLElement &&
        e.target.closest(
          'input, textarea, select, a, button:not([data-breath-input]), [role="button"], [role="checkbox"]'
        )
      )
        return;
      e.preventDefault();
      keyHandlersRef.current.pressStart();
    };
    const up = e => {
      if (isBreathKey(e)) keyHandlersRef.current.setHolding(false);
    };
    const blur = () => keyHandlersRef.current.setHolding(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // Move focus to the primary action when the start or lap card opens.
  useEffect(() => {
    if (!started) startButtonRef.current?.focus({ preventScroll: true });
  }, [started]);
  useEffect(() => {
    if (lapResult) nextLapButtonRef.current?.focus({ preventScroll: true });
  }, [lapResult]);

  const saveRun = async () => {
    const snap = engineRef.current?.snapshot();
    if (!snap || snap.elapsed < 1) {
      notify('Run for a few seconds first, then save.');
      return;
    }
    // Keep session best in sync so "personal best" still works after saving.
    recordBestSync(snap.sync ?? 0);
    try {
      const repo = await getSessionRepository();
      await repo.add({
        patternId: map.id,
        patternName: `${map.name} · Breath Runner`,
        rounds: Math.max(0, snap.lap - 1),
        durationSec: Math.max(1, Math.round(snap.elapsed)),
        completed: snap.lap > 1,
        coins: snap.coins,
        totalCoins: snap.totalCoins,
        syncPct: snap.sync,
        falls: snap.falls
      });
      notify(`Saved ${map.name}: ${snap.coins} coins, ${snap.sync}% breath sync`);
    } catch (err) {
      notify(`Could not save session: ${err.message}`);
    }
  };

  const stopHold = () => setHolding(false);
  const keepPointer = e => e.stopPropagation();
  const inhaleCue = h.cue === 'inhale';
  const level = getLevel(map.id);

  const showFallHint = fallHint && started && !lapResult;
  const syncText = h.elapsed >= SYNC_SETTLE_SEC ? `${h.sync}%` : '—';

  return (
    <section className="animate-page space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-teal-ink">Breath Runner</p>
          <h2 className="text-[26px] md:text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
            {map.name}
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
          {maps.map((m, i) => (
            <button
              type="button"
              key={m.id}
              onClick={() => onSelectMap(m)}
              aria-pressed={m.id === map.id}
              className={`shrink-0 text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                m.id === map.id
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              style={m.id === map.id ? solidStyle(m.color) : undefined}
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                {m.name}
                <span className={`font-mono ${m.id === map.id ? '' : 'text-slate-500'}`}>{m.kpa} kPa</span>
                <span className="flex items-center gap-0.5 ml-0.5" aria-hidden="true">
                  {maps.map((_, j) => (
                    <span
                      key={j}
                      className={`w-1.5 h-1.5 rounded-full bg-current ${j <= i ? 'opacity-80' : 'opacity-20'}`}
                    />
                  ))}
                </span>
              </span>
              {m.tag && (
                <span className={`block text-[10px] font-mono mt-0.5 ${m.id === map.id ? '' : 'text-slate-500'}`}>
                  {m.tag}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Holding to inhale is a long press: keep mobile browsers from selecting text or opening a menu. */}
      <div className="relative select-none no-touch-callout" onContextMenu={e => e.preventDefault()}>
        <div
          ref={stageRef}
          className="relative w-full h-[min(62vh,780px)] md:h-[min(70vh,760px)] min-h-[420px] rounded-[32px] overflow-hidden bg-game-mist select-none touch-none cursor-pointer shadow-[0_24px_60px_rgba(4,33,75,0.18)]"
          onPointerDown={pressStart}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
        >
          <img
            ref={bgRef}
            src={FOREST_BACKGROUND_URL}
            alt={`${map.name} illustration: misty mountains, pine forest and stone cliffs`}
            draggable="false"
            className="absolute top-0 left-0 max-w-none origin-top-left will-change-transform pointer-events-none transition-[filter] duration-700"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          ></canvas>

          {/* Top HUD */}
          <div className="absolute top-3 left-3 right-3 md:top-5 md:left-5 md:right-5 flex flex-wrap items-start justify-between gap-3 pointer-events-none">
            <div className={`${GLASS} rounded-2xl px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-3 md:gap-5`}>
              <div className="flex items-center gap-2 sm:gap-2.5">
                <img src={COIN_ICON_URL} alt="" className="w-6 h-6 sm:w-9 sm:h-9" />
                <Stat label="Coins" value={h.coins} tone="text-game-coin" />
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <Stat label="Breath sync" value={syncText} tone="text-game-mint" hint="breath matches arrow" />
              <div className="w-px h-8 bg-white/20 hidden sm:block"></div>
              <div className="hidden sm:block">
                <Stat label="Combo" value={`x${h.combo}`} tone="text-game-sky" />
              </div>
              <div className="w-px h-8 bg-white/20 hidden md:block"></div>
              <div className="hidden md:block">
                <Stat label="Lap" value={h.lap} tone="text-white" />
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onPointerDown={keepPointer}
                onClick={onToggleDevice}
                className={`${GLASS} pointer-events-auto rounded-full pl-3 pr-4 py-1.5 sm:py-2 flex items-center gap-2 text-[11px] sm:text-xs font-semibold hover:bg-game-navy/75 transition-colors ${
                  bleConnected ? '' : 'ring-2 ring-brand-yellow/70'
                }`}
              >
                <span className="relative flex w-2.5 h-2.5" aria-hidden="true">
                  {!bleConnected && (
                    <span className="absolute inset-0 rounded-full bg-brand-yellow animate-ping opacity-75"></span>
                  )}
                  <span
                    className={`relative w-2.5 h-2.5 rounded-full ${bleConnected ? 'bg-game-go' : 'bg-brand-yellow'}`}
                  ></span>
                </span>
                <span className={bleConnected ? 'text-game-mint' : 'text-game-coin-soft'}>
                  {bleScanning ? 'Pairing trainer…' : bleConnected ? `${deviceName} linked` : 'No trainer'}
                  {!bleScanning && !bleConnected && (
                    <span className="hidden sm:inline"> connected — free trial of {map.name}</span>
                  )}
                </span>
                <span className="hidden md:inline text-white/50 font-mono">{bleConnected ? 'disconnect' : 'pair'}</span>
              </button>
              <div className={`${GLASS} rounded-full px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono`}>
                <span className="hidden sm:inline text-white/60">ROUTE</span>
                <div className="w-16 sm:w-28 md:w-40 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-game-mint via-game-sky to-game-coin"
                    style={{ width: `${Math.round(h.progress * 100)}%` }}
                  ></div>
                </div>
                <span>
                  {h.lapCoins}/{h.totalCoins}
                </span>
              </div>
            </div>
          </div>

          {/* After a fall: what to do differently (announced through the live region below) */}
          <div
            aria-hidden="true"
            className={`absolute left-1/2 top-[48%] sm:top-[38%] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-500 ${
              showFallHint ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className={`${GLASS} rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 text-center w-[min(20rem,80vw)]`}>
              <div className="text-sm font-bold text-game-coin">Almost! Back to the start of this cliff</div>
              <div className="text-xs text-white/85 mt-1">
                When the arrow tilts up, take one long, steady inhale and keep it going over the gap.
              </div>
            </div>
          </div>
          <div className="sr-only" aria-live="polite">
            {showFallHint &&
              'Almost! Back to the start of this cliff. When the arrow tilts up, take one long, steady inhale and keep it going over the gap.'}
          </div>

          {/* 3-2-1 count-in */}
          {countdown !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div
                key={countdown}
                className="motion-safe:animate-[countdown-pop_1.5s_ease-out] text-7xl sm:text-8xl font-bold font-mono text-white drop-shadow-[0_6px_24px_rgba(4,33,75,0.55)]"
              >
                {countdown === 'go' ? 'Go!' : countdown}
              </div>
              {counting && (
                <div className={`${GLASS} mt-4 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold`}>
                  Breathe out fully, then get ready
                </div>
              )}
            </div>
          )}
          <div className="sr-only" aria-live="assertive">
            {countdown === 'go' ? 'Go' : countdown}
          </div>

          {/* Start overlay */}
          {!started && (
            <div className="absolute inset-0 flex items-center justify-center p-4 bg-game-navy/25 backdrop-blur-[2px]">
              <div
                className={`${GLASS} rounded-3xl max-w-md w-full max-h-full flex flex-col p-4 sm:p-5 md:p-7 text-center pointer-events-auto`}
                onPointerDown={keepPointer}
              >
                <div className="min-h-0 overflow-y-auto">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
                    <span className="text-white/75">
                      Level {level.number} of {LEVEL_COUNT}
                    </span>
                    <span className="flex gap-1" role="img" aria-label={`Difficulty ${level.number} of ${LEVEL_COUNT}`}>
                      {Array.from({ length: LEVEL_COUNT }, (_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full ${i < level.number ? 'bg-game-coin' : 'bg-white/25'}`}
                        />
                      ))}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-brand-yellow/20 text-game-coin-soft tabular-nums">
                      {map.valveKpa} kPa · {map.targetL} L · pace {level.speed}×
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mt-2 sm:mt-3">{map.name}</h3>
                  <div className="mt-1 text-sm font-semibold text-game-mint">Skill: {level.skill}</div>
                  <p className="hidden sm:block text-sm text-white/80 mt-1.5">{level.focus}</p>

                  {/* How to breathe, as three steps instead of a paragraph */}
                  <ol className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
                    {START_STEPS.map(([icon, what, how]) => (
                      <li key={what} className="rounded-xl bg-white/10 px-1.5 py-2.5">
                        <div aria-hidden="true" className="text-lg leading-none text-game-coin">
                          {icon}
                        </div>
                        <div className="mt-1.5 text-[13px] font-semibold leading-tight">{what}</div>
                        <div className="text-[11px] leading-tight text-white/70 mt-0.5">{how}</div>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-white/70 mt-2.5">
                    <strong className="text-game-mint">Breath sync</strong>: how much of the run your breath follows the
                    arrow.
                  </p>

                  <p className="mt-3 flex justify-center gap-x-4 gap-y-1 flex-wrap text-[11px] text-white/70">
                    {[
                      [level.breathsPerLap, 'breaths a lap'],
                      [`${level.avgBreathSec}s`, 'avg inhale'],
                      [`${level.config.refillSec}s`, 'refill'],
                      [level.map.coins.length, 'coins']
                    ].map(([v, k]) => (
                      <span key={k} className="flex items-baseline gap-1">
                        <strong className="font-mono text-game-coin">{v}</strong>
                        {k}
                      </span>
                    ))}
                  </p>

                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/75">
                    <span>Hold the screen or Space, or</span>
                    <button
                      type="button"
                      onClick={toggleMic}
                      aria-pressed={micStatus !== 'off'}
                      title="Breathe audibly near the microphone to inhale"
                      className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${micStatus === 'off' ? 'bg-white/10 hover:bg-white/20' : 'bg-game-sky/30 text-white'}`}
                    >
                      {micStatus === 'off' ? 'use the mic' : micLabel}
                    </button>
                  </div>
                </div>
                <button
                  ref={startButtonRef}
                  type="button"
                  onClick={begin}
                  className="mt-4 sm:mt-5 shrink-0 w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-teal to-game-sky text-game-navy font-bold text-sm hover:brightness-110 transition"
                >
                  ▶ Start running
                </button>
              </div>
            </div>
          )}

          {/* Lap result */}
          {lapResult &&
            (() => {
              const currentSync = h?.sync ?? 0;
              const isNewBest = prevBestSync !== null && currentSync > prevBestSync;
              return (
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-game-navy/30 backdrop-blur-[2px]">
                  <div
                    className={`${GLASS} rounded-3xl max-w-sm w-full p-4 sm:p-6 text-center pointer-events-auto`}
                    onPointerDown={keepPointer}
                  >
                    <div className="text-[11px] font-mono text-game-mint tracking-widest">
                      LAP {lapResult.lap} COMPLETE
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      <div className="rounded-2xl bg-white/10 px-3 py-3">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-game-coin/70 mb-1.5">
                          Coins
                        </div>
                        <div className="text-[26px] sm:text-[32px] font-bold text-game-coin leading-none tabular-nums">
                          {lapResult.coins}
                        </div>
                        <div className="text-[13px] text-white/45 mt-1">of {lapResult.total}</div>
                      </div>

                      <div
                        className={`rounded-2xl px-3 py-3 transition-colors ${
                          isNewBest ? 'bg-game-mint/20 ring-1 ring-game-mint/40' : 'bg-white/10'
                        }`}
                      >
                        <div className="text-[10px] font-mono uppercase tracking-wider text-game-mint/70 mb-1.5">
                          Breath sync
                        </div>
                        <div className="text-[26px] sm:text-[32px] font-bold text-game-mint leading-none tabular-nums">
                          {currentSync}%
                        </div>
                        <div className="text-[11px] mt-1 font-semibold">
                          {isNewBest ? (
                            <span className="text-game-mint">Personal best</span>
                          ) : (
                            <span className="text-white/30">{lapResult.sec.toFixed(1)} s</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 text-[12px] text-white/45 tabular-nums">
                      {isNewBest && <span>{lapResult.sec.toFixed(1)} s · </span>}
                      {h.falls} slip{h.falls !== 1 ? 's' : ''}
                    </div>
                    <div className="mt-1 text-[11px] text-white/55">
                      Breath sync: time your breath matched the arrow
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={saveRun}
                        className="flex-1 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors"
                      >
                        Save to history
                      </button>
                      <button
                        ref={nextLapButtonRef}
                        type="button"
                        onClick={begin}
                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-game-ember to-game-ember-amber text-xs font-bold"
                      >
                        Next lap →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>

        {/* Bottom breath dock */}
        <div className="mt-3">
          <div className="bg-game-navy-panel text-white shadow-[0_12px_32px_rgba(4,33,75,0.22)] rounded-3xl px-4 py-3 flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-5">
            <div className="flex items-center gap-3 min-w-[150px]">
              <div
                aria-hidden="true"
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold transition-colors ${
                  inhaleCue ? 'bg-game-coin text-game-navy' : 'bg-white/15 text-white'
                }`}
              >
                {inhaleCue ? '↑' : '↓'}
              </div>
              <div>
                <div aria-live="polite" className={`text-sm font-bold ${inhaleCue ? 'text-game-coin' : 'text-white'}`}>
                  {counting ? 'Get ready — breathe out' : inhaleCue ? 'Inhale — jump & glide' : 'Exhale — relax & run'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-white/60">LUNG</span>
                  <div className="w-24 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-game-sky transition-[width] duration-100"
                      style={{ width: `${Math.round(h.lung * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <button
              data-breath-input
              type="button"
              onPointerDown={e => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                pressStart();
              }}
              onPointerUp={stopHold}
              onPointerCancel={stopHold}
              className={`pointer-events-auto flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all touch-none ${
                holding
                  ? 'bg-game-sky text-game-navy scale-[0.98]'
                  : 'bg-gradient-to-r from-game-ember to-game-ember-amber text-white'
              }`}
            >
              {holding ? '▲ Inhaling…' : counting ? 'Get ready…' : started ? 'Hold to inhale' : 'Tap to start'}
            </button>

            <div className="flex items-center gap-2 pointer-events-auto" onPointerDown={keepPointer}>
              <button
                type="button"
                onClick={togglePause}
                disabled={!started || !!lapResult || counting}
                aria-label={paused ? 'Resume' : 'Pause'}
                title={paused ? 'Resume' : 'Pause'}
                className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-40 text-sm"
              >
                <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
              </button>
              <button
                type="button"
                onClick={toggleMic}
                aria-pressed={micStatus !== 'off'}
                title="Breathe audibly near the microphone to inhale"
                className={`relative h-10 px-3 rounded-xl text-xs font-bold overflow-hidden ${micStatus === 'off' ? 'bg-white/15 hover:bg-white/25' : 'bg-game-sky/25 ring-1 ring-game-sky/70'}`}
              >
                <span
                  ref={micMeterRef}
                  className="absolute inset-y-0 left-0 w-full bg-game-sky/35 origin-left"
                  style={{ transform: 'scaleX(0)' }}
                  aria-hidden="true"
                ></span>
                <span className="relative">🎙 {micLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => setSound(!sound)}
                aria-label="Sound"
                aria-pressed={sound}
                title="Sound"
                className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 text-sm"
              >
                <span aria-hidden="true">{sound ? '♪' : '✕'}</span>
              </button>
              <label className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-white/70">
                SPEED
                <input
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.1"
                  value={speed}
                  onChange={e => setSpeed(parseFloat(e.target.value))}
                  className="w-20 accent-game-sky"
                />
                <span className="w-8">{speed.toFixed(1)}x</span>
              </label>
              <button
                type="button"
                onClick={saveRun}
                className="px-3.5 h-10 rounded-xl bg-brand-teal-deep hover:bg-brand-teal-hover text-xs font-bold whitespace-nowrap"
              >
                Save run
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
