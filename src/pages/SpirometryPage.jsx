import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext.jsx';
import { PDF_COLORS } from '../data/simStore.js';
import { brand } from '../styles/tokens.js';

const SAMPLE_MS = 800;

/** 05 Spirometry lab: simulated FVC test plus recent logs. */
export default function SpirometryPage() {
  const { state, notify } = useApp();
  const [testingBreath, setTestingBreath] = useState(false);
  const [liveFlow] = useState(392);
  const [liveFvc, setLiveFvc] = useState(3.89);
  const sampleTimer = useRef(null);

  useEffect(() => () => clearTimeout(sampleTimer.current), []);

  const runTest = () => {
    setTestingBreath(true);
    notify('Sampling forced expiratory maneuver...');
    clearTimeout(sampleTimer.current);
    sampleTimer.current = setTimeout(() => {
      const fvc = Number((3.75 + Math.random() * 0.35).toFixed(2));
      setLiveFvc(fvc);
      setTestingBreath(false);
      notify(`New Spirometry Record Saved: FVC ${fvc} L`);
    }, SAMPLE_MS);
  };

  return (
    <section className="space-y-6 animate-page">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <span className="text-xs font-mono text-brand-purple-ink font-semibold">
            05 SPIROMETRY LAB // LUNG CAPACITY TEST
          </span>
          <h2 className="text-3xl font-bold text-slate-900">Digital Lung-Capacity &amp; Flow Analyzer</h2>
        </div>
        <button
          type="button"
          onClick={runTest}
          className="px-6 py-3 rounded-2xl text-white font-bold text-xs"
          style={{ backgroundColor: PDF_COLORS.tealDeep }}
        >
          {testingBreath ? 'Measuring Airflow...' : '▶ Blow New Spirometry Test'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[32px] bg-white p-4 sm:p-7 border border-slate-200/80 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-brand-teal/10">
              <div className="text-xs text-slate-600">Forced Vital Capacity (FVC)</div>
              <div className="text-xl sm:text-3xl font-bold text-brand-teal-ink mt-1">{liveFvc}&nbsp;L</div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-brand-purple/15">
              <div className="text-xs text-slate-600">Peak Expiratory Flow (PEF)</div>
              <div className="text-xl sm:text-3xl font-bold text-brand-purple-ink mt-1">{liveFlow}&nbsp;L/m</div>
            </div>
          </div>
          <svg viewBox="0 0 500 150" className="w-full bg-slate-900 rounded-2xl p-4" aria-hidden="true">
            <path d="M20 130 Q110 15 210 70 T480 125" fill="none" stroke={brand.teal.DEFAULT} strokeWidth="3" />
            <path d="M20 135 Q130 45 240 90 T480 130" fill="none" stroke={brand.purple.DEFAULT} strokeWidth="2.5" />
          </svg>
        </div>

        <div className="rounded-[32px] bg-white p-7 border border-slate-200/80 space-y-3">
          <div className="text-xs font-mono text-slate-500">RECENT SPIROMETRY LOGS</div>
          {state.spirometryLogs.map(l => (
            <div key={l.id} className="p-4 rounded-2xl bg-slate-50 flex justify-between items-center text-xs font-mono">
              <span>
                <strong>{l.id}</strong> ({l.date}) — FVC: {l.fvc}L | FEV1: {l.fev1}L
              </span>
              <span className="px-2.5 py-1 rounded-full bg-brand-teal/15 text-brand-teal-ink font-bold">{l.ratio}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
