import { useRef, useState } from 'react';
import { useApp } from '../app/AppContext.jsx';
import { useSavedRuns } from '../app/useSavedRuns.js';
import { getSessionRepository } from '../services/apiClient.js';
import { dateKey } from '../core/stats.ts';
import {
  LEVELS,
  dailyBestSync,
  filterByLevel,
  firstDayOver,
  formatTrainingTime,
  levelName,
  runsInRange,
  totals,
  weekChange
} from '../core/progress.ts';
import type { DayBest, RunLike, RunTotals } from '../core/progress.ts';
import type { Session } from '../core/session.ts';
import { PineIcon, RidgeChart } from '../components/RidgeChart.jsx';
import { btn, Card, CardHead, EmptyState, Segmented } from '../components/ui.jsx';
import { useCountUp } from '../app/useCountUp.ts';

const DASH = '—';
const has = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nf = new Intl.NumberFormat('en-US');
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const RANGES = [
  { value: '7', label: '7 days', days: 7 },
  { value: '30', label: '30 days', days: 30 },
  { value: 'all', label: 'All runs', days: null }
];
const MILESTONES = [80, 90];

function formatDuration(sec: unknown): string {
  if (!has(sec)) return DASH;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

function formatCoins(run: Session): string {
  if (!has(run.coins)) return DASH;
  if (!has(run.totalCoins)) return String(run.coins);
  // totalCoins is per lap; multi-lap runs can collect more than one lap's worth.
  return run.coins > run.totalCoins ? `${run.coins} (${run.totalCoins}/lap)` : `${run.coins}/${run.totalCoins}`;
}

/** "Today" / "Yesterday" / "Saturday, Oct 24", plus the time on its own line. */
function RunDate({ value }: { value: string }) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return DASH;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const key = dateKey(d);
  const day = key === dateKey(new Date()) ? 'Today' : key === dateKey(yesterday) ? 'Yesterday' : DAY.format(d);
  return (
    <>
      <span className="block font-semibold text-slate-900">{day}</span>
      <span className="block text-[13px] text-slate-600">{TIME.format(d)}</span>
    </>
  );
}

/** A handful of evenly spaced date labels, always including the first and last day. */
function dayLabels(days: DayBest[]): [number, string][] {
  if (days.length <= 7) return days.map((d, i): [number, string] => [i, WEEKDAY.format(d.date)]);
  const step = Math.ceil((days.length - 1) / 5);
  const labels: [number, string][] = [];
  for (let i = 0; i < days.length - 1; i += step) labels.push([i, SHORT.format(days[i].date)]);
  if (days.length - 1 - labels[labels.length - 1][0] < step / 2) labels.pop();
  labels.push([days.length - 1, SHORT.format(days[days.length - 1].date)]);
  return labels;
}

function deltaText(range: string, runs: readonly RunLike[], days: DayBest[]): string | null {
  if (range === '7') {
    const change = weekChange(runs);
    if (change === null) return null;
    return change === 0
      ? 'Same as last week'
      : `${change > 0 ? 'Up' : 'Down'} ${Math.abs(change)} points from last week`;
  }
  const withRuns = days.filter(d => d.best !== null) as (DayBest & { best: number })[];
  if (withRuns.length < 2) return null;
  const change = withRuns[withRuns.length - 1].best - withRuns[0].best;
  const since = SHORT.format(withRuns[0].date);
  return change === 0
    ? `Same as on ${since}`
    : `${change > 0 ? 'Up' : 'Down'} ${Math.abs(change)} points since ${since}`;
}

