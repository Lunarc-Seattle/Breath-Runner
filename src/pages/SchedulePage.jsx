import { useApp } from '../app/AppContext.jsx';
import { btn, Card, CardHead, Chip, PageHeader, SampleTag } from '../components/ui.jsx';

const LONG_DATE = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' });

function CheckMark({ done }) {
  return (
    <span
      aria-hidden="true"
      className={`w-6 h-6 shrink-0 rounded-full grid place-items-center transition-colors ${
        done ? 'bg-brand-teal-deep text-white' : 'shadow-[inset_0_0_0_1.5px_theme(colors.slate.300)]'
      }`}
    >
      {done && (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/** 02 Today's schedule: pinned notes and a toggleable task timeline. */
export default function SchedulePage() {
  const { state, setState, notify, navigate } = useApp();
  const tasks = state.scheduleTasks;
  const next = tasks.find(t => !t.done);
  const doneCount = tasks.filter(t => t.done).length;
  const booking = state.disinfectionBooking;

  const toggleTask = task => {
    setState(p => ({
      ...p,
      scheduleTasks: p.scheduleTasks.map(t => (t.id === task.id ? { ...t, done: !t.done } : t))
    }));
    notify(`${task.done ? 'Marked not done' : 'Done'}: ${task.title}`);
  };

  return (
    <section className="animate-page" aria-labelledby="schedule-title">
      <PageHeader
        id="schedule-title"
        title="Today's schedule"
        tag={<SampleTag />}
        caption={`${LONG_DATE.format(new Date())} · ${doneCount} of ${tasks.length} done`}
      >
        <button type="button" onClick={() => navigate('play')} className={btn.primary}>
          Start a session
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,9fr)_minmax(0,5fr)] gap-6 items-start">
        <Card aria-labelledby="tasks-title">
          <CardHead id="tasks-title" title="Breathing routine" caption="Tap a task to mark it done" />
          <ul className="space-y-2.5">
            {tasks.map(task => (
              <li key={task.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.done}
                  onClick={() => toggleTask(task)}
                  className={`w-full text-left px-4 py-4 rounded-2xl flex items-center gap-4 transition-colors ${
                    task === next
                      ? 'bg-surface-mint/60 shadow-[inset_0_0_0_1.5px_theme(colors.brand.teal.DEFAULT)]'
                      : 'bg-canvas hover:bg-slate-100'
                  }`}
                >
                  <CheckMark done={task.done} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${task.done ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                        {task.title}
                      </span>
                      {task === next && <Chip tone="teal">Next</Chip>}
                    </span>
                    <span className="block text-[13px] text-slate-600 mt-0.5">{task.detail}</span>
                  </span>
                  <span className="text-sm font-medium tabular-nums text-slate-700 whitespace-nowrap">{task.time}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card tone="lavender" aria-labelledby="pinned-title" className="space-y-4">
          <CardHead id="pinned-title" title="Pinned this week" caption={state.lease.hospital} className="mb-0" />
          <div className="rounded-2xl bg-white p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Chip tone="sun">Doctor note</Chip>
              <span className="text-[13px] text-slate-600">Dr. Chen</span>
            </div>
            <p className="font-semibold text-slate-900">Call your doctor for a spirometry review</p>
            <p className="text-sm text-slate-600">
              Share your 3.89 L FVC curve and ask about moving the valve to 2.0 kPa.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Trainer disinfection</p>
              <p className="text-[13px] text-slate-600">
                {booking
                  ? `Booked for ${SHORT_DATE.format(booking.date)}, ${booking.slot}`
                  : `Due: last done ${state.hygiene.daysSince} days ago`}
              </p>
            </div>
            <button type="button" onClick={() => navigate('trainer')} className={btn.link}>
              {booking ? 'View' : 'Book'}
            </button>
          </div>
        </Card>
      </div>
    </section>
  );
}
