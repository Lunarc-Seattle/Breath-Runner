import { AppProvider, useApp } from './app/AppContext.jsx';
import { useHashRoute } from './app/useHashRoute.js';
import { ROUTES } from './app/routes.js';
import { PAGES } from './pages/index.js';
import { NavDrawer } from './components/NavDrawer.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { VersionMenu } from './components/VersionMenu.jsx';

function TrainerPill() {
  const { state, trainer } = useApp();
  const label = state.bleScanning
    ? 'Searching…'
    : state.bleConnected
      ? `${state.deviceName}${state.batteryPct !== null ? ` • ${state.batteryPct}%` : ''}`
      : 'No trainer · Pair';
  return (
    <button
      type="button"
      onClick={state.bleConnected ? undefined : trainer.pair}
      disabled={state.bleScanning}
      title={state.bleConnected ? 'Trainer connected' : 'Pair your AeroCare trainer'}
      className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-mono font-medium transition-colors ${
        state.bleConnected
          ? 'bg-brand-teal/10 text-brand-teal-ink hover:bg-brand-teal/20'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      <span
        aria-hidden="true"
        className={`w-2 h-2 rounded-full ${state.bleConnected ? 'bg-brand-teal-deep' : state.bleScanning ? 'bg-brand-purple-deep animate-pulse' : 'bg-slate-400'}`}
      />
      <span>{label}</span>
    </button>
  );
}

function Shell({ slug }) {
  const { state, toast, navigate } = useApp();
  const Page = PAGES[slug];

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-10 py-3.5">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-4">
          <NavDrawer routes={ROUTES} currentSlug={slug} onNavigate={navigate} />
          <div className="flex items-center gap-3">
            <VersionMenu />
            <TrainerPill />
            <button
              type="button"
              onClick={() => navigate('profile')}
              className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-2xl bg-brand-purple/15 hover:bg-brand-purple/25 transition-colors"
            >
              <span
                aria-hidden="true"
                className="w-7 h-7 rounded-full bg-brand-purple-deep text-white flex items-center justify-center text-xs font-bold"
              >
                XM
              </span>
              <span className="text-xs font-semibold text-slate-700">{state.userName}</span>
            </button>
          </div>
        </div>
      </header>

      <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50">
        {toast && (
          <div className="bg-ink text-white px-5 py-3.5 rounded-2xl shadow-xl border border-white/15 flex items-center gap-3 font-mono text-xs max-w-md">
            <span aria-hidden="true" className="w-2.5 h-2.5 shrink-0 rounded-full bg-brand-yellow" />
            <span>{toast}</span>
          </div>
        )}
      </div>

      <main id="main" className="max-w-[1380px] w-full mx-auto px-4 lg:px-10 py-8 flex-1">
        {/* Reset the boundary when the page changes so one broken page doesn't stick. */}
        <ErrorBoundary key={slug} onHome={() => navigate('home')}>
          <Page />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  const [slug, navigate] = useHashRoute();
  return (
    <AppProvider navigate={navigate}>
      <Shell slug={slug} />
    </AppProvider>
  );
}