function SyncRidge({ runs, range }: { runs: Session[]; range: string }) {
  const { days: span } = RANGES.find(r => r.value === range)!;
  const inRange = runsInRange(runs, span);
  const days = dailyBestSync(runs, span);
  const values = days.map(d => d.best);
  const t = totals(inRange);
  const delta = deltaText(range, runs, days);
  const pines = firstDayOver(days, MILESTONES);

  const animRuns = useCountUp(t.runs);
  const animSync = useCountUp(t.bestSync);
  const animCoins = useCountUp(t.coins);
  const chartRef = useRef<SVGSVGElement | null>(null);

  const exportPng = () => {
    const svg = chartRef.current;
    if (!svg) return;
    const { width, height } = svg.getBoundingClientRect();
    const svgStr = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = 'breath-sync.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  };

  return (
    <Card
      className="grid grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)] gap-x-8 gap-y-1 mb-6"
      aria-labelledby="ridge-title"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-0">
          <h2 id="ridge-title" className="text-[17px] font-semibold text-slate-900">
            Breath sync
          </h2>
          {values.some(v => v !== null) && (
            <button
              type="button"
              onClick={exportPng}
              className={`${btn.link} shrink-0`}
              aria-label="Download breath sync chart as PNG"
            >
              Download chart
            </button>
          )}
        </div>
        <p className="text-[40px] font-semibold leading-none tracking-tight tabular-nums text-slate-900 mt-3.5">
          {t.bestSync === null ? DASH : `${animSync}%`}
          {t.bestSync !== null && <span className="text-base font-normal text-slate-600 ml-1.5">best</span>}
        </p>
        {delta && <p className="mt-2.5 text-sm font-semibold text-brand-teal-ink">{delta}</p>}
        <ul className="mt-5 lg:mt-6 flex flex-row flex-wrap lg:flex-col gap-x-5 gap-y-2.5 text-[13px] text-slate-700">
          <li className="flex items-center gap-2.5">
            <span aria-hidden="true" className="w-[22px] shrink-0 border-t-2 border-chart-line" />
            Best run each day
          </li>
          <li className="flex items-center gap-2.5">
            <PineIcon className="w-[22px] h-[18px] shrink-0" />
            First day at {MILESTONES.map(m => `${m}%`).join(' and ')}
          </li>
        </ul>
      </div>
      {values.some(v => v !== null) ? (
        <RidgeChart
          svgRef={chartRef}
          values={values}
          min={0}
          max={100}
          height={272}
          ticks={[0, 25, 50, 75, 100]}
          tickFormat={v => `${v}%`}
          pines={pines}
          dots={days.length <= 31}
          xlabels={dayLabels(days)}
          label={`Best breath sync each day, ${SHORT.format(days[0].date)} to ${SHORT.format(days[days.length - 1].date)}. Best ${t.bestSync}%.`}
        />
      ) : (
        <p className="self-center text-sm text-slate-600 py-10 text-center">
          No breath sync in this range yet. Pick a longer range or play a run.
        </p>
      )}
      <dl className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-y-4 mt-2.5 pt-4 border-t border-slate-200/80">
        {[
          ['Runs', nf.format(animRuns)],
          ['Training time', formatTrainingTime(t.seconds)],
          ['Best breath sync', t.bestSync === null ? DASH : `${animSync}%`],
          ['Coins earned', nf.format(animCoins)]
        ].map(([label, value], i) => (
          <div key={label} className={`pr-4 lg:px-5 ${i ? 'lg:border-l lg:border-slate-200/80' : 'lg:pl-0'}`}>
            <dt className="text-[13px] text-slate-600">{label}</dt>
            <dd className="mt-0.5 text-[22px] font-semibold tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function RunsTable({ runs }: { runs: Session[] }) {
  const [level, setLevel] = useState('');
  const rows = filterByLevel(runs, level);
  const th = 'px-3 py-2.5 text-[13px] font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap';

  return (
    <Card aria-labelledby="runs-title">
      <CardHead id="runs-title" title="Runs" caption="Every run you saved, newest first">
        <label className="relative inline-flex">
          <span className="sr-only">Level</span>
          <select
            value={level}
            onChange={e => setLevel(e.target.value)}
            className="appearance-none h-10 pl-3.5 pr-9 rounded-xl bg-canvas shadow-[inset_0_0_0_1px_var(--color-slate-200)] text-sm text-slate-900 cursor-pointer"
          >
            <option value="">All levels</option>
            {LEVELS.map(l => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9.5 6 6 6-6" />
          </svg>
        </label>
      </CardHead>
      <div className="overflow-x-auto -mx-1.5">
        <table className="w-full min-w-[720px] text-sm text-left border-separate border-spacing-0">
          <caption className="sr-only">Saved Breath Runner runs, newest first</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>
                Date
              </th>
              <th scope="col" className={th}>
                Level
              </th>
              {['Duration', 'Coins', 'Breath sync', 'Falls', 'Laps'].map(h => (
                <th key={h} scope="col" className={`${th} text-right`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((run, i) => (
              <tr key={run.id || i} className="[&>*]:border-b [&>*]:border-slate-100 [&:last-child>*]:border-b-0">
                <td className="px-3 py-3 whitespace-nowrap">
                  <RunDate value={run.completedAt} />
                </td>
                <th scope="row" className="px-3 py-3 font-normal text-slate-900 whitespace-nowrap">
                  {levelName(run)}
                </th>
                <td className="px-3 py-3 text-right tabular-nums">{formatDuration(run.durationSec)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatCoins(run)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{has(run.syncPct) ? `${run.syncPct}%` : DASH}</td>
                <td className="px-3 py-3 text-right tabular-nums">{has(run.falls) ? run.falls : DASH}</td>
                <td className="px-3 py-3 text-right tabular-nums">{has(run.rounds) ? run.rounds : DASH}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-7 text-center text-slate-600">
                  No runs on this level yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Achievements ──────────────────────────────────────────────────────────────

type AchievementCheck = (runs: readonly RunLike[], t: RunTotals) => boolean;

interface Achievement {
  id: string;
  icon: string;
  label: string;
  desc: string;
  check: AchievementCheck;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-run',
    icon: 'M12 3L4 9v12h5v-7h6v7h5V9z',
    label: 'First Flight',
    desc: 'Save your first run',
    check: runs => runs.length >= 1
  },
  {
    id: 'smooth-breather',
    icon: 'M3 12 Q6 6 12 12 Q18 18 21 12',
    label: 'Smooth Rhythm',
    desc: 'Reach 75% breath sync',
    check: (runs, t) => t.bestSync !== null && t.bestSync >= 75
  },
  {
    id: 'coin-collector',
    icon: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v8m-3-3 3 3 3-3',
    label: 'Coin Collector',
    desc: 'Earn 100 coins',
    check: (runs, t) => t.coins >= 100
  },
  {
    id: 'peak-control',
    icon: 'M3 17 L9 11 L13 15 L21 7',
    label: 'Peak Control',
    desc: 'Reach 85% breath sync',
    check: (runs, t) => t.bestSync !== null && t.bestSync >= 85
  },
  {
    id: 'training-habit',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
    label: 'Training Habit',
    desc: 'Run on 5 different days',
    check: runs => new Set(runs.map(r => dateKey(new Date(r.completedAt)))).size >= 5
  }
];

function Achievements({ runs }: { runs: Session[] }) {
  const t = totals(runs);
  return (
    <div className="mb-6">
      <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Achievements</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {ACHIEVEMENTS.map(a => {
          const unlocked = a.check(runs, t);
          return (
            <div
              key={a.id}
              title={a.desc}
              className={`shrink-0 flex flex-col items-center gap-2 w-[80px] sm:w-[96px] rounded-[18px] border px-2 sm:px-3 py-3 sm:py-3.5 text-center bg-white ${
                unlocked ? 'border-slate-200/80' : 'border-slate-100'
              }`}
            >
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  unlocked ? 'bg-surface-mint' : 'bg-slate-100'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`w-[18px] h-[18px] ${unlocked ? 'text-brand-teal-ink' : 'text-slate-400'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={a.icon} />
                </svg>
              </span>
              <div>
                <div
                  className={`text-[11px] font-semibold leading-tight ${unlocked ? 'text-slate-900' : 'text-slate-500'}`}
                >
                  {a.label}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{a.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TodayOverview({ runs }: { runs: Session[] }) {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const todayRuns = runs.filter(r => new Date(r.completedAt) >= midnight);
  const weekRuns = runsInRange(runs, 7);
  if (!todayRuns.length && !weekRuns.length) return null;
  const t = totals(todayRuns);
  const w = totals(weekRuns);

  const Col = ({
    heading,
    caption,
    stats
  }: {
    heading: string;
    caption: string;
    stats: [string, string | number][];
  }) => (
    <div className="flex-1 min-w-0 px-5 py-4 sm:py-5">
      <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
        {heading}
      </div>
      <div className="text-[13px] text-slate-500 mb-4">{caption}</div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {stats.map(([label, value]: [string, string | number]) => (
          <div key={label}>
            <dt className="text-[11px] text-slate-500 mb-0.5">{label}</dt>
            <dd className="text-[22px] font-semibold tabular-nums leading-none text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <article
      className="rounded-[22px] border border-slate-200/80 bg-white overflow-hidden flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 mb-6"
      aria-label="Today and this week at a glance"
    >
      <Col
        heading="Today"
        caption={SHORT.format(new Date())}
        stats={[
          ['Runs', todayRuns.length || DASH],
          ['Best sync', t.bestSync !== null ? `${t.bestSync}%` : DASH],
          ['Coins', todayRuns.length ? nf.format(t.coins) : DASH]
        ]}
      />
      <Col
        heading="This week"
        caption="Last 7 days"
        stats={[
          ['Runs', weekRuns.length || DASH],
          ['Best sync', w.bestSync !== null ? `${w.bestSync}%` : DASH],
          ['Coins', nf.format(w.coins)]
        ]}
      />
    </article>
  );
}

/** 13 Progress: breath sync, totals and every saved run, from localStorage or the Express API. */
export default function HistoryPage() {
  const { navigate, notify } = useApp();
  const { runs, setRuns, status, error, reload } = useSavedRuns();
  const [range, setRange] = useState('all');
  const [clearing, setClearing] = useState(false);

  const clearHistory = async () => {
    if (!window.confirm('Delete every saved run? This cannot be undone.')) return;
    setClearing(true);
    try {
      const repo = await getSessionRepository();
      await repo.clear();
      setRuns([]);
      notify('Run history cleared.');
    } catch (err) {
      notify(`Could not clear history: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setClearing(false);
    }
  };

  const ready = status === 'ready' && runs.length > 0;

  return (
    <section className="animate-page" aria-labelledby="progress-title">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6">
        <div>
          <h1
            id="progress-title"
            className="text-[26px] md:text-[30px] font-semibold leading-tight tracking-tight text-slate-900"
          >
            Progress
          </h1>
          <p className="mt-1.5 text-slate-600">From every run you saved with &quot;Save to history&quot;</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {ready && <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />}
          <button type="button" onClick={() => navigate('play')} className={btn.primary}>
            Play a run
          </button>
          {ready && (
            <button type="button" onClick={clearHistory} disabled={clearing} className={btn.soft}>
              {clearing ? 'Clearing…' : 'Clear history'}
            </button>
          )}
        </div>
      </header>

      {status === 'loading' && (
        <Card as="div" flush className="text-center text-sm text-slate-600 p-10" role="status">
          <span
            className="inline-block w-2 h-2 rounded-full bg-brand-teal animate-pulse mr-2 align-middle"
            aria-hidden="true"
          />
          Loading saved runs…
        </Card>
      )}

      {status === 'error' && (
        <Card as="div" tone="coral" className="flex flex-wrap items-center justify-between gap-4" role="alert">
          <div>
            <div className="text-sm font-semibold text-slate-900">Could not load your runs</div>
            <div className="text-[13px] text-slate-700 mt-1">{error}</div>
          </div>
          <button type="button" onClick={reload} className={btn.soft}>
            Try again
          </button>
        </Card>
      )}

      {status === 'ready' && runs.length === 0 && (
        <Card as="div" flush className="p-10">
          <EmptyState
            title="No runs yet"
            action={
              <button type="button" onClick={() => navigate('play')} className={btn.primary}>
                Start your first run
              </button>
            }
          >
            Finish a lap in the Breath Runner and press &quot;Save to history&quot;: your coins, breath sync and falls
            will show up here.
          </EmptyState>
        </Card>
      )}

      {ready && (
        <>
          <Achievements runs={runs} />
          <TodayOverview runs={runs} />
          <SyncRidge runs={runs} range={range} />
          <RunsTable runs={runs} />
        </>
      )}
    </section>
  );
}
