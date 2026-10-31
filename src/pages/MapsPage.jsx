import { useApp } from '../app/AppContext.jsx';
import { btn, Card, Chip, PageHeader } from '../components/ui.jsx';

const HERO_ART = `${import.meta.env.BASE_URL}assets/ui/hero-forest.webp`;

// Only the forest has its own art so far: the other two scenes re-tint it until they get theirs.
const SCENE_TINT = {
  'MAP-FOREST-01': 'none',
  'MAP-CANYON-02': 'sepia(0.75) saturate(1.7) hue-rotate(-12deg) brightness(1.04)',
  'MAP-GLACIER-03': 'hue-rotate(38deg) saturate(0.75) brightness(1.1)'
};

/** 03 Choose a map: scene and valve-resistance selector. */
export default function MapsPage() {
  const { state, navigate, selectMap } = useApp();

  return (
    <section className="animate-page" aria-labelledby="maps-title">
      <PageHeader
        id="maps-title"
        title="Choose a map"
        caption="Each scene sets the trainer's valve resistance and your inhale target."
      >
        <button type="button" onClick={() => navigate('play')} className={btn.primary}>
          Play {state.lastMap.name}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {state.maps.map((m, i) => {
          const current = m.id === state.lastMap.id;
          return (
            <Card
              key={m.id}
              flush
              aria-labelledby={`map-${m.id}`}
              className={`flex flex-col overflow-hidden ${current ? 'ring-2 ring-brand-teal-deep ring-offset-2 ring-offset-canvas' : ''}`}
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-canvas">
                <img
                  src={HERO_ART}
                  alt=""
                  width="2400"
                  height="1108"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover object-[62%_60%] scale-125"
                  style={{ filter: SCENE_TINT[m.id] }}
                />
                <div className="absolute left-4 top-4 flex gap-2">
                  <Chip tone="plain">Level {i + 1}</Chip>
                  {current && <Chip tone="teal">Selected</Chip>}
                </div>
              </div>
              <div className="p-5 sm:p-6 flex flex-col gap-4 flex-1">
                <div>
                  <h2 id={`map-${m.id}`} className="text-[17px] font-semibold text-slate-900">
                    {m.name}
                  </h2>
                  <p className="text-[13px] font-medium text-brand-teal-ink mt-0.5">{m.tag}</p>
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-canvas px-4 py-3">
                    <dt className="text-xs text-slate-600">Resistance</dt>
                    <dd className="text-lg font-semibold tabular-nums text-slate-900">{m.kpa}&nbsp;kPa</dd>
                  </div>
                  <div className="rounded-2xl bg-canvas px-4 py-3">
                    <dt className="text-xs text-slate-600">Inhale target</dt>
                    <dd className="text-lg font-semibold tabular-nums text-slate-900">{m.targetL}&nbsp;L</dd>
                  </div>
                </dl>
                <p className="text-sm text-slate-600 leading-relaxed flex-1">{m.desc}</p>
                <button
                  type="button"
                  onClick={() => selectMap(m, true)}
                  aria-label={`Play ${m.name}`}
                  className={`${current ? btn.primary : btn.soft} w-full`}
                >
                  Play this map
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
