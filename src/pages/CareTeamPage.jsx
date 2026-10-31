import { useState } from 'react';
import { CARE_PATIENTS, CONDITIONS, RX_LIMITS } from '../data/careTeam.js';
import { RidgeChart } from '../components/RidgeChart.jsx';
import { Avatar, btn, Card, Chip, SampleTag } from '../components/ui.jsx';

const nf = new Intl.NumberFormat('en-US');
const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const PRESCRIBED_PER_WEEK = 21;

const pctChange = (from, to) => Math.round((to / from - 1) * 100);
const upDown = p => `${p >= 0 ? 'Up' : 'Down'} ${Math.abs(p)}%`;
const done = p => p.week.reduce((s, v) => s + v, 0);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const FILTERS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'attention', label: 'Needs attention', match: p => !!p.attention },
  ...CONDITIONS.map(c => ({ id: c, label: c, match: p => p.condition === c }))
];

const RX_FIELDS = [
  { key: 'sessions', label: 'Sessions a day', less: 'Fewer sessions', more: 'More sessions' },
  { key: 'minutes', label: 'Minutes each', less: 'Fewer minutes', more: 'More minutes' },
  { key: 'resistance', label: 'Resistance level', less: 'Lower resistance', more: 'Higher resistance' },
  { key: 'target', label: 'Inhale target (mL)', less: 'Lower target', more: 'Higher target' }
];

/** One bar per day: full height for 3 sessions, a short coral dash for none. */
function WeekBars({ week }) {
  return (
    <span className="inline-flex items-end gap-[3px] h-[22px]" aria-hidden="true">
      {week.map((b, i) => (
        <i
          key={i}
          className={`block w-1.5 rounded-xs ${b ? 'bg-brand-teal' : 'bg-brand-pink'}`}
          style={{ height: b ? 6 + b * 5.3 : 4, opacity: b === 1 ? 0.36 : b === 2 ? 0.62 : b ? 1 : 0.9 }}
        />
      ))}
    </span>
  );
}

function Stepper({ field, value, onChange }) {
  const [min, max, step] = RX_LIMITS[field.key];
  const icon = d => (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
  const btnClass =
    'w-[34px] h-[34px] grid place-items-center rounded-xl text-slate-700 hover:text-brand-teal-ink disabled:opacity-40';
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0 text-sm">
      <span className="text-slate-900">{field.label}</span>
      <span className="inline-flex items-center rounded-xl shadow-[inset_0_0_0_1px_var(--color-slate-200)]">
        <button
          type="button"
          aria-label={field.less}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
          className={btnClass}
        >
          {icon('M5.5 12h13')}
        </button>
        <output aria-label={field.label} className="min-w-[62px] text-center font-semibold tabular-nums text-slate-900">
          {nf.format(value)}
        </output>
        <button
          type="button"
          aria-label={field.more}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
          className={btnClass}
        >
          {icon('M12 5.5v13M5.5 12h13')}
        </button>
      </span>
    </div>
  );
}

function PatientDetail({ patient, rx, onRx }) {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const v = patient.series;
  const lo = Math.min(...v);
  const hi = Math.max(...v, rx.target);
  const first = addDays(patient.discharged, 1);
  const last = addDays(first, v.length - 1);

  const send = () => {
    if (!note.trim()) {
      setStatus('Write a note first, then send it.');
      return;
    }
    setStatus(`Demo only: the note to ${patient.name} was not sent.`);
    setNote('');
  };

  return (
    <Card aria-labelledby="patient-name">
      <div className="flex items-center gap-3.5 mb-4">
        <Avatar initials={patient.initials} tone={patient.tone} size="lg" />
        <div className="min-w-0">
          <h2 id="patient-name" className="text-lg font-semibold text-slate-900">
            {patient.name}
          </h2>
          <p className="text-[13px] text-slate-600">
            {patient.condition}, discharged {SHORT.format(patient.discharged)}
          </p>
        </div>
      </div>
      <p className="text-[13px] text-slate-600">Vital capacity since discharge (best inhale each day)</p>
      <div className="my-1.5">
        <RidgeChart
          values={v}
          min={Math.floor((lo - 200) / 100) * 100}
          max={Math.ceil((hi + 150) / 100) * 100}
          height={118}
          compact
          target={{ value: rx.target, label: `Target ${nf.format(rx.target)}` }}
          xlabels={[
            [0, SHORT.format(first)],
            [v.length - 1, SHORT.format(last)]
          ]}
          label={`${patient.name}, vital capacity since discharge: ${nf.format(v[0])} to ${nf.format(v[v.length - 1])} mL, target ${nf.format(rx.target)} mL`}
        />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mt-4 mb-1">Prescription</h3>
      {RX_FIELDS.map(f => (
        <Stepper
          key={f.key}
          field={f}
          value={rx[f.key]}
          onChange={value => {
            onRx({ ...rx, [f.key]: value });
            setStatus('');
          }}
        />
      ))}
      <label htmlFor="patient-note" className="sr-only">
        Note for {patient.name}
      </label>
      <textarea
        id="patient-note"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={`Write a note for ${patient.name}`}
        className="block w-full min-h-[74px] mt-2 px-3 py-2.5 rounded-xl bg-canvas shadow-[inset_0_0_0_1px_var(--color-slate-200)] text-sm resize-y placeholder:text-slate-600"
      />
      <div className="flex flex-wrap gap-2.5 mt-4">
        <button
          type="button"
          onClick={() =>
            setStatus(`Demo only: the prescription for ${patient.name} is kept on this page and not saved.`)
          }
          className={`${btn.primary} h-[42px] px-4 text-sm!`}
        >
          Save prescription
        </button>
        <button type="button" onClick={send} className={`${btn.soft} h-[42px] px-4 text-sm!`}>
          Send note
        </button>
      </div>
      <p role="status" className="mt-3 text-sm text-brand-teal-ink empty:hidden">
        {status}
      </p>
    </Card>
  );
}

