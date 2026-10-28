import { useMemo, useState } from 'react';
import { useApp } from '../app/AppContext.jsx';
import { useSavedRuns } from '../app/useSavedRuns.js';
import { getLevel } from '../core/forestLevels.ts';
import { coinsLast7, dailyBestSync, greeting, runsInRange, todaySlots, totals, weekChange } from '../core/progress.ts';
import { RidgeChart } from '../components/RidgeChart.jsx';
import { Avatar, BatteryIcon, btn, Card, CardHead, Chip, SampleTag } from '../components/ui.jsx';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const LONG_DATE = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const nf = new Intl.NumberFormat('en-US');

// Marker positions on the hero art, as % of the 2400×1108 illustration (from the design).
const MARKER_AT = {
  morning: { left: '23.5%', top: '82.1%' },
  afternoon: { left: '72.5%', top: '81.6%' },
  evening: { left: '87%', top: '65.6%' }
};
const SLOT_NOTE = { done: 'Done', missed: 'Missed' };

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function describeSlots(slots) {
  return slots
    .map(s => {
      if (s.state === 'done') return `${s.label} done.`;
      if (s.state === 'missed') return `${s.label} missed.`;
      return `${s.label}${s.state === 'next' ? ' is next,' : ''} at ${s.time}.`;
    })
    .join(' ');
}

function Hero({ name, map, slots, onStart }) {
  const now = new Date();
  const level = getLevel(map.id);
  const next = slots.find(s => s.state === 'next');
  const allDone = slots.every(s => s.state === 'done');
  const lede = next
    ? `Your ${next.label.toLowerCase()} session is next.`
    : allDone
      ? 'All three sessions done today.'
      : "Today's sessions are over. Run again whenever you like.";

  return (
    <div className="home-hero">
      <div className="home-hero-copy">
        <p className="text-sm text-slate-600 mb-2">{LONG_DATE.format(now)}</p>
        <h1
          id="home-title"
          className="text-[28px] lg:text-[34px] font-semibold leading-[1.16] tracking-tight text-slate-900"
        >
          {greeting(now)},
          <br />
          {name}
        </h1>
        <p className="text-base text-slate-700 mt-3.5 mb-6 max-w-[36ch]">
          {lede} <span className="whitespace-nowrap">{map.name} is ready.</span>
        </p>
        <p className="home-hero-today">{describeSlots(slots)}</p>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={onStart}
            className={`${btn.primary} shadow-[0_10px_24px_rgba(15,131,135,0.28)]`}
          >
            Start today’s run
          </button>
          <span className="text-sm text-slate-600">{level.skill} · inhale to jump, keep inhaling to glide</span>
        </div>
      </div>
      <div className="home-hero-scene" aria-hidden="true">
        <div className="home-hero-art">
          <img src={`${ASSETS}ui/hero-forest.webp`} alt="" width="2400" height="1108" />
        </div>
        <div className="home-hero-art home-hero-marks">
          {slots.map(s => (
            <div key={s.id} className={`home-wp is-${s.state}`} style={MARKER_AT[s.id]}>
              <span className="home-wp-label">
                {s.label} <em>{SLOT_NOTE[s.state] || s.time}</em>
              </span>
              <span className="home-wp-dot">{s.state === 'done' && <CheckIcon />}</span>
            </div>
          ))}
          <img
            className="home-runner"
            src={`${ASSETS}ui/runner-jump.webp`}
            alt=""
            width="509"
            height="560"
            style={{ left: '61.2%', top: '83.2%' }}
          />
        </div>
      </div>
    </div>
  );
}

