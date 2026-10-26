import { solidStyle } from '../data/simStore.js';

const CHART_BARS = [60, 90, 125, 105, 145, 165, 150, 180];

const FRIENDS = [
  { name: 'Ali', score: '4,308 pts', color: '#13A4A9' },
  { name: 'Bage', score: '4,120 pts', color: '#8E90C6' },
  { name: 'Ms. Bai', score: '3,890 pts', color: '#F0C754' },
  { name: 'Mr. Bi', score: '3,640 pts', color: '#F0A7AB' }
];

export default function RankingPage() {
  return (
    <section className="space-y-6 animate-page">
      <h2 className="text-3xl font-bold text-slate-900">07 Community & Friends Data Ranking</h2>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-4">
          <div className="text-xs font-mono text-slate-500">FRIENDS RANKING MULTI-SERIES CHART</div>
          <svg viewBox="0 0 520 200" className="w-full" aria-hidden="true">
            {CHART_BARS.map((h, i) => (
              <g key={i}>
                <rect x={35 + i * 58} y={185 - h} width="14" height={h} rx="4" fill="#13A4A9" />
                <rect x={52 + i * 58} y={185 - h * 0.8} width="14" height={h * 0.8} rx="4" fill="#8E90C6" />
              </g>
            ))}
            <polyline points="42,105 100,80 158,55 216,70 274,38 332,26 390,40 448,18" fill="none" stroke="#F0C754" strokeWidth="3.5" />
          </svg>
        </div>
        <div className="lg:col-span-5 p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-3">
          <div className="text-xs font-mono text-slate-500">FRIENDS LEADERBOARD (A - Z)</div>
          {FRIENDS.map((f, idx) => (
            <div key={f.name} className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center" style={solidStyle(f.color)}>
                  {idx + 1}
                </span>
                <span className="font-bold text-sm">{f.name}</span>
              </div>
              <span className="font-mono text-xs font-semibold">{f.score}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
