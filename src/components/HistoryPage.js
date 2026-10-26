import { html, useMemo } from '../lib/react.js';
import { summarize, formatDuration } from '../core/stats.js';

function WeekChart({ days }) {
  const W = 560, H = 200, PAD_B = 28, PAD_T = 22;
  const max = Math.max(5, ...days.map(d => d.minutes));
  const slot = W / days.length;
  const barW = Math.min(44, slot * 0.55);

  return html`
    <svg viewBox=${`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Minutes practiced over the last 7 days">
      <line x1="0" y1=${H - PAD_B} x2=${W} y2=${H - PAD_B} stroke="#11131522" />
      ${days.map((d, i) => {
        const h = ((H - PAD_B - PAD_T) * d.minutes) / max;
        const x = i * slot + (slot - barW) / 2;
        const isToday = i === days.length - 1;
        return html`
          <g key=${d.dateKey}>
            <title>${d.dateKey}: ${d.minutes} min</title>
            <rect x=${x} y=${H - PAD_B - h} width=${barW} height=${Math.max(h, d.minutes > 0 ? 2 : 0)} rx="6"
              fill=${isToday ? '#13A4A9' : '#96C7D2'} />
            ${d.minutes > 0 && html`
              <text x=${x + barW / 2} y=${H - PAD_B - h - 6} textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono" fill="#111315">${d.minutes}</text>
            `}
            <text x=${x + barW / 2} y=${H - 8} textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono"
              fill=${isToday ? '#111315' : '#737373'}>${isToday ? 'Today' : d.label}</text>
          </g>
        `;
      })}
    </svg>
  `;
}

export function HistoryPage({ sessions, onClear, onPractice }) {
  const stats = useMemo(() => summarize(sessions), [sessions]);

  const tiles = [
    { label: 'SESSIONS', value: stats.totalSessions, unit: '' },
    { label: 'TOTAL TIME', value: stats.totalMinutes, unit: 'min' },
    { label: 'CURRENT STREAK', value: stats.currentStreak, unit: stats.currentStreak === 1 ? 'day' : 'days' },
    { label: 'FAVORITE', value: stats.favoritePattern || '—', unit: '', small: true }
  ];

  return html`
    <section className="space-y-8 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/15 pb-6">
        <div>
          <span className="text-xs font-mono text-[#0B7377]">HISTORY & PROGRESS</span>
          <h2 className="text-4xl font-light tracking-tight mt-1">
            Your <span className="font-serif italic">practice</span> log
          </h2>
        </div>
        ${sessions.length > 0 && html`
          <button
            onClick=${() => { if (window.confirm('Delete all saved sessions?')) onClear(); }}
            className="px-4 py-2 rounded-full bg-white border border-black/10 font-mono text-xs text-red-700 hover:bg-red-50"
          >
            Clear history
          </button>
        `}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 border border-black/15 rounded-[24px] overflow-hidden bg-white divide-x divide-y md:divide-y-0 divide-black/15">
        ${tiles.map(t => html`
          <div key=${t.label} className="p-6">
            <div className="text-xs font-mono text-neutral-500">${t.label}</div>
            <div className=${`${t.small ? 'text-xl' : 'text-4xl'} font-light tracking-tight mt-4 truncate`}>
              ${t.value}<span className="text-sm font-mono text-[#0B7377] ml-1">${t.unit}</span>
            </div>
          </div>
        `)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-7 rounded-[24px] bg-white border border-black/10 space-y-4">
          <div className="text-xs font-mono text-neutral-500">MINUTES · LAST 7 DAYS</div>
          <${WeekChart} days=${stats.last7} />
        </div>

        <div className="lg:col-span-5 p-7 rounded-[24px] bg-white border border-black/10 space-y-3">
          <div className="text-xs font-mono text-neutral-500">RECENT SESSIONS</div>
          ${sessions.length === 0 ? html`
            <div className="py-10 text-center text-sm text-neutral-500 space-y-3">
              <p>No sessions yet.</p>
              <button onClick=${onPractice} className="px-5 py-2.5 rounded-full bg-[#111315] text-white font-mono text-xs">Start your first session</button>
            </div>
          ` : html`
            <div className="divide-y divide-black/10 max-h-[360px] overflow-y-auto pr-1">
              ${sessions.slice(0, 50).map(s => html`
                <div key=${s.id} className="py-3 flex items-center justify-between gap-3 text-xs font-mono">
                  <div className="min-w-0">
                    <div className="font-semibold text-black truncate">${s.patternName}</div>
                    <div className="text-neutral-400">
                      ${new Date(s.completedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      · ${s.rounds} rounds
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div>${formatDuration(s.durationSec)}</div>
                    <div className=${s.completed ? 'text-emerald-700' : 'text-neutral-400'}>${s.completed ? 'Completed' : 'Stopped early'}</div>
                  </div>
                </div>
              `)}
            </div>
          `}
        </div>
      </div>
    </section>
  `;
}
