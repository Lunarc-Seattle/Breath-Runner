import { useState } from 'react';
import { useApp } from '../app/AppContext.jsx';
import { brand } from '../styles/tokens.js';
import { BatteryIcon, btn, Card, CardHead, Chip, SampleTag } from '../components/ui.jsx';

const ASSETS = `${import.meta.env.BASE_URL}assets/`;
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const LONG_DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const LONG = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' });
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOTS = ['9 to 11 AM', '1 to 3 PM', '4 to 6 PM'];
const BOOKING_DAYS_AHEAD = 31;

// Ring colours per part, and the text tone of each state (see the contrast rules in styles/tokens.js).
const PART_COLORS = {
  coral: brand.pink.DEFAULT,
  sun: brand.yellow.DEFAULT,
  lavender: brand.purple.DEFAULT,
  teal: brand.teal.DEFAULT
};
const STATE_TONES = {
  warn: 'text-brand-pink-ink font-semibold',
  soon: 'text-brand-yellow-ink font-semibold',
  ok: 'text-slate-600'
};

const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) => !!a && !!b && startOfDay(a).getTime() === startOfDay(b).getTime();
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Sample availability: weekdays from tomorrow, for the next month. */
function isAvailable(d, today) {
  const wd = d.getDay();
  return d > today && wd !== 0 && wd !== 6 && d <= addDays(today, BOOKING_DAYS_AHEAD);
}
/** Sample "fully booked" slots, fixed per date so the calendar doesn't change between visits. */
function fullSlots(d) {
  const k = d.getDate() + d.getMonth();
  return k % 5 === 0 ? [0, 1] : k % 3 === 0 ? [2] : [];
}
function firstAvailable(today) {
  for (let i = 1; i <= BOOKING_DAYS_AHEAD; i++) {
    const d = addDays(today, i);
    if (isAvailable(d, today)) return d;
  }
  return addDays(today, 1);
}
const openSlot = (d, slot) => {
  const full = fullSlots(d);
  return full.includes(SLOTS.indexOf(slot)) ? SLOTS.find((_, i) => !full.includes(i)) : slot;
};

