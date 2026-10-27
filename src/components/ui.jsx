/**
 * Small building blocks of the web UI design (cards, chips, the sample-data tag), so every
 * page draws them the same way. Colours come from tailwind classes generated from styles/tokens.js.
 */

const CARD_TONES = {
  plain: 'bg-white border border-slate-200/80',
  warm: 'bg-surface-warm',
  lavender: 'bg-surface-lavender',
  coral: 'bg-surface-coral'
};

export function Card({ as: Tag = 'article', tone = 'plain', className = '', children, ...rest }) {
  return (
    <Tag className={`rounded-[22px] p-5 sm:p-6 min-w-0 ${CARD_TONES[tone]} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Title + caption on the left, an optional action on the right. */
export function CardHead({ id, title, caption, children, className = 'mb-4' }) {
  return (
    <div className={`flex justify-between items-start gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 id={id} className="text-[17px] font-semibold leading-snug text-slate-900">
          {title}
        </h2>
        {caption && <p className="text-[13px] text-slate-600 mt-0.5">{caption}</p>}
      </div>
      {children}
    </div>
  );
}

// Each tint carries the ink of its own hue (see the contrast rules in styles/tokens.js).
const CHIP_TONES = {
  teal: 'bg-surface-mint text-brand-teal-ink',
  coral: 'bg-surface-coral text-brand-pink-ink',
  sun: 'bg-surface-sun text-brand-yellow-ink',
  lavender: 'bg-surface-lavender text-brand-purple-ink',
  plain: 'bg-white text-slate-700'
};

export function Chip({ tone = 'plain', dot = false, className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap ${CHIP_TONES[tone]} ${className}`}
    >
      {dot && <span aria-hidden="true" className="w-2 h-2 rounded-full bg-current shrink-0" />}
      {children}
    </span>
  );
}

/** Marks anything that is demo content, not the patient's own data. */
export function SampleTag({ children = 'Sample data' }) {
  return (
    <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-dashed border-slate-400 text-[11px] font-mono uppercase tracking-wider text-slate-600 whitespace-nowrap">
      {children}
    </span>
  );
}

export function Avatar({ initials, tone = 'teal', size = 'md' }) {
  const tones = {
    teal: 'bg-surface-mint text-brand-teal-ink',
    sun: 'bg-surface-sun text-brand-yellow-ink',
    coral: 'bg-surface-coral text-brand-pink-ink',
    lavender: 'bg-surface-lavender text-brand-purple-ink',
    white: 'bg-white text-brand-purple-ink'
  };
  const sizes = { md: 'w-9 h-9 text-[13px]', lg: 'w-11 h-11 text-[15px]' };
  return (
    <span
      aria-hidden="true"
      className={`${sizes[size]} ${tones[tone]} rounded-full shrink-0 grid place-items-center font-semibold`}
    >
      {initials}
    </span>
  );
}

/** Battery outline with a fill proportional to `pct`. */
export function BatteryIcon({ pct, low = false }) {
  return (
    <svg viewBox="0 0 22 12" className="w-[22px] h-3" aria-hidden="true">
      <rect x=".75" y=".75" width="18" height="10.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect
        x="3"
        y="3"
        width={Math.max(1.2, (14.7 * pct) / 100)}
        height="6"
        rx="1"
        className={low ? 'fill-brand-pink' : 'fill-brand-teal'}
      />
      <rect x="20" y="4" width="1.6" height="4" rx=".8" fill="currentColor" />
    </svg>
  );
}

/** Pill buttons where exactly one is pressed (time range, filters). */
export function Segmented({ label, options, value, onChange }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex p-1 rounded-full bg-white shadow-[inset_0_0_0_1px_theme(colors.slate.200)]"
    >
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 px-4 rounded-full text-sm transition-colors ${
            value === o.value
              ? 'bg-surface-mint text-brand-teal-ink font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-brand-teal-deep hover:bg-brand-teal-ink text-white text-[15px] font-semibold whitespace-nowrap transition-colors disabled:opacity-60',
  soft: 'inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-white text-brand-teal-ink text-[15px] font-semibold whitespace-nowrap shadow-[inset_0_0_0_1px_theme(colors.slate.200)] hover:shadow-[inset_0_0_0_1.5px_theme(colors.brand.teal.DEFAULT)] transition-shadow disabled:opacity-60',
  link: 'text-sm font-semibold text-brand-teal-ink hover:underline whitespace-nowrap'
};
