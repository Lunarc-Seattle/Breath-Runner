import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NAV_GROUPS } from '../app/routes.js';

const HOME_SLUG = 'home';
const CLOSE_DELAY_MS = 260;

function HouseIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
      <path d="M10 19.5v-5h4v5" />
    </svg>
  );
}

/** Breath Runner mark: doubles as the Home button. */
function HomeMark({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Home"
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-2xl transition-colors ${active ? 'bg-brand-teal/10' : 'hover:bg-slate-100'}`}
    >
      <span className="relative w-8 h-8 rounded-xl bg-linear-to-br/srgb from-brand-teal to-brand-blue flex items-center justify-center shadow-xs">
        <HouseIcon className="w-[18px] h-[18px] text-white" />
      </span>
      {/* Accessible name = the visible "Breath Runner home"; screen-reader-only text covers phones, where it's hidden. */}
      <span className="sr-only sm:hidden">Breath Runner home</span>
      <span className="hidden sm:flex flex-col items-start leading-none">
        <span className="text-sm font-bold text-slate-900">Breath Runner</span>{' '}
        <span
          className={`text-[11px] font-medium mt-1 transition-colors ${active ? 'text-brand-teal-ink' : 'text-slate-600 group-hover:text-brand-teal-ink'}`}
        >
          home
        </span>
      </span>
    </button>
  );
}

/**
 * Page navigation that stays out of sight: hover the page pill or the left screen edge and the
 * drawer eases in from the left (tap the pill on touch screens). Leaving it closes it again.
 */
export function NavDrawer({ routes, currentSlug, onNavigate }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const triggerRef = useRef(null);
  const navRef = useRef(null);
  const mouseOnTriggerRef = useRef(false);
  const active = routes.find(r => r.slug === currentSlug) || routes[0];
  const onHome = currentSlug === HOME_SLUG;

  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  const go = slug => {
    clearTimeout(closeTimer.current);
    setOpen(false);
    onNavigate(slug);
  };

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      // Focus inside the drawer would be lost once it turns inert: hand it back to the trigger.
      if (navRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(closeTimer.current);
    };
  }, []);

  // Closed drawer: out of the tab order and hidden from assistive tech.
  // React 19 treats `inert` as a boolean attribute: `true` renders inert="", and an empty string would be dropped.
  const hiddenProps = open ? {} : { inert: true, 'aria-hidden': 'true' };

  let order = 0;
  const item = r => {
    const isActive = r.slug === currentSlug;
    const delay = open ? 60 + order++ * 28 : 0;
    return (
      <button
        type="button"
        key={r.slug}
        onClick={() => go(r.slug)}
        aria-current={isActive ? 'page' : undefined}
        style={{ '--d': `${delay}ms` }}
        className={`nav-item w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 ${
          isActive ? 'bg-brand-teal/10 text-brand-teal-ink' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        <span
          className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center font-mono text-[11px] text-white font-bold"
          style={{ backgroundColor: r.badge }}
          aria-hidden="true"
        >
          {r.code}
        </span>
        <span className="min-w-0">
          <span className={`block text-sm leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>{r.name}</span>
          <span className="block text-[11px] text-slate-500 truncate">{r.subtitle}</span>
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <HomeMark active={onHome} onClick={() => go(HOME_SLUG)} />

        <button
          type="button"
          ref={triggerRef}
          onPointerEnter={e => {
            if (e.pointerType !== 'mouse') return;
            mouseOnTriggerRef.current = true;
            show();
          }}
          onPointerLeave={e => {
            if (e.pointerType !== 'mouse') return;
            mouseOnTriggerRef.current = false;
            hideSoon();
          }}
          onClick={() => {
            // With a mouse, hovering already opened the drawer: a click should keep it open, not toggle it shut.
            // Keyboard (Enter/Space) and touch taps toggle.
            if (mouseOnTriggerRef.current) return show();
            if (open) setOpen(false);
            else show();
          }}
          aria-expanded={open}
          aria-controls="nav-drawer"
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-sm transition-colors ${
            open ? 'bg-ink text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active.badge }} aria-hidden="true"></span>
          <span className="sr-only">Pages menu, current page </span>
          <span className={`font-mono text-xs ${open ? 'text-brand-yellow' : 'text-slate-600'}`}>
            {active.code}
          </span>{' '}
          <span className="font-semibold hidden sm:inline">{active.name}</span>
          <span className="sr-only sm:hidden">{active.name}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-500 ${open ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {createPortal(
        <>
          {/* Left-edge hover zone: its handle only shows while the pointer is on the edge */}
          <div
            className="fixed left-0 top-[72px] bottom-0 w-3 z-40 hidden md:flex items-center group"
            onMouseEnter={show}
            onMouseLeave={hideSoon}
            aria-hidden="true"
          >
            <span
              className={`ml-1 w-1 h-14 rounded-full bg-brand-teal/70 opacity-0 transition-all duration-500 group-hover:h-24 group-hover:opacity-100 ${open ? 'opacity-0!' : ''}`}
            ></span>
          </div>

          <div
            className={`nav-scrim fixed inset-0 top-[72px] z-30 ${open ? 'is-open' : ''}`}
            onClick={() => setOpen(false)}
            {...hiddenProps}
          ></div>

          <nav
            id="nav-drawer"
            ref={navRef}
            aria-label="Pages"
            onMouseEnter={show}
            onMouseLeave={hideSoon}
            {...hiddenProps}
            className={`nav-drawer fixed left-3 top-[84px] bottom-3 z-50 w-[min(340px,calc(100vw-24px))] rounded-[28px] bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_30px_80px_rgba(30,36,50,0.18)] p-3 overflow-y-auto ${open ? 'is-open' : ''}`}
          >
            <button
              type="button"
              onClick={() => go(HOME_SLUG)}
              aria-current={onHome ? 'page' : undefined}
              style={{ '--d': open ? '30ms' : '0ms' }}
              className={`nav-item w-full text-left p-3 rounded-2xl flex items-center gap-3 ${
                onHome
                  ? 'bg-linear-to-r/srgb from-brand-teal to-brand-teal-light text-white'
                  : 'bg-brand-teal/5 text-brand-teal-ink hover:bg-brand-teal/15'
              }`}
            >
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${onHome ? 'bg-white/20' : 'bg-brand-teal-deep text-white'}`}
              >
                <HouseIcon className="w-[18px] h-[18px]" />
              </span>
              <span>
                <span className="block text-sm font-bold">Home</span>
                <span className={`block text-[11px] ${onHome ? 'text-white/80' : 'text-slate-600'}`}>
                  Today&apos;s run, breath sync &amp; trainer
                </span>
              </span>
            </button>

            {NAV_GROUPS.map(group => (
              <div key={group} className="mt-3">
                <div
                  className="nav-item px-3 pb-1 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500"
                  style={{ '--d': open ? `${60 + order * 28}ms` : '0ms' }}
                >
                  {group}
                </div>
                {routes.filter(r => r.group === group).map(item)}
              </div>
            ))}
          </nav>
        </>,
        document.body
      )}
    </>
  );
}
