import { html, useMemo } from '../lib/react.js';
import { PATTERNS, cycleSeconds } from '../core/patterns.js';
import { summarize } from '../core/stats.js';

const STACK = [
  { title: 'React 18 + htm', text: 'Native ES modules with no build step. The same files run on GitHub Pages and locally.' },
  { title: 'Pure core logic', text: 'Breath timing, stats and game physics are framework-free modules covered by node:test.' },
  { title: 'Express REST API', text: 'Session CRUD with validation and atomic JSON-file persistence. Falls back to localStorage when the API is unavailable.' },
  { title: 'CI/CD', text: 'GitHub Actions runs the test suite, then deploys the static site to Pages.' }
];

export function HomePage({ sessions, onStartPattern, onNavigate }) {
  const stats = useMemo(() => summarize(sessions), [sessions]);

  return html`
    <section className="space-y-10 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-12 border border-black/15 rounded-[28px] overflow-hidden bg-[#F6F5F0]">
        <div className="lg:col-span-7 p-8 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-black/15">
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-6xl font-light tracking-tight leading-[1.08]">
              Breathe with <span className="font-serif italic font-normal text-[#13A4A9]">intention</span>, a few minutes a day.
            </h1>
            <p className="text-neutral-600 text-base lg:text-lg max-w-2xl leading-relaxed">
              Guided breathing patterns with a visual pacer, a small rhythm game, and a log that tracks your streak.
            </p>
          </div>
          <div className="pt-10 flex flex-wrap items-center gap-4">
            <button onClick=${() => onStartPattern('box')} className="px-6 py-3.5 rounded-full bg-[#111315] text-white text-sm font-medium flex items-center gap-3 hover:bg-[#13A4A9] transition-colors">
              <span>Start a session</span>
              <span className="w-6 h-6 rounded-full bg-[#D9F99D] text-black flex items-center justify-center font-mono text-xs">↗</span>
            </button>
            <button onClick=${() => onNavigate('game')} className="px-6 py-3.5 rounded-full bg-white border border-black/15 text-sm font-mono hover:bg-black/5 transition-colors">
              Play Breath Pacer →
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-8 lg:p-12 flex flex-col justify-center gap-6">
          <div className="text-xs font-mono text-neutral-400 border-b border-black/10 pb-3">TODAY</div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-5xl font-light tracking-tight">${stats.todayMinutes}<span className="text-lg font-mono text-[#13A4A9] ml-1">min</span></div>
              <div className="text-xs text-neutral-500 mt-1">practiced today</div>
            </div>
            <div>
              <div className="text-5xl font-light tracking-tight">${stats.currentStreak}<span className="text-lg font-mono text-[#8E90C6] ml-1">${stats.currentStreak === 1 ? 'day' : 'days'}</span></div>
              <div className="text-xs text-neutral-500 mt-1">current streak</div>
            </div>
          </div>
          <button onClick=${() => onNavigate('history')} className="self-start text-xs font-mono text-[#13A4A9] hover:underline">
            View full history (${stats.totalSessions} sessions) ↗
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-xs font-mono text-neutral-500">QUICK START</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${PATTERNS.map(p => html`
            <button
              key=${p.id}
              onClick=${() => onStartPattern(p.id)}
              className="text-left p-6 rounded-[24px] bg-white border border-black/10 hover:border-black/30 hover:shadow-sm transition-all flex flex-col justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-3 h-3 rounded-full" style=${{ backgroundColor: p.color }}></span>
                  <span className="text-[11px] font-mono text-neutral-400">${p.phases.map(ph => ph.seconds).join('-')}</span>
                </div>
                <h3 className="text-xl font-light">${p.name}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">${p.description}</p>
              </div>
              <div className="text-xs font-mono text-neutral-500">
                ${p.defaultRounds} rounds · ${Math.round((cycleSeconds(p) * p.defaultRounds) / 6) / 10} min
              </div>
            </button>
          `)}
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-xs font-mono text-neutral-500">HOW IT'S BUILT</div>
        <div className="grid grid-cols-1 md:grid-cols-4 border border-black/15 rounded-[24px] overflow-hidden bg-white divide-y md:divide-y-0 md:divide-x divide-black/15">
          ${STACK.map(item => html`
            <div key=${item.title} className="p-6 space-y-2">
              <div className="text-sm font-semibold">${item.title}</div>
              <p className="text-xs text-neutral-500 leading-relaxed">${item.text}</p>
            </div>
          `)}
        </div>
      </div>
    </section>
  `;
}