function SyncCard({ runs, status, error, onProgress, onPlay }) {
  const days = dailyBestSync(runs, 7);
  const week = totals(runsInRange(runs, 7));
  const change = weekChange(runs);
  const values = days.map(d => d.best);
  const hasData = values.some(v => v !== null);
  // Zoom the y axis to the week's range (in steps of 10) so day-to-day change stays visible.
  const lowest = Math.min(100, ...values.filter(v => v !== null));
  const floor = Math.max(0, Math.floor((lowest - 10) / 10) * 10);

  return (
    <Card className="md:col-span-2 xl:col-span-1" aria-labelledby="sync-title">
      <CardHead id="sync-title" title="Breath sync" caption="Best run each day, last 7 days">
        <button type="button" onClick={onProgress} className={btn.link}>
          See all progress
        </button>
      </CardHead>

      {status === 'loading' && (
        <p role="status" className="text-sm text-slate-600 py-10 text-center">
          Loading saved runs…
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-sm text-brand-pink-ink py-6">
          Could not load your runs: {error}
        </p>
      )}
      {status === 'ready' && !hasData && (
        <div className="py-6 space-y-4">
          <p className="text-sm text-slate-600 max-w-sm">
            No runs saved in the last 7 days. Finish a lap and press “Save to history”: your breath sync shows up here.
          </p>
          <button type="button" onClick={onPlay} className={btn.soft}>
            Start a run
          </button>
        </div>
      )}
      {status === 'ready' && hasData && (
        <>
          <div className="flex items-center gap-3.5 flex-wrap mt-1 mb-1.5">
            <span className="text-[40px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">
              {week.bestSync}%<span className="text-base font-normal text-slate-600 ml-1.5">best</span>
            </span>
            {change !== null && (
              <Chip tone={change < 0 ? 'coral' : 'teal'}>
                {change === 0
                  ? 'Same as last week'
                  : `${change > 0 ? 'Up' : 'Down'} ${Math.abs(change)} points from last week`}
              </Chip>
            )}
          </div>
          <RidgeChart
            values={values}
            min={floor}
            max={100}
            height={210}
            ticks={[floor + (100 - floor) / 2, 100]}
            dots
            compact
            xlabels={days.map((d, i) => [i, WEEKDAY.format(d.date)])}
            label={`Best breath sync each day for the last 7 days: ${days
              .map(d => `${WEEKDAY.format(d.date)} ${d.best === null ? 'no run' : `${d.best}%`}`)
              .join(', ')}`}
          />
        </>
      )}
    </Card>
  );
}

