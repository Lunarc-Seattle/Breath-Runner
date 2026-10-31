import { useApp } from '../app/AppContext.jsx';
import { btn, Card, CardHead, Chip, PageHeader, SampleTag } from '../components/ui.jsx';
import { brand } from '../styles/tokens.js';

const PROFILE_TAGS = ['FVC 3.89 L', '200 min trained', 'Level 1 crown', 'Level 2 medal'];

const TRAINING_MODULES = [
  { title: 'Forest · Level 1', focus: 'Inspiratory basics', sub: '1.5 kPa valve · 6 modules done', done: true },
  { title: 'Sunlit Canyon · Level 2', focus: 'Dual mode', sub: '2.5 kPa valve · 8 modules done', done: true },
  { title: 'Glacier Ridge · Level 3', focus: 'Deep alveoli', sub: '3.5 kPa valve · 5 modules so far', done: false }
];

const TELEHEALTH = [
  'Spirometry results shared with your care team',
  'Weekly prescription review by your thoracic surgeon',
  'Free mouthpiece UV-C sterilization at the hospital'
];

const ACTIVITY = [
  { what: 'Spirometry FVC 3.89 L', where: 'recorded in the Spirometry Lab', when: 'Today', dot: 'bg-brand-purple' },
  { what: 'Forest · Level 1', where: 'run completed, +320 coins', when: 'Yesterday', dot: 'bg-brand-teal' },
  {
    what: 'Level 2 endurance medal',
    where: 'unlocked at 200 training minutes',
    when: '2 days ago',
    dot: 'bg-brand-yellow'
  }
];

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 truncate">{children}</dd>
    </div>
  );
}

/** 12 My profile: the sample patient record, training modules, loan and telehealth plan. */
export default function ProfilePage() {
  const { state, navigate } = useApp();

  return (
    <section className="animate-page" aria-labelledby="profile-title">
      <PageHeader
        id="profile-title"
        title="My profile"
        tag={<SampleTag />}
        caption="Your patient record, training modules and trainer loan."
      />

      <Card className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6" aria-label={`${state.userName}'s record`}>
        <span
          aria-hidden="true"
          className="w-24 h-24 rounded-full shrink-0 grid place-items-center text-3xl font-semibold text-white"
          style={{ background: `linear-gradient(135deg, ${brand.teal.deep}, ${brand.purple.deep})` }}
        >
          {state.userName.charAt(0)}
        </span>
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{state.userName}</h2>
            <p className="text-sm text-slate-600">{state.userRole}</p>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-3">
            <Detail label="Hospital">{state.hospital}</Detail>
            <Detail label="Enrolled">{state.enrolledDate}</Detail>
            <Detail label="Born">{state.birthDate}</Detail>
            <Detail label="Email">{state.email}</Detail>
          </dl>
          <div className="flex flex-wrap gap-2">
            {PROFILE_TAGS.map(tag => (
              <Chip key={tag} tone="lavender">
                {tag}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 mb-6">
        <Card aria-labelledby="modules-title">
          <CardHead id="modules-title" title="Breathing modules" caption="200 minutes in total">
            <button type="button" onClick={() => navigate('maps')} className={btn.link}>
              All maps
            </button>
          </CardHead>
          <ul className="space-y-2.5">
            {TRAINING_MODULES.map(mod => (
              <li key={mod.title}>
                <button
                  type="button"
                  onClick={() => navigate('play')}
                  className="w-full text-left px-4 py-3.5 rounded-2xl bg-canvas hover:bg-slate-100 transition-colors flex items-center justify-between gap-4"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-900">
                      {mod.title} <span className="font-normal text-slate-600">· {mod.focus}</span>
                    </span>
                    <span className="block text-[13px] text-slate-600">{mod.sub}</span>
                  </span>
                  <Chip tone={mod.done ? 'teal' : 'lavender'} dot>
                    {mod.done ? 'Completed' : 'In progress'}
                  </Chip>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-6">
          <Card tone="warm" aria-labelledby="loan-title">
            <CardHead id="loan-title" title="Trainer loan" caption={`From ${state.lease.hospital}`} />
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-slate-700">
                Day {state.lease.usedDays} of {state.lease.quotaDays}
              </span>
              <span className="text-[13px] text-slate-600">Deposit ¥228</span>
            </div>
            <div className="h-2 rounded-full bg-white overflow-hidden mb-4">
              <div
                className="h-full rounded-full bg-brand-teal-deep"
                style={{ width: `${(state.lease.usedDays / state.lease.quotaDays) * 100}%` }}
              />
            </div>
            <button type="button" onClick={() => navigate('trainer')} className={btn.link}>
              Manage loan
            </button>
          </Card>

          <Card tone="lavender" aria-labelledby="plan-title">
            <CardHead id="plan-title" title="Hospital telehealth plan" className="mb-3" />
            <ul className="space-y-2 mb-5">
              {TELEHEALTH.map(item => (
                <li key={item} className="flex gap-2.5 text-sm text-slate-700">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 mt-0.5 shrink-0 text-brand-teal-ink"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => navigate('trainer')} className={`${btn.soft} w-full`}>
              Book a sterilization slot
            </button>
          </Card>
        </div>
      </div>

      <Card aria-labelledby="activity-title">
        <CardHead id="activity-title" title="Recent activity" />
        <ul className="divide-y divide-slate-100">
          {ACTIVITY.map(a => (
            <li key={a.what} className="py-3 flex items-center gap-3">
              <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${a.dot}`} />
              <span className="flex-1 min-w-0 text-sm text-slate-700">
                <strong className="font-semibold text-slate-900">{a.what}</strong> {a.where}
              </span>
              <span className="text-[13px] text-slate-600 whitespace-nowrap">{a.when}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
