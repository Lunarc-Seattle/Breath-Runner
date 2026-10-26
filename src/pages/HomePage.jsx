import { useApp } from '../app/AppContext.jsx';
import { PDF_COLORS, solidStyle } from '../data/simStore.js';
import { brand, ink, status, withAlpha } from '../styles/tokens.js';

/** 01 Home: greeting, resume / pick a map, and inline Bluetooth trainer pairing. */
export default function HomePage() {
  const { state, navigate, selectMap, trainer } = useApp();

  return (
    <section className="space-y-8 animate-page">
      {/* Hero Greeting & Inline Bluetooth Pairing Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Warm Patient Greeting & "Resume or Pick Map?" Prompt */}
        <div className="lg:col-span-8 rounded-[32px] bg-white p-8 lg:p-10 border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {/* Decorative PDF Palette Blobs */}
          <div
            aria-hidden="true"
            className=" -right-12 -top-12 w-48 h-48 rounded-full opacity-20 pointer-events-none"
            style={{ backgroundColor: PDF_COLORS.purple, position: 'absolute' }}
          ></div>
          <div
            aria-hidden="true"
            className=" right-24 -bottom-16 w-40 h-40 rounded-full opacity-20 pointer-events-none"
            style={{ backgroundColor: PDF_COLORS.yellow, position: 'absolute' }}
          ></div>

          <div className="space-y-4 relative z-10">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: withAlpha(brand.teal.DEFAULT, 0x18), color: PDF_COLORS.tealInk }}
            >
              <span>🌿 Daily Lung Recovery Companion</span>
              <span aria-hidden="true">•</span>
              <span>Day 18 Streak</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Hi, {state.userName}! 👋
              <br />
              <span className="font-normal text-slate-600 text-2xl sm:text-3xl">
                What map would you like to practice today, or resume your last session?
              </span>
            </h1>
          </div>

          {/* Primary Action Cards: Resume Last Session VS Choose New Map */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 relative z-10">
            {/* Option A: Resume Last Session */}
            <div
              className="p-5 rounded-3xl text-white flex flex-col justify-between shadow-md"
              style={{ backgroundColor: PDF_COLORS.tealDeep }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span>RESUME LAST PRACTICE</span>
                  <span>{state.lastMap.progressPct}% DONE</span>
                </div>
                <div className="text-2xl font-bold">{state.lastMap.name}</div>
                <div className="text-xs">
                  Valve Resistance: {state.lastMap.valveKpa} kPa • Target: {state.lastMap.targetL}L
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('play')}
                className="mt-5 w-full py-3 rounded-2xl bg-white text-brand-teal-ink font-bold text-xs uppercase tracking-wider hover:bg-opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <span>▶ Resume {state.lastMap.name}</span>
              </button>
            </div>

            {/* Option B: QuickSpirometry or Schedule */}
            <div className="p-5 rounded-3xl bg-brand-purple/15 border border-brand-purple/30 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-brand-purple-ink font-semibold">
                  <span>TODAY&apos;S CHECKUP</span>
                  <span>PEAK: 3.89 L</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">Blow a Lung Test First?</div>
                <div className="text-xs text-slate-600">
                  Measure today&apos;s FVC &amp; FEV1 before jumping into a new map scene.
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('spirometry')}
                  className="flex-1 py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-wider transition-all"
                  style={{ backgroundColor: PDF_COLORS.purpleDeep }}
                >
                  Spirometry Lab
                </button>
                <button
                  type="button"
                  onClick={() => navigate('schedule')}
                  className="px-4 py-3 rounded-2xl bg-white text-slate-700 font-semibold text-xs border border-slate-200"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Inline Bluetooth Device Pairing & Status Card */}
        <div className="lg:col-span-4 rounded-[32px] bg-white p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500">Bluetooth Trainer</span>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: state.bleConnected
                    ? withAlpha(brand.teal.DEFAULT, 0x18)
                    : state.bleScanning
                      ? withAlpha(brand.purple.DEFAULT, 0x20)
                      : withAlpha(brand.pink.DEFAULT, 0x30),
                  color: state.bleConnected ? PDF_COLORS.tealInk : state.bleScanning ? brand.purple.ink : status.error
                }}
              >
                {state.bleScanning ? 'SEARCHING…' : state.bleConnected ? '● CONNECTED' : 'NOT CONNECTED'}
              </span>
            </div>

            {/* Rhino Coral-Pink Breathing Trainer Illustration */}
            <div className="py-3 flex justify-center">
              <svg viewBox="0 0 240 165" className="w-48 h-36" aria-hidden="true">
                <circle cx="120" cy="82" r="68" fill={brand.purple.DEFAULT} fillOpacity="0.18" />
                <circle cx="165" cy="115" r="35" fill={brand.yellow.DEFAULT} fillOpacity="0.35" />
                <path
                  d="M85 60 C85 42 145 42 160 60 L182 60 L182 82 L158 85 L138 142 C134 154 110 154 108 140 L102 88 L85 78 Z"
                  fill={brand.pink.DEFAULT}
                  stroke={ink}
                  strokeWidth="1.5"
                />
                <rect x="178" y="64" width="16" height="14" rx="3" fill={brand.teal.DEFAULT} />
              </svg>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Device</span>
                <span className="font-mono font-semibold">{state.deviceName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Battery Level</span>
                <span className="font-mono font-bold text-brand-teal-ink">
                  {state.batteryPct !== null ? `${state.batteryPct}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Mouthpiece Status</span>
                <span className="font-mono text-brand-purple-ink">
                  {state.bleConnected ? 'Sterile (UV-C OK)' : '—'}
                </span>
              </div>
            </div>

            {state.bleError && !state.bleConnected && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-brand-yellow/15 border border-brand-yellow/50 text-xs text-slate-700 leading-relaxed"
              >
                <div className="font-bold text-brand-yellow-ink mb-0.5">Trainer not found</div>
                {state.bleError}
              </div>
            )}
            {!state.bleConnected && (
              <button
                type="button"
                onClick={() => navigate('play')}
                className="text-xs font-semibold text-brand-teal-ink hover:underline"
              >
                No trainer? Play Forest · Level 1 in free-trial mode →
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={state.bleConnected ? trainer.disconnect : trainer.pair}
            disabled={state.bleScanning}
            className="mt-4 w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider text-white transition-all shadow-sm"
            style={{ backgroundColor: state.bleScanning ? PDF_COLORS.purpleDeep : ink }}
          >
            {state.bleScanning
              ? 'Searching for trainer…'
              : state.bleConnected
                ? 'Disconnect trainer'
                : 'Pair Bluetooth trainer'}
          </button>
        </div>
      </div>

      {/* Bottom Section: "Which Map Would You Like to Blow Today?" */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Pick a Map to Practice Today</h2>
            <p className="text-xs text-slate-600">
              Click any scene below to load its resistance valve profile and start training
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('maps')}
            className="text-xs font-semibold text-brand-teal-ink hover:underline"
          >
            View Full Map Catalog (03) →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {state.maps.map(m => (
            <div
              key={m.id}
              className={`rounded-[28px] bg-white p-6 border transition-all flex flex-col justify-between shadow-sm ${
                state.lastMap.id === m.id ? 'border-2 border-brand-teal' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={solidStyle(m.color)}>
                    {m.tag}
                  </span>
                  <span className="font-mono text-xs text-slate-500">{m.kpa} kPa</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">{m.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{m.desc}</p>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-600">Target: {m.targetL}L</span>
                <button
                  type="button"
                  onClick={() => selectMap(m, true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
                  style={solidStyle(m.color)}
                >
                  Practice Map →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