/** 14 Care team: the clinician's view of patients in home rehab. Everything here is sample data. */
export default function CareTeamPage() {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(CARE_PATIENTS[0].id);
  const [prescriptions, setPrescriptions] = useState(() => Object.fromEntries(CARE_PATIENTS.map(p => [p.id, p.rx])));

  const q = query.trim().toLowerCase();
  const { match } = FILTERS.find(f => f.id === filter);
  const rows = CARE_PATIENTS.filter(p => match(p) && (!q || `${p.name} ${p.condition}`.toLowerCase().includes(q)));
  const patient = CARE_PATIENTS.find(p => p.id === selected);
  const attention = CARE_PATIENTS.filter(p => p.attention).length;
  const th =
    'px-2 py-3 text-[13px] font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap align-bottom';

  return (
    <section className="animate-page" aria-labelledby="care-title">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1
              id="care-title"
              className="text-[26px] md:text-[30px] font-semibold leading-tight tracking-tight text-slate-900"
            >
              Patients
            </h1>
            <SampleTag />
          </div>
          <p className="mt-1.5 text-slate-600">
            {CARE_PATIENTS.length} in home rehab, {attention} need attention. Sample patients for the care team view.
          </p>
        </div>
        <label className="flex items-center gap-2.5 h-[42px] w-full md:w-auto md:min-w-[280px] px-3.5 rounded-xl bg-white shadow-[inset_0_0_0_1px_var(--color-slate-200)] focus-within:shadow-[inset_0_0_0_2px_var(--color-brand-teal-deep)] text-slate-600">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <span className="sr-only">Search patients</span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search patients"
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent outline-hidden text-sm text-slate-900 placeholder:text-slate-600"
          />
        </label>
      </header>

      <div role="group" aria-label="Filter patients" className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map(f => {
          const count = CARE_PATIENTS.filter(f.match).length;
          const pressed = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => setFilter(f.id)}
              className={`h-9 px-3.5 rounded-full text-sm ${
                pressed
                  ? 'bg-ink text-white'
                  : 'bg-white text-slate-700 shadow-[inset_0_0_0_1px_var(--color-slate-200)]'
              }`}
            >
              {f.label}
              <b className={`ml-1.5 font-semibold ${pressed ? 'text-white/80' : 'text-slate-600'}`}>{count}</b>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_324px] gap-6 items-start">
        <Card flush className="px-3.5 py-2.5" aria-label="Patient list">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm text-left border-separate border-spacing-0">
              <caption className="sr-only">Sample patients in home rehab</caption>
              <thead>
                <tr>
                  <th scope="col" className={th}>
                    Patient
                  </th>
                  <th scope="col" className={th}>
                    Last 7 days
                  </th>
                  <th scope="col" className={th}>
                    Vital capacity
                    <span className="block font-normal text-xs">since discharge</span>
                  </th>
                  <th scope="col" className={th}>
                    Last session
                  </th>
                  <th scope="col" className={th}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const isSel = p.id === selected;
                  const now = p.series[p.series.length - 1];
                  const change = pctChange(p.series[0], now);
                  const td = `px-2 py-2.5 border-b border-slate-100 whitespace-nowrap ${isSel ? 'bg-surface-mint/60' : 'group-hover:bg-canvas'}`;
                  return (
                    <tr key={p.id} className="group cursor-pointer" onClick={() => setSelected(p.id)}>
                      <td className={`${td} rounded-l-[14px]`}>
                        <button
                          type="button"
                          aria-pressed={isSel}
                          onClick={e => {
                            e.stopPropagation();
                            setSelected(p.id);
                          }}
                          className="flex items-center gap-3 rounded-lg text-left"
                        >
                          <Avatar initials={p.initials} tone={p.tone} />
                          <span>
                            <span className="block font-semibold text-slate-900 leading-snug">{p.name}</span>
                            <span className="block text-[13px] text-slate-600 leading-snug">
                              {p.condition}, {SHORT.format(p.discharged)}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className={td}>
                        <span className="flex items-center gap-2.5">
                          <WeekBars week={p.week} />
                          <small className="text-[13px] text-slate-600 tabular-nums">
                            {done(p)} of {PRESCRIBED_PER_WEEK}
                          </small>
                        </span>
                      </td>
                      <td className={`${td} tabular-nums`}>
                        <strong className="block font-semibold text-slate-900">{nf.format(now)} mL</strong>
                        <span className={`block text-[13px] ${change >= 0 ? 'text-brand-teal-ink' : 'text-slate-600'}`}>
                          {upDown(change)}
                        </span>
                      </td>
                      <td className={td}>
                        <span className="block text-slate-900">{p.last[0]}</span>
                        <span className="block text-[13px] text-slate-600">{p.last[1]}</span>
                      </td>
                      <td className={`${td} rounded-r-[14px]`}>
                        <Chip tone={p.status[0]} dot>
                          {p.status[1]}
                        </Chip>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-7 text-center text-slate-600">
                      No patients match “{query}”. Check the spelling or clear the search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <PatientDetail
          key={patient.id}
          patient={patient}
          rx={prescriptions[patient.id]}
          onRx={rx => setPrescriptions(p => ({ ...p, [patient.id]: rx }))}
        />
      </div>
    </section>
  );
}
