import { html, useState, useEffect, useRef } from '../lib/react.js';
import { createPortal } from 'https://esm.sh/react-dom@18.2.0';

const GROUPS = [
  { label: 'Train', ids: [2, 3, 4, 5] },
  { label: 'Together', ids: [6, 7] },
  { label: 'Care', ids: [8, 9, 10] },
  { label: 'You', ids: [11, 12] }
];
const CLOSE_DELAY_MS = 260;

/** AeroCare mark: doubles as the Home button. */
function HomeMark({ active, onClick }) {
  return html`
    <button
      onClick=${onClick}
      title="Home"
      className=${`group flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-2xl transition-colors ${active ? 'bg-[#13A4A9]/10' : 'hover:bg-slate-100'}`}
    >
      <span className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-[#13A4A9] to-[#96C7D2] flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v9.5h13V10" />
          <path d="M10 19.5v-5h4v5" />
        </svg>
      </span>
      <span className="hidden sm:flex flex-col items-start leading-none">
        <span className="text-sm font-bold text-slate-900">AeroCare</span>
        <span className=${`text-[10px] font-mono mt-0.5 transition-colors ${active ? 'text-[#0B7377]' : 'text-slate-500 group-hover:text-[#0B7377]'}`}>HOME</span>
      </span>
    </button>
  `;
}

/**
 * Page navigation that stays out of sight: hover the page pill or the left screen edge and the
 * drawer eases in from the left (tap the pill on touch screens). Leaving it closes it again.
 */
export function NavDrawer({ pages, currentPage, onNavigate }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const active = pages.find(p => p.id === currentPage) || pages[0];

  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  const go = id => {
    clearTimeout(closeTimer.current);
    setOpen(false);
    onNavigate(id);
  };

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(closeTimer.current);
    };
  }, []);

  let order = 0;
  const item = p => {
    const isActive = p.id === currentPage;
    const delay = open ? 60 + order++ * 28 : 0;
    return html`
      <button
        key=${p.id}
        onClick=${() => go(p.id)}
        style=${{ '--d': `${delay}ms` }}
        className=${`nav-item w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 ${
          isActive ? 'bg-[#13A4A9]/12 text-[#0B7377]' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center font-mono text-[11px] text-white font-bold" style=${{ backgroundColor: p.badge }}>
          ${p.code}
        </span>
        <span className="min-w-0">
          <span className=${`block text-sm leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>${p.name}</span>
          <span className="block text-[11px] text-slate-500 truncate">${p.subtitle}</span>
        </span>
      </button>
    `;
  };

  return html`
    <div className="flex items-center gap-2">
      <${HomeMark} active=${currentPage === 1} onClick=${() => go(1)} />

      <button
        onMouseEnter=${show}
        onMouseLeave=${hideSoon}
        onClick=${() => (open ? setOpen(false) : show())}
        aria-expanded=${open}
        aria-controls="nav-drawer"
        className=${`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-sm transition-colors ${
          open ? 'bg-[#1E2432] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
        }`}
      >
        <span className="w-2 h-2 rounded-full" style=${{ backgroundColor: active.badge }}></span>
        <span className=${`font-mono text-xs ${open ? 'text-[#F0C754]' : 'text-slate-600'}`}>${active.code}</span>
        <span className="font-semibold hidden sm:inline">${active.name}</span>
        <svg className=${`w-3.5 h-3.5 transition-transform duration-500 ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    ${createPortal(html`
    <!-- Left-edge hover zone with a faint handle hinting that something lives there -->
    <div className="fixed left-0 top-[72px] bottom-0 w-3 z-40 hidden md:flex items-center group" onMouseEnter=${show} onMouseLeave=${hideSoon}>
      <span className=${`ml-1 w-1 h-14 rounded-full bg-slate-400/40 transition-all duration-500 group-hover:h-24 group-hover:bg-[#13A4A9]/70 ${open ? 'opacity-0' : ''}`}></span>
    </div>

    <div className=${`nav-scrim fixed inset-0 top-[72px] z-30 ${open ? 'is-open' : ''}`} onClick=${() => setOpen(false)}></div>

    <nav
      id="nav-drawer"
      onMouseEnter=${show}
      onMouseLeave=${hideSoon}
      className=${`nav-drawer fixed left-3 top-[84px] bottom-3 z-50 w-[min(340px,calc(100vw-24px))] rounded-[28px] bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_30px_80px_rgba(30,36,50,0.18)] p-3 overflow-y-auto ${open ? 'is-open' : ''}`}
    >
      <button
        onClick=${() => go(1)}
        style=${{ '--d': open ? '30ms' : '0ms' }}
        className=${`nav-item w-full text-left p-3 rounded-2xl flex items-center gap-3 ${
          currentPage === 1 ? 'bg-gradient-to-r from-[#13A4A9] to-[#5fc0c4] text-white' : 'bg-[#13A4A9]/8 text-[#0B7377] hover:bg-[#13A4A9]/15'
        }`}
      >
        <span className=${`w-9 h-9 rounded-xl flex items-center justify-center ${currentPage === 1 ? 'bg-white/20' : 'bg-[#0F8387] text-white'}`}>
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" />
          </svg>
        </span>
        <span>
          <span className="block text-sm font-bold">Home</span>
          <span className=${`block text-[11px] ${currentPage === 1 ? 'text-white/80' : 'text-slate-600'}`}>Today, resume & pick a map</span>
        </span>
      </button>

      ${GROUPS.map(g => html`
        <div key=${g.label} className="mt-3">
          <div className="nav-item px-3 pb-1 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500" style=${{ '--d': open ? `${60 + order * 28}ms` : '0ms' }}>
            ${g.label}
          </div>
          ${g.ids.map(id => pages.find(p => p.id === id)).filter(Boolean).map(item)}
        </div>
      `)}
    </nav>
    `, document.body)}
  `;
}
