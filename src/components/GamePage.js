import { html, useState, useEffect, useRef } from '../lib/react.js';
import { GAME_CONFIG as CFG, createGameState, stepGame, guideY, guidePhase, accuracy } from '../core/pacerGame.js';
import { LocalStore } from '../data/localStore.js';

const PLAYER_X = 160;
const PX_PER_SEC = 60;
const HUD_INTERVAL_MS = 120;
const TRAIL_SEC = PLAYER_X / PX_PER_SEC;

function draw(ctx, state, trail, holding) {
  const { width: W, height: H, bandHalfWidth } = CFG;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#FBFAF7';
  ctx.fillRect(0, 0, W, H);

  // Guide band over the visible time window.
  const tAt = x => state.t + (x - PLAYER_X) / PX_PER_SEC;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 4) ctx.lineTo(x, guideY(tAt(x)) - bandHalfWidth);
  for (let x = W; x >= 0; x -= 4) ctx.lineTo(x, guideY(tAt(x)) + bandHalfWidth);
  ctx.closePath();
  ctx.fillStyle = 'rgba(19, 164, 169, 0.16)';
  ctx.fill();

  ctx.beginPath();
  for (let x = 0; x <= W; x += 4) ctx.lineTo(x, guideY(tAt(x)));
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(19, 164, 169, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  // Past path of the player.
  ctx.beginPath();
  trail.forEach(p => ctx.lineTo(PLAYER_X - (state.t - p.t) * PX_PER_SEC, p.y));
  ctx.strokeStyle = 'rgba(17, 19, 21, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // "Now" marker and player.
  ctx.fillStyle = 'rgba(17, 19, 21, 0.06)';
  ctx.fillRect(PLAYER_X - 1, 0, 2, H);
  const inside = Math.abs(state.y - guideY(state.t)) <= bandHalfWidth;
  ctx.beginPath();
  ctx.arc(PLAYER_X, state.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = inside ? '#13A4A9' : '#F0A7AB';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = holding ? '#111315' : '#FFFFFF';
  ctx.stroke();

  ctx.fillStyle = '#111315';
  ctx.font = '500 13px Inter, sans-serif';
  ctx.fillText(guidePhase(state.t) === 'inhale' ? '↑ Inhale' : '↓ Exhale', PLAYER_X + 24, 28);
}

export function GamePage() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createGameState());
  const holdingRef = useRef(false);
  const trailRef = useRef([]);
  const [hud, setHud] = useState({ timeLeft: CFG.roundSec, accuracy: 0, running: false, finished: false });
  const [holding, setHolding] = useState(false);
  const [best, setBest] = useState(() => LocalStore.loadGameBest());
  const [result, setResult] = useState(null);

  const setHold = value => {
    holdingRef.current = value;
    setHolding(value);
  };

  // Render/update loop for as long as the page is mounted.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CFG.width * dpr;
    canvas.height = CFG.height * dpr;
    ctx.scale(dpr, dpr);

    let raf;
    let last = performance.now();
    let lastHud = 0;

    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp after tab switches
      last = now;
      const prev = stateRef.current;
      const next = stepGame(prev, dt, holdingRef.current);
      stateRef.current = next;

      if (next.running) {
        trailRef.current.push({ t: next.t, y: next.y });
        while (next.t - trailRef.current[0].t > TRAIL_SEC) trailRef.current.shift();
      }
      draw(ctx, next, trailRef.current, holdingRef.current);

      if (next.finished && !prev.finished) {
        const score = Math.round(accuracy(next) * 100);
        const previousBest = LocalStore.loadGameBest();
        setResult({ score, previousBest, isBest: score > previousBest });
        if (score > previousBest) {
          LocalStore.saveGameBest(score);
          setBest(score);
        }
      }
      if (now - lastHud > HUD_INTERVAL_MS || next.finished !== prev.finished) {
        lastHud = now;
        setHud({
          timeLeft: Math.ceil(CFG.roundSec - next.t),
          accuracy: Math.round(accuracy(next) * 100),
          running: next.running,
          finished: next.finished
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Hold Space to inhale.
  useEffect(() => {
    const down = e => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      setHold(true);
    };
    const up = e => {
      if (e.code === 'Space') setHold(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', up);
    };
  }, []);

  const start = () => {
    trailRef.current = [];
    setResult(null);
    stateRef.current = { ...createGameState(), running: true };
  };

  const pause = () => {
    stateRef.current = { ...stateRef.current, running: !stateRef.current.running };
  };

  return html`
    <section className="space-y-6 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/15 pb-6">
        <div>
          <span className="text-xs font-mono text-[#0B7377]">BREATH PACER GAME</span>
          <h2 className="text-4xl font-light tracking-tight mt-1">
            Stay inside the <span className="font-serif italic">wave</span>
          </h2>
          <p className="text-sm text-neutral-500 mt-2 max-w-xl">
            The band rises and falls at 6 breaths per minute. Hold while you inhale and release while you exhale, keeping your dot inside the band for ${CFG.roundSec} seconds.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-full bg-white border border-black/10">TIME ${hud.timeLeft}s</span>
          <span className="px-3 py-1.5 rounded-full bg-[#13A4A9]/15 text-[#0B7377] font-semibold">ACCURACY ${hud.accuracy}%</span>
          <span className="px-3 py-1.5 rounded-full bg-[#F0C754]/25">BEST ${best}%</span>
        </div>
      </div>

      <div className="rounded-[28px] border border-black/15 bg-white p-4 space-y-4">
        <canvas
          ref=${canvasRef}
          className="w-full rounded-2xl border border-black/10 touch-none"
          style=${{ aspectRatio: `${CFG.width} / ${CFG.height}` }}
          onPointerDown=${() => setHold(true)}
          onPointerUp=${() => setHold(false)}
          onPointerLeave=${() => setHold(false)}
          onPointerCancel=${() => setHold(false)}
        ></canvas>

        <div className="flex flex-wrap items-center justify-between gap-4 px-2">
          <div className="flex gap-2">
            <button onClick=${start} className="px-6 py-3 rounded-full bg-[#111315] text-white font-mono text-xs hover:bg-[#0F8387] transition-colors">
              ${hud.finished ? 'Play again' : hud.running || hud.timeLeft < CFG.roundSec ? 'Restart' : 'Start'}
            </button>
            ${(hud.running || (!hud.finished && hud.timeLeft < CFG.roundSec)) && html`
              <button onClick=${pause} className="px-5 py-3 rounded-full bg-white border border-black/15 font-mono text-xs hover:bg-black/5">
                ${hud.running ? 'Pause' : 'Resume'}
              </button>
            `}
          </div>
          <button
            onPointerDown=${() => setHold(true)}
            onPointerUp=${() => setHold(false)}
            onPointerLeave=${() => setHold(false)}
            onPointerCancel=${() => setHold(false)}
            className=${`px-8 py-3.5 rounded-full font-mono text-xs font-semibold transition-all touch-none select-none ${
              holding ? 'bg-[#0F8387] text-white scale-95' : 'bg-[#D9F99D] text-black'
            }`}
          >
            ${holding ? '▲ Inhaling…' : 'Hold to inhale (or hold Space)'}
          </button>
        </div>

        ${result && html`
          <div className="mx-2 p-4 rounded-2xl bg-[#F6F5F0] text-sm">
            Round complete: <strong>${result.score}%</strong> of the time inside the band.
            ${result.isBest ? ' New personal best!' : ` Personal best: ${result.previousBest}%.`}
          </div>
        `}
      </div>
    </section>
  `;
}
