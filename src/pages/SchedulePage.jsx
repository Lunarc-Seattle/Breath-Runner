import { useApp } from '../app/AppContext.jsx';

/** 02 Today's schedule: pinned notes and a toggleable task timeline. */
export default function SchedulePage() {
  const { state, setState, notify, navigate } = useApp();

  const toggleTask = task => {
    setState(p => ({
      ...p,
      scheduleTasks: p.scheduleTasks.map(t => (t.id === task.id ? { ...t, done: !t.done } : t))
    }));
    notify(`Toggled task: ${task.title}`);
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-page">
      {/* Left 4 Cols: Weekly Pinned & Mini Calendar */}
      <div className="lg:col-span-4 rounded-[32px] bg-white p-7 border border-slate-200/80 space-y-6">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-slate-800">Weekly Pinned</span>
          <span className="text-xs font-semibold text-brand-teal-ink">Peking Univ. Rehab</span>
        </div>

        <div className="p-5 rounded-3xl bg-brand-yellow/20 border border-brand-yellow/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-yellow text-slate-900 font-bold text-[10px]">
              DOCTOR NOTE
            </span>
            <span className="text-xs font-mono text-slate-600">Dr. Chen</span>
          </div>
          <div className="font-bold text-base text-slate-900">Call doctor for spirometry review</div>
          <p className="text-xs text-slate-600">Share your 3.89L FVC curve and adjust valve resistance to 2.0 kPa.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="w-8 h-8 rounded-xl bg-brand-pink/30 flex items-center justify-center">
              🧼
            </span>
            <div>
              <div className="text-xs font-bold">Mouthpiece Sterilization</div>
              <div className="text-[11px] text-slate-500">Booked for April 19</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('hygiene')}
            className="text-xs font-semibold text-brand-teal-ink"
          >
            View →
          </button>
        </div>
      </div>

      {/* Center/Right 8 Cols: Today's Schedule Timeline */}
      <div className="lg:col-span-8 rounded-[32px] bg-white p-8 border border-slate-200/80 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Today&apos;s Breathing Schedule</h2>
            <p className="text-sm font-semibold text-brand-yellow">Sunday, October 25</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('play')}
            className="px-5 py-2.5 rounded-2xl bg-brand-yellow text-slate-900 font-bold text-xs"
          >
            + Start Scheduled Session
          </button>
        </div>

        <div className="space-y-3.5">
          {state.scheduleTasks.map(task => (
            <button
              type="button"
              key={task.id}
              role="checkbox"
              aria-checked={task.done}
              onClick={() => toggleTask(task)}
              className={`w-full text-left p-5 rounded-3xl cursor-pointer transition-all flex items-center justify-between ${
                task.highlight
                  ? 'bg-brand-yellow text-slate-900 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={task.done}
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                  className="w-4 h-4 rounded accent-brand-teal pointer-events-none"
                />
                <div>
                  <div className="font-bold text-base">{task.title}</div>
                  <div className="text-xs opacity-80">{task.detail}</div>
                </div>
              </div>
              <span className="font-mono text-xs font-semibold">{task.time}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
