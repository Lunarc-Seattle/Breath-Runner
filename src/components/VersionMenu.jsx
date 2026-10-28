import { useState, useEffect, useRef } from 'react';
import { VERSIONS, CURRENT_VERSION, SITE_URL, REPO_URL } from '../app/versions.js';

/** Header chip naming this version ("v2"), with a menu linking to every earlier version and its source. */
export function VersionMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = e => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = e => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="version-menu"
        title="Versions of this app"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-mono font-medium transition-colors ${
          open ? 'bg-ink text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        <span className="sr-only">Version </span>
        {CURRENT_VERSION.id}
        <span className="hidden md:inline"> · versions</span>
      </button>

      {open && (
        <div
          id="version-menu"
          className="absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-32px))] rounded-3xl bg-white border border-slate-200/80 shadow-[0_30px_80px_rgba(30,36,50,0.18)] p-3 z-50"
        >
          <p className="px-2 pt-1 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">
            Every version stays playable
          </p>
          <ul>
            {VERSIONS.map(v => {
              const isCurrent = v === CURRENT_VERSION;
              return (
                <li key={v.id}>
                  <a
                    href={isCurrent ? SITE_URL : `${SITE_URL}${v.id}/`}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`block px-3 py-2.5 rounded-2xl ${isCurrent ? 'bg-brand-teal/10' : 'hover:bg-slate-100'}`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {v.id}
                        {isCurrent && <span className="ml-2 text-[11px] font-medium text-brand-teal-ink">current</span>}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{v.date}</span>
                    </span>
                    <span className="block text-xs text-slate-600 mt-0.5">{v.summary}</span>
                  </a>
                </li>
              );
            })}
          </ul>
          <a
            href={`${REPO_URL}/tags`}
            className="block mt-1 px-3 py-2 text-xs font-semibold text-brand-teal-ink hover:underline"
          >
            Source of each version on GitHub →
          </a>
        </div>
      )}
    </div>
  );
}