function TrainerCard({ state, trainer, booking, daysSince, onBook }) {
  const connected = state.bleConnected;
  return (
    <Card tone="warm" className="flex flex-col gap-4" aria-labelledby="trainer-title">
      <div className="relative overflow-hidden rounded-[18px] bg-neutral-200 aspect-[1.62]">
        <img
          src={`${ASSETS}ui/trainer.webp`}
          alt=""
          width="800"
          height="614"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover object-[50%_38%] home-photo-mask"
        />
      </div>
      <div className="space-y-2.5">
        <h2 id="trainer-title" className="text-[17px] font-semibold text-slate-900">
          {connected ? state.deviceName : 'AeroCare trainer'}
        </h2>
        <div className="flex flex-wrap gap-2">
          {state.bleScanning ? (
            <Chip tone="lavender" dot>
              Searching…
            </Chip>
          ) : connected ? (
            <>
              <Chip tone="teal" dot>
                Connected
              </Chip>
              {state.batteryPct !== null && (
                <Chip>
                  <BatteryIcon pct={state.batteryPct} low={state.batteryPct < 20} />
                  Battery {state.batteryPct}%
                </Chip>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-700">No trainer found, using the microphone</p>
          )}
        </div>
        {!connected && !state.bleScanning && (
          <p className="text-[13px] text-slate-600">In the game, breathe in near the mic or hold Space to inhale.</p>
        )}
        {state.bleError && !connected && (
          <p role="alert" className="text-[13px] text-brand-pink-ink">
            {state.bleError}
          </p>
        )}
        <button
          type="button"
          onClick={connected ? trainer.disconnect : trainer.pair}
          disabled={state.bleScanning}
          className={`${btn.soft} h-10 px-5 text-sm`}
        >
          {connected ? 'Disconnect trainer' : 'Pair Bluetooth trainer'}
        </button>
      </div>
      <div
        className={`mt-auto flex items-center justify-between gap-3 rounded-[14px] py-3 pl-4 pr-3.5 ${booking ? 'bg-surface-mint' : 'bg-surface-coral'}`}
      >
        <div className="min-w-0">
          <div className={`text-sm font-semibold ${booking ? 'text-brand-teal-ink' : 'text-brand-pink-ink'}`}>
            {booking ? 'Disinfection booked' : 'Disinfection due'}
          </div>
          <div className="text-[13px] text-slate-700">
            {booking
              ? `${SHORT_DATE.format(booking.date)}, ${booking.slot}`
              : `Last done ${daysSince} days ago · sample`}
          </div>
        </div>
        <button type="button" onClick={onBook} className={btn.link}>
          {booking ? 'Change' : 'Book'}
        </button>
      </div>
    </Card>
  );
}

function FriendsCard({ friends, myCoins, myInitials }) {
  const [invited, setInvited] = useState(false);
  const board = [
    ...friends.map(f => ({ ...f, me: false })),
    { name: 'You', initials: myInitials, tone: 'teal', coins: myCoins, me: true }
  ].sort((a, b) => b.coins - a.coins || Number(b.me) - Number(a.me));

  return (
    <Card tone="lavender" aria-labelledby="friends-title">
      <CardHead id="friends-title" title="Friends this week" caption="Coins from the last 7 days">
        <SampleTag />
      </CardHead>
      <ol className="flex flex-col gap-0.5 mb-3">
        {board.map((p, i) => (
          <li
            key={p.name}
            className={`grid grid-cols-[16px_36px_minmax(0,1fr)_auto] items-center gap-2.5 px-2.5 py-2 rounded-[14px] ${p.me ? 'bg-white' : ''}`}
          >
            <span className="text-[13px] font-semibold text-brand-purple-ink text-center">{i + 1}</span>
            <Avatar initials={p.initials} tone={p.tone} />
            <span className="text-sm font-semibold text-slate-900 truncate">{p.name}</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-slate-900">
              <img src={`${ASSETS}forest/coin.png`} alt="" width="18" height="18" className="w-[18px] h-[18px]" />
              {nf.format(p.coins)}
              <span className="sr-only"> coins</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-slate-600 mb-4">
        Your coins come from your saved runs. Friends are sample players.
      </p>
      <button type="button" onClick={() => setInvited(true)} className={`${btn.soft} w-full`}>
        Invite a friend to run together
      </button>
      <p role="status" className="text-sm text-brand-teal-ink mt-2.5 empty:hidden">
        {invited ? 'Inviting friends is not part of this demo yet.' : ''}
      </p>
    </Card>
  );
}

/** 01 Home: today's run, breath sync from saved runs, the paired trainer and friends. */
export default function HomePage() {
  const { state, navigate, trainer } = useApp();
  const { runs, status, error } = useSavedRuns();
  const slots = useMemo(() => todaySlots(status === 'ready' ? runs : []), [runs, status]);

  return (
    <section className="space-y-6 animate-page" aria-labelledby="home-title">
      <Hero name={state.userName} map={state.lastMap} slots={slots} onStart={() => navigate('play')} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1.32fr)_minmax(0,1fr)_minmax(0,0.92fr)] gap-6">
        <SyncCard
          runs={runs}
          status={status}
          error={error}
          onProgress={() => navigate('history')}
          onPlay={() => navigate('play')}
        />
        <TrainerCard
          state={state}
          trainer={trainer}
          booking={state.disinfectionBooking}
          daysSince={state.hygiene.daysSince}
          onBook={() => navigate('trainer')}
        />
        <FriendsCard friends={state.friendsThisWeek} myCoins={coinsLast7(runs)} myInitials="L" />
      </div>
    </section>
  );
}
