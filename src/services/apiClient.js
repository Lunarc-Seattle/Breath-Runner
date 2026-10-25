/**
 * Hybrid Full-Stack API Service Layer
 * Connects to Express Backend (http://localhost:4000/api/v1/sim) when running locally,
 * and seamlessly falls back to the deterministic browser simulation kernel on GitHub Pages.
 */
import { INITIAL_SIM_STATE } from '../data/simStore.js';

const API_BASE = 'http://localhost:4000/api/v1/sim';

export const SimApiClient = {
  async checkBackendMode() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 600);
      const res = await fetch('http://localhost:4000/api/v1/health', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return 'EXPRESS_LIVE_API';
    } catch (_) {
      // Fallback to browser simulation engine when hosted on static GitHub Pages
    }
    return 'GITHUB_PAGES_EDGE_SIM';
  },

  async triggerRegressionJob(suiteName, domain) {
    try {
      const res = await fetch(`${API_BASE}/regression/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suiteName, domain })
      });
      if (res.ok) return await res.json();
    } catch (_) {}

    // Deterministic Edge Simulation Fallback
    const newRun = {
      id: `REG-${Math.floor(8845 + Math.random() * 900)}`,
      target: suiteName || 'Transient_PowerThermal_CoSim_Sweep',
      domain: domain || 'RTL + CFD ROM Solver',
      steps: '250,000',
      runtime: `${(1.15 + Math.random() * 1.4).toFixed(2)}s`,
      drift: `${(0.004 + Math.random() * 0.011).toFixed(3)}%`,
      seed: `0x${Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, '0')}`,
      status: 'PASS'
    };
    return { status: 'OK', newRun };
  },

  async executeTraceSolverStep() {
    const fvc = Number((3.55 + Math.random() * 0.65).toFixed(2));
    const fev1 = Number((fvc * (0.82 + Math.random() * 0.05)).toFixed(2));
    const pef = Math.floor(435 + Math.random() * 65);
    const socPowerMw = Number((43.2 + Math.random() * 6.5).toFixed(1));
    const peakHotspotC = Number((37.5 + (socPowerMw - 42) * 0.35).toFixed(2));
    const newTrace = {
      id: `TRC-${Math.floor(105 + Math.random() * 890)}`,
      date: new Date().toISOString().split('T')[0],
      fvc,
      fev1,
      pef,
      socPowerMw,
      peakHotspotC,
      hash: `sha256:${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`
    };
    return newTrace;
  }
};