function DeviceCard({ state, trainer, lease }) {
  const [status, setStatus] = useState('');
  const connected = state.bleConnected;
  const today = startOfDay(new Date());
  const daysLeft = Math.max(0, lease.quotaDays - lease.usedDays);
  const since = addDays(today, -lease.usedDays);

  return (
    <Card flush className="grid grid-cols-1 md:grid-cols-2 overflow-hidden" aria-labelledby="device-title">
      <div className="relative min-h-[240px] md:min-h-[300px] overflow-hidden bg-neutral-200">
        <img
          src={`${ASSETS}ui/trainer.webp`}
          alt=""
          width="800"
          height="614"
          className="absolute inset-0 w-full h-full object-contain scale-110 trainer-photo-mask"
        />
      </div>
      <div className="p-6 sm:px-7 sm:py-6">
        <h2 id="device-title" className="text-[22px] font-semibold tracking-tight text-slate-900">
          {connected ? state.deviceName : 'AeroCare trainer'}
        </h2>
        <div className="flex flex-wrap gap-2 mt-3">
          {state.bleScanning ? (
            <Chip tone="lavender" dot>
              Searching…
            </Chip>
          ) : connected ? (
            <>
              <Chip tone="teal" dot>
                Connected
              </Chip>
              {state.batteryPct !== null && (
                <Chip tone="canvas">
                  <BatteryIcon pct={state.batteryPct} low={state.batteryPct < 20} />
                  Battery {state.batteryPct}%
                </Chip>
              )}
            </>
          ) : (
            <Chip tone="canvas">Not paired</Chip>
          )}
        </div>
        {state.bleError && !connected && (
          <p role="alert" className="mt-3 text-[13px] text-brand-pink-ink">
            {state.bleError}
          </p>
        )}
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 mt-4 text-sm">
          <dt className="text-slate-600">Level</dt>
          <dd className="text-slate-900">{state.lastMap.name}</dd>
          <dt className="text-slate-600">Resistance</dt>
          <dd className="text-slate-900">{state.lastMap.valveKpa} kPa</dd>
        </dl>
        <button
          type="button"
          onClick={connected ? trainer.disconnect : trainer.pair}
          disabled={state.bleScanning}
          className={`${btn.soft} mt-4 h-10 px-5 text-sm!`}
        >
          {connected ? 'Disconnect trainer' : 'Pair Bluetooth trainer'}
        </button>

        <div className="mt-5 pt-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[13px] text-slate-600">
              On loan from {lease.hospital} since {LONG.format(since)}
            </span>
            <SampleTag />
          </div>
          <div className="flex justify-between items-baseline gap-3 mb-2.5 text-sm">
            <strong className="font-semibold text-slate-900">Return by {SHORT.format(addDays(today, daysLeft))}</strong>
            <span className="text-slate-600 tabular-nums">{daysLeft} days left</span>
          </div>
          <div
            className="h-2.5 rounded-full bg-slate-100 overflow-hidden"
            role="img"
            aria-label={`${lease.usedDays} of ${lease.quotaDays} loan days used`}
          >
            <span
              className="block h-full rounded-full bg-brand-teal"
              style={{ width: `${Math.min(100, (lease.usedDays / lease.quotaDays) * 100)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setStatus('Extension requests are not connected in this demo, so nothing was sent.')}
            className={`${btn.soft} mt-4 h-10 px-5 text-sm!`}
          >
            Ask to extend
          </button>
          <p role="status" className="mt-2.5 text-sm text-brand-teal-ink empty:hidden">
            {status}
          </p>
        </div>
      </div>
    </Card>
  );
}

function HygieneCard({ hygiene }) {
  const today = startOfDay(new Date());
  const last = addDays(today, -hygiene.daysSince);
  return (
    <Card className="flex flex-col" aria-labelledby="hygiene-title">
      <CardHead
        id="hygiene-title"
        title="Hygiene"
        caption={`${hygiene.daysSince} days since the last disinfection`}
        className="mb-1.5"
      >
        <SampleTag />
      </CardHead>
      <div className="grid grid-cols-1 sm:grid-cols-[172px_minmax(0,1fr)] gap-6 items-center justify-items-center sm:justify-items-stretch mt-1.5">
        <div className="relative w-[172px] h-[172px]">
          <svg viewBox="0 0 172 172" className="w-full h-full" aria-hidden="true">
            {hygiene.parts.map((p, i) => {
              const r = 80 - i * 12.5;
              const c = 2 * Math.PI * r;
              return (
                <g key={p.part}>
                  <circle cx="86" cy="86" r={r} fill="none" strokeWidth="8" className="stroke-slate-100" />
                  <circle
                    cx="86"
                    cy="86"
                    r={r}
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    stroke={PART_COLORS[p.color]}
                    strokeDasharray={`${c * p.clean} ${c}`}
                    transform="rotate(-90 86 86)"
                  />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <strong className="text-[26px] font-semibold leading-none tabular-nums text-slate-900">
              {hygiene.cleanPct}%
            </strong>
            <span className="text-xs text-slate-600 mt-1">clean</span>
          </div>
        </div>
        <ul className="w-full flex flex-col gap-3 text-sm">
          {hygiene.parts.map(p => (
            <li key={p.part} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2.5">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-[3px]"
                style={{ backgroundColor: PART_COLORS[p.color] }}
              />
              <span className="text-slate-900">{p.part}</span>
              <span className={`text-[13px] ${STATE_TONES[p.tone]}`}>{p.state}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-auto pt-4 text-[13px] text-slate-600">
        Last disinfected on {LONG.format(last)}. Daily breathing leaves moisture in the mouthpiece and filter first, so
        they need cleaning sooner.
      </p>
    </Card>
  );
}

function BookingCard({ deviceName, booking, onBook }) {
  const today = startOfDay(new Date());
  const [selected, setSelected] = useState(() => booking?.date || firstAvailable(today));
  const [slot, setSlot] = useState(() => openSlot(selected, booking?.slot || SLOTS[0]));
  const [monthOffset, setMonthOffset] = useState(() =>
    selected.getMonth() !== today.getMonth() || selected.getFullYear() !== today.getFullYear() ? 1 : 0
  );
  const [status, setStatus] = useState('');

  const month = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const full = fullSlots(selected);

  const pickDay = d => {
    setSelected(d);
    setSlot(s => openSlot(d, s));
    setStatus('');
  };
  const book = () => {
    onBook({ date: selected, slot });
    setStatus(
      `Disinfection booked for ${LONG_DAY.format(selected)}, ${slot}. This is a demo: the care team is not notified.`
    );
  };

  return (
    <Card aria-labelledby="book-title">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] gap-7 lg:gap-11">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 id="book-title" className="text-[17px] font-semibold text-slate-900">
              Book a disinfection
            </h2>
            <SampleTag />
          </div>
          <p className="mt-1 mb-4 text-sm text-slate-600">
            Pick a day and a time for the care team to disinfect your trainer.
          </p>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-base font-semibold text-slate-900" aria-live="polite">
              {MONTH.format(month)}
            </h3>
            <div className="flex gap-1.5">
              {[
                ['Previous month', 0, 'm14.5 6-6 6 6 6'],
                ['Next month', 1, 'm9.5 6 6 6-6 6']
              ].map(([label, offset, d]) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  disabled={monthOffset === offset}
                  onClick={() => setMonthOffset(offset)}
                  className="w-9 h-9 grid place-items-center rounded-xl bg-canvas text-slate-700 disabled:opacity-40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={d} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map(w => (
              <span key={w} aria-hidden="true" className="text-xs text-slate-600 pb-0.5">
                {w}
              </span>
            ))}
            {Array.from({ length: month.getDay() }, (_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
              const available = isAvailable(d, today);
              const pressed = sameDay(d, selected);
              const isToday = sameDay(d, today);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={pressed}
                  disabled={!available}
                  aria-label={`${LONG_DAY.format(d)}${available ? '' : ', not available'}`}
                  onClick={() => pickDay(d)}
                  className={`h-9 rounded-xl text-sm tabular-nums ${
                    pressed
                      ? 'bg-brand-teal-deep text-white font-semibold'
                      : available
                        ? 'bg-surface-mint text-brand-teal-ink hover:shadow-[inset_0_0_0_1.5px_var(--color-brand-teal)]'
                        : 'text-slate-500'
                  } ${isToday ? 'shadow-[inset_0_0_0_1.5px_var(--color-slate-500)]' : ''}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">{LONG_DAY.format(selected)}</h3>
          <p className="text-[13px] text-slate-600 mt-1">Choose a time</p>
          <div role="group" aria-label="Times" className="flex flex-wrap gap-2.5 mt-4 mb-5">
            {SLOTS.map((s, i) => {
              const isFull = full.includes(i);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={s === slot}
                  disabled={isFull}
                  aria-label={isFull ? `${s}, full` : undefined}
                  onClick={() => {
                    setSlot(s);
                    setStatus('');
                  }}
                  className={`h-[42px] px-[18px] rounded-full text-sm ${
                    s === slot
                      ? 'bg-surface-mint text-brand-teal-ink font-semibold shadow-[inset_0_0_0_1.5px_var(--color-brand-teal)]'
                      : isFull
                        ? 'bg-canvas text-slate-600 line-through'
                        : 'bg-white text-slate-900 shadow-[inset_0_0_0_1px_var(--color-slate-200)]'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 py-4 mb-4 border-y border-slate-200/80 text-sm">
            <dt className="text-slate-600">Trainer</dt>
            <dd className="text-slate-900">{deviceName}</dd>
            <dt className="text-slate-600">Parts</dt>
            <dd className="text-slate-900">Mouthpiece, filter, core and body</dd>
            <dt className="text-slate-600">Reminder</dt>
            <dd className="text-slate-900">The evening before</dd>
          </dl>
          <button type="button" onClick={book} className={btn.primary}>
            {booking ? 'Change booking' : 'Book disinfection'}
          </button>
          <p role="status" className="mt-3 text-sm text-brand-teal-ink empty:hidden">
            {status}
          </p>
        </div>
      </div>
    </Card>
  );
}

/** 08 Trainer & care: the paired trainer, its loan, hygiene and disinfection booking (loan and hygiene are sample data). */
export default function TrainerPage() {
  const { state, setState, trainer } = useApp();

  return (
    <section className="animate-page" aria-labelledby="trainer-page-title">
      <header className="mb-6">
        <h1
          id="trainer-page-title"
          className="text-[26px] md:text-[30px] font-semibold leading-tight tracking-tight text-slate-900"
        >
          Trainer &amp; care
        </h1>
        <p className="mt-1.5 text-slate-600">
          Connection comes from Web Bluetooth. The loan, hygiene and booking calendar are sample data.
        </p>
      </header>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 mb-6">
        <DeviceCard state={state} trainer={trainer} lease={state.lease} />
        <HygieneCard hygiene={state.hygiene} />
      </div>
      <BookingCard
        deviceName={state.bleConnected ? state.deviceName : 'AeroCare trainer'}
        booking={state.disinfectionBooking}
        onBook={booking => setState(p => ({ ...p, disinfectionBooking: booking }))}
      />
    </section>
  );
}
