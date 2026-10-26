import { useApp } from '../app/AppContext.jsx';

const APRIL_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

export default function HygienePage() {
  const { state, setState, notify } = useApp();

  const toggleDay = (d, booked) => {
    setState(p => ({ ...p, bookedDays: booked ? p.bookedDays.filter(x => x !== d) : [...p.bookedDays, d] }));
    notify(`Updated April ${d} disinfection slot`);
  };

  return (
    <section className="space-y-6 animate-page">
      <h2 className="text-3xl font-bold text-slate-900">08 Hygiene Status & Disinfection Booking</h2>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-7 rounded-[32px] bg-white border border-slate-200/80 flex flex-col sm:flex-row items-center gap-6">
          <svg viewBox="0 0 200 200" className="w-44 h-44 shrink-0" aria-hidden="true">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#13A4A9" strokeWidth="12" strokeDasharray="410 500" strokeLinecap="round" />
            <circle cx="100" cy="100" r="62" fill="none" stroke="#8E90C6" strokeWidth="12" strokeDasharray="280 500" strokeLinecap="round" />
            <circle cx="100" cy="100" r="44" fill="none" stroke="#F0C754" strokeWidth="12" strokeDasharray="190 500" strokeLinecap="round" />
            <circle cx="100" cy="100" r="26" fill="none" stroke="#F0A7AB" strokeWidth="12" strokeDasharray="110 500" strokeLinecap="round" />
          </svg>
          <div className="space-y-2.5 w-full">
            <div className="text-xs font-mono text-slate-500">DISINFECTION NEEDS BY PART</div>
            {state.disinfectionParts.map(p => (
              <div key={p.part} className="flex justify-between items-center text-xs">
                <span className="font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true"></span>
                  {p.part}
                </span>
                <span className="font-mono">{p.pct}% ({p.status})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-4">
          <div className="text-xs font-mono text-slate-500">BOOK HOSPITAL DISINFECTION // APRIL</div>
          <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-xs">
            {APRIL_DAYS.map(d => {
              const booked = state.bookedDays.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  aria-pressed={booked}
                  aria-label={`April ${d}${booked ? ' (booked)' : ''}`}
                  onClick={() => toggleDay(d, booked)}
                  className={`py-2 rounded-xl font-bold ${booked ? 'bg-[#0F8387] text-white' : 'bg-slate-50 hover:bg-slate-100'}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
