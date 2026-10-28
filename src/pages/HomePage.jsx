import { useMemo, useState } from 'react';
import { useApp } from '../app/AppContext.jsx';
import { useSavedRuns } from '../app/useSavedRuns.js';
import { getLevel } from '../core/forestLevels.ts';
import {
  coinsLast7,
  currentStreak,
  dailyBestSync,
  greeting,
  runsInRange,
  todaySlots,
  totals,
  weekChange
} from '../core/progress.ts';
import { useCountUp } from '../app/useCountUp.js';
import { SITE_URL } from '../app/versions.js';
import { RidgeChart } from '../components/RidgeChart.jsx';
import { Avatar, BatteryIcon, btn, Card, CardHead, Chip, SampleTag } from '../components/ui.jsx';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const LONG_DATE = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const nf = new Intl.NumberFormat('en-US');

// Opens the visitor's email app with an invite ready to send; they fill in the friend's address.
const INVITE_MAILTO = `mailto:?subject=${encodeURIComponent('Run with me in Breath Runner')}&body=${encodeURIComponent(
  `I'm training my breathing with Breath Runner: inhale to jump, keep inhaling to glide. Run with me!\n\n${SITE_URL}`
)}`;

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

const RUN_TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const WEEKLY_GOAL = 3;

function WeeklyGoal({ weekRuns }) {
  const done = Math.min(weekRuns, WEEKLY_GOAL);
  return (
    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
      <span className="text-[13px] text-slate-600">Weekly goal</span>
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: WEEKLY_GOAL }, (_, i) => (
            <span
              key={i}
              className={`w-5 h-1.5 rounded-full transition-colors ${i < done ? 'bg-brand-teal' : 'bg-slate-200'}`}
            />
          ))}
        </div>
        <span className="text-[13px] font-semibold tabular-nums text-slate-700">
          {done}/{WEEKLY_GOAL}
        </span>
      </div>
    </div>
  );
}

function TodayHasData({ todaySyncRuns, todayStats, ghostCount, streak }) {
  const animatedSync = useCountUp(todayStats.bestSync);
  const animatedStreak = useCountUp(streak > 0 ? streak : null);
  return (
    <>
      <div className="flex items-center gap-3.5 flex-wrap mt-1 mb-4">
        <span className="text-[40px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">
          {animatedSync}%<span className="text-base font-normal text-slate-600 ml-1.5">best today</span>
        </span>
      </div>
      <div className="flex items-end gap-2.5 mb-2.5" style={{ height: 128 }}>
        {todaySyncRuns.map((run, i) => {
          const pct = run.syncPct;
          return (
            <div key={run.id || i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-700 tabular-nums">{pct}%</span>
              <div className="relative w-full" style={{ height: 96 }}>
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-[6px] bg-gradient-to-t from-teal-500/80 to-teal-300/50"
                  style={{ height: `${(pct / 100) * 96}px` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 truncate w-full text-center">
                {RUN_TIME.format(new Date(run.completedAt))}
              </span>
            </div>
          );
        })}
        {Array.from({ length: ghostCount }, (_, i) => (
          <div key={`ghost-${i}`} className="flex flex-col items-center gap-1 flex-1 min-w-0" aria-hidden="true">
            <span className="text-xs text-transparent select-none">0%</span>
            <div className="relative w-full" style={{ height: 96 }}>
              <div className="absolute inset-x-0 bottom-0 rounded-t-[6px] bg-slate-100" style={{ height: 3 }} />
            </div>
            <span className="text-[10px] text-slate-200">—</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        {todaySyncRuns.length} {todaySyncRuns.length === 1 ? 'run' : 'runs'} today
        {todayStats.coins > 0 && <> · {nf.format(todayStats.coins)} coins</>}
        {streak > 1 && (
          <>
            {' '}
            · <span className="font-semibold text-brand-teal-ink">{animatedStreak}-day streak</span>
          </>
        )}
      </p>
    </>
  );
}

function SyncCard({ runs, status, error, onProgress, onPlay }) {
  const [view, setView] = useState('today');
  const streak = currentStreak(runs);

  // Week data
  const days = dailyBestSync(runs, 7);
  const week = totals(runsInRange(runs, 7));
  const animatedWeekSync = useCountUp(view === 'week' ? week.bestSync : null);
  const change = weekChange(runs);
  const weekValues = days.map(d => d.best);
  const hasWeekData = weekValues.some(v => v !== null);
  const lowest = Math.min(100, ...weekValues.filter(v => v !== null));
  const floor = Math.max(0, Math.floor((lowest - 10) / 10) * 10);

  // Today data: runs saved since midnight, ordered by time, with a sync reading
  const todaySyncRuns = useMemo(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return runs
      .filter(r => r.syncPct != null && new Date(r.completedAt) >= midnight)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  }, [runs]);
  const todayStats = totals(todaySyncRuns);
  const hasTodayData = todaySyncRuns.length > 0;

  // Ghost bar count so the chart doesn't look sparse with a single run
  const ghostCount = Math.max(0, 3 - todaySyncRuns.length);

  return (
    <Card className="md:col-span-2 xl:col-span-1" aria-labelledby="sync-title">
      <CardHead
        id="sync-title"
        title="Breath sync"
        caption={view === 'today' ? "Today's sessions" : 'Best run each day, last 7 days'}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-full bg-slate-100 p-0.5 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setView('today')}
              className={`px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                view === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setView('week')}
              className={`px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                view === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              This week
            </button>
          </div>
          <button type="button" onClick={onProgress} className={btn.link}>
            See all progress
          </button>
        </div>
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

      {/* ── Today view ─────────────────────────────────────── */}
      {status === 'ready' && view === 'today' && !hasTodayData && (
        <div className="py-6 space-y-4">
          <p className="text-sm text-slate-600 max-w-sm">
            No runs yet today. Finish a lap and press &quot;Save to history&quot; — your breath sync shows up here.
          </p>
          <button type="button" onClick={onPlay} className={btn.soft}>
            Start a run
          </button>
        </div>
      )}
      {status === 'ready' && view === 'today' && hasTodayData && (
        <TodayHasData todaySyncRuns={todaySyncRuns} todayStats={todayStats} ghostCount={ghostCount} streak={streak} />
      )}

      {/* ── Week view ──────────────────────────────────────── */}
      {status === 'ready' && view === 'week' && !hasWeekData && (
        <div className="py-6 space-y-4">
          <p className="text-sm text-slate-600 max-w-sm">
            No runs saved in the last 7 days. Finish a lap and press &quot;Save to history&quot;: your breath sync shows
            up here.
          </p>
          <button type="button" onClick={onPlay} className={btn.soft}>
            Start a run
          </button>
        </div>
      )}
      {status === 'ready' && view === 'week' && hasWeekData && (
        <>
          <div className="flex items-center gap-3.5 flex-wrap mt-1 mb-1.5">
            <span className="text-[40px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">
              {animatedWeekSync}%<span className="text-base font-normal text-slate-600 ml-1.5">best</span>
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
            values={weekValues}
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

      {status === 'ready' && week.runs > 0 && <WeeklyGoal weekRuns={week.runs} />}
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
      <a href={INVITE_MAILTO} className={`${btn.soft} w-full`}>
        Invite a friend by email
      </a>
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
