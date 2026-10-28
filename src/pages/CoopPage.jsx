import { useState, useEffect, useRef } from 'react';
import { useApp } from '../app/AppContext.jsx';
import { useCoopRoom } from '../app/useCoopRoom.js';
import { btn, Card } from '../components/ui.jsx';

/** Animated lung-capacity bar used for both players. */
function LungMeter({ lungPct, holding, label, tone = 'teal' }) {
  const fill = tone === 'teal' ? 'bg-brand-teal-deep' : 'bg-brand-purple-deep';
  const cueColor = holding ? 'text-brand-teal-ink' : 'text-slate-500';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-700">{label}</span>
        <span className={`text-xs font-mono font-semibold ${cueColor} transition-colors`}>
          {holding ? 'Inhaling ↑' : 'Exhaling ↓'}
        </span>
      </div>
      <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${fill} transition-all duration-100`}
          style={{ width: `${Math.round(lungPct * 100)}%` }}
          role="meter"
          aria-valuenow={Math.round(lungPct * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} lung capacity ${Math.round(lungPct * 100)}%`}
        />
      </div>
      <p className="text-right text-[11px] text-slate-500 tabular-nums">{Math.round(lungPct * 100)}%</p>
    </div>
  );
}

/** Idle lobby: join an existing room or create a new one. */
function Lobby({ onConnect, errorMsg, status }) {
  const [name, setName] = useState('');
  const [roomInput, setRoomInput] = useState('');

  return (
    <Card className="max-w-md mx-auto space-y-5">
      <div>
        <h2 className="text-[17px] font-semibold text-slate-900">Join a co-op session</h2>
        <p className="text-[13px] text-slate-600 mt-0.5">
          Breathe in sync with a training partner in real time.
          <br />
          <span className="text-brand-teal-ink font-medium">Requires the local server</span> — run{' '}
          <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">npm start</code> in the project
          directory.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[13px] font-medium text-slate-700" htmlFor="coop-name">
            Your name
          </label>
          <input
            id="coop-name"
            type="text"
            maxLength={32}
            placeholder="Luna"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[13px] font-medium text-slate-700" htmlFor="coop-room">
            Room code <span className="font-normal text-slate-500">(leave blank to create a new room)</span>
          </label>
          <input
            id="coop-room"
            type="text"
            maxLength={8}
            placeholder="e.g. 4821"
            value={roomInput}
            onChange={e => setRoomInput(e.target.value.replace(/\D/g, ''))}
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
          />
        </div>
      </div>

      {errorMsg && (
        <p role="alert" className="text-[13px] text-brand-pink-ink">
          {errorMsg}
        </p>
      )}

      <button
        type="button"
        className={btn.primary}
        disabled={status === 'connecting' || status === 'unavailable'}
        onClick={() => onConnect(roomInput || null, name || 'Player')}
      >
        {status === 'connecting' ? 'Connecting…' : roomInput ? 'Join room' : 'Create room'}
      </button>
    </Card>
  );
}

/** Copy-to-clipboard helper */
function RoomCode({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-3xl font-bold font-mono tracking-widest text-slate-900">{code}</span>
      <button
        type="button"
        onClick={copy}
        className="text-[12px] font-medium text-brand-teal-ink hover:underline"
        aria-label="Copy room code"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

/** Active session: both player lung meters + room info. */
function Session({ roomId, players, playerId, partnerBreath, myBreath, onDisconnect }) {
  const me = players.find(p => p.id === playerId);
  const partner = players.find(p => p.id !== playerId);
  const waiting = players.length < 2;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-slate-500 mb-1">Room code — share with your partner</p>
            <RoomCode code={roomId} />
          </div>
          <span
            className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[13px] font-semibold ${
              waiting ? 'bg-surface-sun text-brand-yellow-ink' : 'bg-surface-mint text-brand-teal-ink'
            }`}
          >
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-current" />
            {waiting ? 'Waiting for partner' : 'Connected'}
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-500 mb-4">
            You {me ? `— ${me.name}` : ''}
          </p>
          <LungMeter lungPct={myBreath.lungPct} holding={myBreath.holding} label="Lung capacity" tone="teal" />
        </Card>

        <Card>
          <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-500 mb-4">
            {waiting ? 'Partner — waiting…' : `Partner — ${partner?.name ?? ''}`}
          </p>
          {waiting ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              Share the room code above so your partner can join.
            </p>
          ) : (
            <LungMeter
              lungPct={partnerBreath.lungPct}
              holding={partnerBreath.holding}
              label="Lung capacity"
              tone="purple"
            />
          )}
        </Card>
      </div>

      <p className="text-[13px] text-slate-500 text-center">
        Breathing data is exchanged live over WebSocket at ~10 fps. No audio or video — just breath.
      </p>

      <div className="flex justify-center">
        <button type="button" onClick={onDisconnect} className={btn.soft}>
          Leave room
        </button>
      </div>
    </div>
  );
}

export default function CoopPage() {
  const { state } = useApp();
  const { status, roomId, playerId, players, partnerBreath, errorMsg, connect, sendBreath, disconnect } = useCoopRoom();

  // Simulate local breath state from a held pointer/Space for the demo.
  const [myBreath, setMyBreath] = useState({ holding: false, lungPct: 0.8 });
  const lungRef = useRef(0.8);
  const holdRef = useRef(false);
  const rafRef = useRef(null);

  useEffect(() => {
    const FILL_RATE = 1 / 1.5; // fills in 1.5 s
    const DRAIN_RATE = 1 / 2.5; // drains in 2.5 s
    let last = performance.now();

    const tick = now => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (holdRef.current) {
        lungRef.current = Math.min(1, lungRef.current + FILL_RATE * dt);
      } else {
        lungRef.current = Math.max(0, lungRef.current - DRAIN_RATE * dt);
      }
      setMyBreath({ holding: holdRef.current, lungPct: lungRef.current });
      if (status === 'connected') sendBreath(holdRef.current, lungRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const press = () => {
      holdRef.current = true;
    };
    const release = () => {
      holdRef.current = false;
    };
    window.addEventListener('pointerdown', press);
    window.addEventListener('pointerup', release);
    window.addEventListener('keydown', e => {
      if (e.code === 'Space') press();
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'Space') release();
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release);
    };
  }, [status, sendBreath]);

  return (
    <section className="animate-page space-y-6" aria-labelledby="coop-title">
      <header>
        <h1 id="coop-title" className="text-[26px] md:text-[30px] font-semibold leading-tight text-slate-900">
          Multiplayer Co-Op
        </h1>
        <p className="mt-1 text-slate-600">Breathe together in real time. Hold the screen or Space to inhale.</p>
      </header>

      {status === 'idle' || status === 'error' || status === 'unavailable' ? (
        <Lobby onConnect={connect} errorMsg={errorMsg} status={status} playerName={state.userName} />
      ) : status === 'disconnected' ? (
        <Card className="max-w-md mx-auto text-center space-y-4 py-8">
          <p className="text-slate-700">Disconnected from the room.</p>
          <button type="button" className={btn.primary} onClick={() => connect(null, state.userName)}>
            Reconnect
          </button>
        </Card>
      ) : (
        <Session
          roomId={roomId}
          players={players}
          playerId={playerId}
          partnerBreath={partnerBreath}
          myBreath={myBreath}
          onDisconnect={disconnect}
        />
      )}
    </section>
  );
}
