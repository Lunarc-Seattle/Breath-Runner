import { useApp } from '../app/AppContext.jsx';

export default function RentalPage() {
  const { state, setState, notify } = useApp();

  const extendLease = () => {
    setState(p => ({ ...p, leaseQuotaDays: p.leaseQuotaDays + 15 }));
    notify('Extended rental by +15 days');
  };

  return (
    <section className="space-y-6 animate-page">
      <h2 className="text-3xl font-bold text-slate-900">09 Shared Hospital Device Rental</h2>
      <div className="p-8 rounded-[32px] bg-white border border-slate-200/80 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-[#96C7D2]/25 text-[#0B7377] text-xs font-bold">
            ACTIVE LEASE • PEKING UNIV. HOSPITAL
          </span>
          <div className="text-2xl font-bold">
            Day {state.leaseUsedDays} of {state.leaseQuotaDays} Days
          </div>
          <p className="text-xs text-slate-600">Refundable Deposit Paid: ¥228.00 • Daily Shared Rate: ¥12.00/day</p>
        </div>
        <button
          type="button"
          onClick={extendLease}
          className="px-6 py-3.5 rounded-2xl bg-[#0F8387] text-white font-bold text-xs"
        >
          Extend Lease (+15 Days)
        </button>
      </div>
    </section>
  );
}
