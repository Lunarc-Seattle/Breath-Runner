import { useApp } from '../app/AppContext.jsx';
import { brand } from '../styles/tokens.js';

const BEHAVIOR_SLIDERS = [
  { label: 'Inspiratory Volume (FVC)', left: '1.5L', right: '4.5L', pct: '82%', color: brand.teal.DEFAULT },
  { label: 'Expiratory Flow Stability', left: 'Unsteady', right: 'Locked', pct: '76%', color: brand.purple.DEFAULT },
  { label: 'Daily Training Consistency', left: '1 Day/wk', right: '7 Days/wk', pct: '90%', color: brand.yellow.DEFAULT }
];

const JOURNEY_STAGES = [
  { x: 60, y: 135, emoji: '😟', stage: '1. Post-Op Ward' },
  { x: 230, y: 110, emoji: '🙂', stage: '2. Pair Trainer' },
  { x: 400, y: 75, emoji: '😊', stage: '3. Forest Lv.1' },
  { x: 570, y: 50, emoji: '😄', stage: '4. Co-Op Friends' },
  { x: 740, y: 30, emoji: '🤩', stage: '5. Home Recovery' }
];

export default function JourneyPage() {
  const { state } = useApp();

  return (
    <section className="space-y-6 animate-page">
      <div>
        <span className="text-xs font-mono text-brand-purple-ink font-semibold">
          11 PATIENT RECOVERY JOURNEY & BEHAVIOR METRICS
        </span>
        <h2 className="text-3xl font-bold text-slate-900 mt-1">Rehabilitation Journey & Emotion Curve</h2>
      </div>

      {/* Top Persona & Behavior Sliders Card (Ref Image 1 Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-[32px] bg-white p-7 border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full bg-brand-purple/25 flex items-center justify-center text-2xl"
              aria-hidden="true"
            >
              🧑‍⚕️
            </div>
            <div>
              <div className="font-bold text-lg">{state.userName} (38 yrs)</div>
              <div className="text-xs text-slate-600">Thoracic Post-Op Recovery • Home User</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-brand-purple/10 text-xs text-slate-700 italic">
            &quot;Traditional 3-ball trainers felt repetitive and couldn&apos;t show my daily progress. With gamified
            maps and quantified FVC curves, I look forward to breathing training every morning!&quot;
          </div>
        </div>

        {/* Behavior Sliders */}
        <div className="lg:col-span-7 rounded-[32px] bg-white p-7 border border-slate-200/80 space-y-4">
          <div className="text-xs font-mono uppercase text-slate-500">Pulmonary Behavior & Progress Indicators</div>
          {BEHAVIOR_SLIDERS.map(s => (
            <div key={s.label} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>{s.label}</span>
                <span style={{ color: s.color }}>{s.pct}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 relative" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: s.pct, backgroundColor: s.color }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{s.left}</span>
                <span>{s.right}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Emotion & Recovery Journey Curve (Ref Image 1) */}
      <div className="rounded-[32px] bg-white p-8 border border-slate-200/80 space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-sm text-slate-800">5-Stage Post-Discharge Emotion & Lung Capacity Curve</span>
          <span className="text-xs font-mono text-brand-teal-ink">Stage 1 → Stage 5</span>
        </div>
        <svg
          viewBox="0 0 800 180"
          className="w-full"
          role="img"
          aria-label={`Recovery journey: ${JOURNEY_STAGES.map(pt => pt.stage).join(', ')}`}
        >
          <defs>
            <linearGradient id="journeyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={brand.purple.DEFAULT} stopOpacity="0.35" />
              <stop offset="100%" stopColor={brand.purple.DEFAULT} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M60 135 L230 110 L400 75 L570 50 L740 30 L740 165 L60 165 Z" fill="url(#journeyGrad)" />
          <polyline
            points="60,135 230,110 400,75 570,50 740,30"
            fill="none"
            stroke={brand.purple.DEFAULT}
            strokeWidth="3.5"
          />
          {JOURNEY_STAGES.map(pt => (
            <g key={pt.stage}>
              <circle cx={pt.x} cy={pt.y} r="14" fill={brand.yellow.DEFAULT} />
              <text x={pt.x - 8} y={pt.y + 5} fontSize="14">
                {pt.emoji}
              </text>
              <text x={pt.x - 42} y="168" fontSize="11" className="fill-slate-600" fontWeight="600">
                {pt.stage}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
