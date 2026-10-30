import { useApp } from '../app/AppContext.jsx';
import { solidStyle } from '../data/simStore.js';

/** 03 Choose a map: scene and valve-resistance selector. */
export default function MapsPage() {
  const { state, navigate, selectMap } = useApp();

  return (
    <section className="space-y-6 animate-page">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <span className="text-xs font-mono text-brand-teal-ink font-semibold">
            03 CHOOSE A MAP // SCENE &amp; RESISTANCE SELECTOR
          </span>
          <h2 className="text-3xl font-bold text-slate-900 mt-1">Pick a Scene &amp; Valve Level</h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('play')}
          className="px-6 py-3 rounded-2xl bg-brand-teal-deep text-white font-bold text-xs"
        >
          Play {state.lastMap.name} →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {state.maps.map(m => (
          <div
            key={m.id}
            className="rounded-[32px] bg-white p-7 border border-slate-200/80 flex flex-col justify-between space-y-6 shadow-sm"
          >
            <div className="space-y-4">
              <div
                className="h-36 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
                style={solidStyle(m.color)}
              >
                {m.name}
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>RESISTANCE: {m.kpa}&nbsp;kPa</span>
                <span>TARGET: {m.targetL}&nbsp;L</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{m.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => selectMap(m, true)}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-xs uppercase tracking-wider"
              style={solidStyle(m.color)}
            >
              Start Training on {m.name}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
