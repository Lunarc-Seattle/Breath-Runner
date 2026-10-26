import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../app/AppContext.jsx';
import { getSessionRepository } from '../services/apiClient.js';

const DASH = '—';
const has = v => typeof v === 'number' && Number.isFinite(v);

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Short runs are only seconds long, so show one decimal under 10 minutes. */
function formatMinutes(totalSec) {
  const min = totalSec / 60;
  return min < 10 ? min.toFixed(1) : String(Math.round(min));
}
function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? DASH : dateFormat.format(d);
}

function formatDuration(sec) {
  if (!has(sec)) return DASH;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

function formatCoins(run) {
  if (!has(run.coins)) return DASH;
  if (!has(run.totalCoins)) return String(run.coins);
  // totalCoins is per lap; multi-lap runs can collect more than one lap's worth.
  return run.coins > run.totalCoins ? `${run.coins} (${run.totalCoins}/lap)` : `${run.coins}/${run.totalCoins}`;
}

function summarize(runs) {
  const syncs = runs.map(r => r.syncPct).filter(has);
  return {
    total: runs.length,
    minutes: formatMinutes(runs.reduce((sum, r) => sum + (has(r.durationSec) ? r.durationSec : 0), 0)),
    bestSync: syncs.length ? `${Math.max(...syncs)}%` : DASH,
    coins: runs.reduce((sum, r) => sum + (has(r.coins) ? r.coins : 0), 0)
  };
}

function Tile({ label, value, tone }) {
  return (
    <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-sm">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-2xl md:text-3xl font-bold font-mono mt-1 ${tone}`}>{value}</div>
    </div>
  );
}

/** 05 Run history: saved Breath Runner runs from localStorage or the Express API. */
export default function HistoryPage() {
  const { navigate, notify } = useApp();
  const [runs, setRuns] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const repo = await getSessionRepository();
      const list = await repo.list();
      const rows = (Array.isArray(list) ? list : []).filter(r => r && typeof r === 'object');
      const sorted = rows.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      setRuns(sorted);
      setStatus('ready');
    } catch (err) {
      setError(err?.message || 'Unknown error');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clearHistory = async () => {
    if (!window.confirm('Delete every saved run? This cannot be undone.')) return;
    setClearing(true);
    try {
      const repo = await getSessionRepository();
      await repo.clear();
      setRuns([]);
      notify('Run history cleared.');
    } catch (err) {
      notify(`Could not clear history: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  const list = runs || [];
  const stats = summarize(list);

  return (
    <section className="space-y-6 animate-page">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <span className="text-xs font-mono text-brand-teal-ink font-semibold">
            13 RUN HISTORY // SAVED BREATH RUNNER RUNS
          </span>
          <h2 className="text-3xl font-bold text-slate-900 mt-1">Your Runs, Coins &amp; Breath Sync</h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('play')}
            className="px-5 py-3 rounded-2xl bg-brand-teal-deep text-white font-bold text-xs"
          >
            Play a run →
          </button>
          {status === 'ready' && list.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              disabled={clearing}
              className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:border-brand-pink hover:text-brand-pink-ink font-bold text-xs disabled:opacity-50"
            >
              {clearing ? 'Clearing…' : 'Clear history'}
            </button>
          )}
        </div>
      </div>

      {status === 'loading' && (
        <div
          className="rounded-3xl bg-white p-10 border border-slate-200/80 shadow-sm text-center text-sm text-slate-500"
          role="status"
        >
          <span
            className="inline-block w-2 h-2 rounded-full bg-brand-teal animate-pulse mr-2 align-middle"
            aria-hidden="true"
          ></span>
          Loading saved runs…
        </div>
      )}

      {status === 'error' && (
        <div
          className="rounded-3xl bg-brand-pink/15 border border-brand-pink/50 p-6 flex flex-wrap items-center justify-between gap-4"
          role="alert"
        >
          <div>
            <div className="text-sm font-bold text-slate-900">Could not load your run history</div>
            <div className="text-xs text-slate-600 mt-1">{error}</div>
          </div>
          <button type="button" onClick={load} className="px-5 py-2.5 rounded-2xl bg-ink text-white font-bold text-xs">
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && list.length === 0 && (
        <div className="rounded-[32px] bg-white p-10 border border-slate-200/80 shadow-sm text-center space-y-3">
          <div className="text-xs font-mono text-brand-teal-ink">NO RUNS YET</div>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Finish a lap in the Breath Runner and press “Save to history” — your coins, breath sync and falls will show
            up here.
          </p>
          <button
            type="button"
            onClick={() => navigate('play')}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-teal to-brand-teal-light text-white font-bold text-xs"
          >
            Start your first run
          </button>
        </div>
      )}

      {status === 'ready' && list.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile label="Total runs" value={stats.total} tone="text-slate-900" />
            <Tile label="Total minutes" value={stats.minutes} tone="text-brand-teal-ink" />
            <Tile label="Best breath sync" value={stats.bestSync} tone="text-brand-purple-ink" />
            <Tile label="Total coins" value={stats.coins} tone="text-brand-gold" />
          </div>

          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm text-left">
                <caption className="sr-only">Saved Breath Runner runs, newest first</caption>
                <thead className="bg-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Date
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Level
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-right">
                      Duration
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-right">
                      Coins
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-right">
                      Breath sync
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-right">
                      Falls
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold text-right">
                      Laps
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((run, i) => (
                    <tr key={run.id || i} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 whitespace-nowrap text-slate-600">{formatDate(run.completedAt)}</td>
                      <th scope="row" className="px-5 py-3 font-semibold text-slate-900">
                        {run.patternName || DASH}
                      </th>
                      <td className="px-5 py-3 text-right font-mono">{formatDuration(run.durationSec)}</td>
                      <td className="px-5 py-3 text-right font-mono">{formatCoins(run)}</td>
                      <td className="px-5 py-3 text-right font-mono">{has(run.syncPct) ? `${run.syncPct}%` : DASH}</td>
                      <td className="px-5 py-3 text-right font-mono">{has(run.falls) ? run.falls : DASH}</td>
                      <td className="px-5 py-3 text-right font-mono">{has(run.rounds) ? run.rounds : DASH}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
