import { useApp } from '../app/AppContext.jsx';

export default function DoctorPage() {
  const { state } = useApp();

  return (
    <section className="space-y-6 animate-page">
      <h2 className="text-3xl font-bold text-slate-900">10 Physician Guidance & Automated Telemetry CI</h2>
      <div className="p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-3 font-mono text-xs">
        {state.regressionRuns.map(r => (
          <div key={r.id} className="p-4 rounded-2xl bg-slate-50 flex justify-between items-center">
            <span>
              {r.id} — {r.target} ({r.steps} samples)
            </span>
            <span className="px-3 py-1 rounded-full bg-[#13A4A9]/15 text-[#0B7377] font-bold">
              {r.status} (Drift: {r.drift})
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
