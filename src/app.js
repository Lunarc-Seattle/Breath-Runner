import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import htm from 'https://esm.sh/htm@3.1.1';
import { PAGES_META, INITIAL_SIM_STATE } from './data/simStore.js';
import { SimApiClient } from './services/apiClient.js';

const html = htm.bind(React.createElement);

function AeroCareSimApp() {
  const [currentPage, setCurrentPage] = useState(1);
  const [simState, setSimState] = useState(INITIAL_SIM_STATE);
  const [backendMode, setBackendMode] = useState('GITHUB_PAGES_EDGE_SIM');
  const [toast, setToast] = useState(null);

  // Page 4 Trace Solver Live State
  const [solverRunning, setSolverRunning] = useState(false);
  const [liveFlowLpm, setLiveFlowLpm] = useState(0);
  const [livePowerMw, setLivePowerMw] = useState(14.2);
  const [liveTempC, setLiveTempC] = useState(34.6);

  // Page 6 Closed-Loop Simulator Canvas State
  const [gameActive, setGameActive] = useState(false);
  const [inhaling, setInhaling] = useState(false);
  const [simScore, setSimScore] = useState(1840);
  const [simStepCount, setSimStepCount] = useState(42800);
  const canvasRef = useRef(null);

  // Page 10 Regression Terminal & Chat State
  const [chatLogs, setChatLogs] = useState([
    { sender: 'Dr. Chen (Thoracic Modeling Lead)', time: '09:42 UTC', text: 'The 16-node reduced-order thermal solver matches the CFD Ansys Fluent baseline within 0.012% across the 3.89L FVC maneuver.' },
    { sender: 'SimInfra Bot (CI/CD Pipeline)', time: '09:45 UTC', text: 'Automated Regression Suite REG-8844 completed 500,000 time-indexed steps on sim-node-rtl-03. Determinism verified (SHA-256 match).' }
  ]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    SimApiClient.checkBackendMode().then(mode => setBackendMode(mode));
  }, []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const navTo = (pageId) => {
    setCurrentPage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Run Page 4 Time-Indexed Power/Thermal & CFD Solver
  const handleRunTraceSolver = async () => {
    if (solverRunning) return;
    setSolverRunning(true);
    notify('Executing Time-Indexed Power/Thermal & CFD Reduced-Order Solver...');
    let step = 0;
    const timer = setInterval(async () => {
      step++;
      const flow = Number((120 + Math.sin(step * 0.35) * 280 + Math.random() * 35).toFixed(1));
      const pwr = Number((32.5 + (flow / 450) * 18.4).toFixed(2));
      const tmp = Number((35.2 + (pwr - 30) * 0.19).toFixed(2));
      setLiveFlowLpm(Math.max(25, flow));
      setLivePowerMw(pwr);
      setLiveTempC(tmp);
      if (step >= 16) {
        clearInterval(timer);
        setSolverRunning(false);
        const newTrace = await SimApiClient.executeTraceSolverStep();
        setSimState(prev => ({
          ...prev,
          traceRuns: [...prev.traceRuns, newTrace]
        }));
        notify(`Trace ${newTrace.id} persisted! FVC: ${newTrace.fvc}L | Peak Die Temp: ${newTrace.peakHotspotC}°C`);
      }
    }, 140);
  };

  // Trigger Page 8 / Page 10 Automated Regression Suite
  const handleTriggerRegression = async (suiteName, domain) => {
    notify(`Dispatching ${suiteName || 'Full Regression Suite'} to Linux Compute Cluster...`);
    const res = await SimApiClient.triggerRegressionJob(suiteName, domain);
    if (res && res.newRun) {
      setSimState(prev => ({
        ...prev,
        regressionRuns: [res.newRun, ...prev.regressionRuns]
      }));
      notify(`Regression ${res.newRun.id} PASSED (${res.newRun.drift} drift, seed ${res.newRun.seed})`);
    }
  };

  // Toggle Page 9 Calibration & Disinfection Schedule Date
  const toggleCalibrationDay = (day) => {
    setSimState(prev => {
      const exists = prev.calibrationDays.includes(day);
      const updated = exists ? prev.calibrationDays.filter(d => d !== day) : [...prev.calibrationDays, day].sort((a,b)=>a-b);
      return { ...prev, calibrationDays: updated };
    });
    notify(`Updated Sensor Calibration & Disinfection Schedule: Oct ${day}, 2026`);
  };

  // Page 6 Canvas Loop
  useEffect(() => {
    if (currentPage !== 6 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    let playerY = 175;
    let velY = 0;
    let scrollX = 0;
    const coins = Array.from({ length: 14 }, (_, i) => ({
      x: 160 + i * 115,
      y: 80 + (i % 3) * 42,
      taken: false
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, '#D4E4E8');
      sky.addColorStop(1, '#F6F5F0');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Alpine Peaks
      ctx.fillStyle = '#96C7D2';
      ctx.beginPath();
      ctx.moveTo(0, 260);
      ctx.lineTo(180, 95);
      ctx.lineTo(370, 215);
      ctx.lineTo(590, 75);
      ctx.lineTo(840, 260);
      ctx.closePath();
      ctx.fill();

      if (gameActive) {
        scrollX += 2.6;
        setSimStepCount(c => c + 12);
        if (inhaling) {
          velY = -3.8;
        } else {
          velY += 0.22;
        }
        playerY = Math.max(42, Math.min(205, playerY + velY));
      }

      // Coins / Trace Checkpoints
      coins.forEach(c => {
        const drawX = ((c.x - scrollX) % 1400 + 1400) % 1400;
        if (!c.taken && Math.hypot(drawX - 110, c.y - playerY) < 26) {
          c.taken = true;
          setSimScore(s => s + 25);
          setTimeout(() => { c.taken = false; }, 3500);
        }
        if (!c.taken && drawX < canvas.width) {
          ctx.fillStyle = '#F0C754';
          ctx.beginPath();
          ctx.arc(drawX, c.y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Avatar (Airflow Glider)
      ctx.fillStyle = inhaling ? '#13A4A9' : '#F0A7AB';
      ctx.beginPath();
      ctx.arc(110, playerY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111315';
      ctx.font = '600 10px JetBrains Mono';
      ctx.fillText(inhaling ? 'Q_FLOW: 385 L/m | P_SOC: 46.2mW' : 'Q_FLOW: 45 L/m | P_SOC: 14.8mW', 80, playerY - 22);

      // Ground
      ctx.fillStyle = '#1E3A3A';
      ctx.fillRect(0, 232, canvas.width, 48);

      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [currentPage, gameActive, inhaling]);

  return html`
    <div className="min-h-screen flex flex-col justify-between">
      <!-- Top Floating Editorial + Infrastructure Navigation -->
      <header className="sticky top-0 z-50 bg-[#F6F5F0]/90 backdrop-blur-md border-b border-black/10 px-4 lg:px-8 py-3">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick=${() => navTo(1)}>
            <div className="w-8 h-8 rounded-full bg-[#111315] text-[#F6F5F0] flex items-center justify-center font-mono text-xs font-bold">
              AC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-sm">AEROCARE // SIM-INFRA</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#13A4A9]/15 text-[#13A4A9] font-medium">
                  v3.2 ROM-CFD
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">
                Trace-Driven Power/Thermal Simulation & Pulmonary Telemetry Suite
              </p>
            </div>
          </div>

          <!-- 12-Page Quick Jump Pill Bar -->
          <nav className="flex items-center gap-1 overflow-x-auto py-1 max-w-full no-scrollbar">
            ${PAGES_META.map(p => html`
              <button
                key=${p.id}
                onClick=${() => navTo(p.id)}
                className=${`px-2.5 py-1.5 rounded-full text-xs font-mono transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  currentPage === p.id
                    ? 'bg-[#111315] text-[#F6F5F0] shadow-sm font-medium'
                    : 'text-neutral-600 hover:bg-black/5'
                }`}
              >
                <span className=${currentPage === p.id ? 'text-[#D9F99D]' : 'text-neutral-400'}>${p.code}</span>
                <span>${p.name}</span>
              </button>
            `)}
          </nav>

          <!-- Runtime Status Indicator -->
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono bg-white px-3 py-1.5 rounded-full border border-black/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>${backendMode}</span>
          </div>
        </div>
      </header>

      <!-- Toast Notification -->
      ${toast && html`
        <div className="fixed bottom-6 right-6 z-50 bg-[#111315] text-white px-5 py-3 rounded-2xl shadow-xl border border-white/15 flex items-center gap-3 font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-[#D9F99D]"></span>
          <span>${toast}</span>
        </div>
      `}

      <!-- Main 12-Page Router Content -->
      <main className="max-w-[1440px] w-full mx-auto px-4 lg:px-10 py-8 flex-1">
        
        <!-- ==================== PAGE 01: EDITORIAL & SIM-INFRA PORTAL ==================== -->
        ${currentPage === 1 && html`
          <section className="space-y-10 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-12 border border-black/15 rounded-[28px] overflow-hidden bg-[#F6F5F0]">
              <div className="lg:col-span-7 p-8 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-black/15">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/10 text-xs font-mono">
                    <span className="text-[#13A4A9]">●</span>
                    <span>PAGE 01 // TRACE-DRIVEN SIMULATION & REHAB PORTAL</span>
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-light tracking-tight leading-[1.08]">
                    Where <span className="font-serif italic font-normal text-[#13A4A9]">Trace-Driven</span> Simulation Meets Clinical Recovery.
                  </h1>
                  <p className="text-neutral-600 text-base lg:text-lg max-w-2xl leading-relaxed">
                    An end-to-end engineering & patient telemetry platform integrating <strong>time-indexed power/thermal macromodels</strong>, <strong>CFD-calibrated airflow solvers</strong>, and <strong>automated Linux regression pipelines</strong> for smart respiratory hardware.
                  </p>
                </div>

                <div className="pt-10 flex flex-wrap items-center gap-4">
                  <button onClick=${() => navTo(3)} className="px-6 py-3.5 rounded-full bg-[#111315] text-white text-sm font-medium flex items-center gap-3 hover:bg-[#13A4A9] transition-colors">
                    <span>Launch Simulation Workspace</span>
                    <span className="w-6 h-6 rounded-full bg-[#D9F99D] text-black flex items-center justify-center font-mono text-xs">↗</span>
                  </button>
                  <button onClick=${() => navTo(8)} className="px-6 py-3.5 rounded-full bg-white border border-black/15 text-sm font-mono hover:bg-black/5 transition-colors">
                    Inspect Linux Cluster Infra (08) →
                  </button>
                  <button onClick=${() => navTo(4)} className="px-5 py-3.5 rounded-full bg-[#13A4A9]/10 text-[#13A4A9] text-sm font-mono hover:bg-[#13A4A9]/20 transition-colors">
                    Time-Indexed Solver (04)
                  </button>
                </div>
              </div>

              <!-- Right Architectural Role & Illustration Column -->
              <div className="lg:col-span-5 bg-white p-8 lg:p-12 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400 border-b border-black/10 pb-3">
                    <span>SYSTEM ARCHITECTURE</span>
                    <span>REACT 18 + EXPRESS + C++20 ROM</span>
                  </div>
                  <!-- Custom Editorial SVG Illustration: Pulmonary X-Ray + Thermal Mesh -->
                  <div className="py-4 flex justify-center">
                    <svg viewBox="0 0 360 230" className="w-full max-w-[340px]">
                      <rect x="10" y="10" width="340" height="210" rx="20" fill="#F6F5F0" stroke="#111315" strokeWidth="1.2"/>
                      <circle cx="110" cy="115" r="65" fill="#96C7D2" fillOpacity="0.25"/>
                      <circle cx="240" cy="95" r="55" fill="#F0A7AB" fillOpacity="0.25"/>
                      <!-- Lungs + CFD Mesh Grid -->
                      <path d="M145 65 C115 65 95 95 95 135 C95 160 120 175 148 165 Z" fill="#13A4A9" fillOpacity="0.8"/>
                      <path d="M175 65 C205 65 225 95 225 135 C225 160 200 175 172 165 Z" fill="#8E90C6" fillOpacity="0.85"/>
                      <rect x="156" y="42" width="8" height="45" rx="4" fill="#111315"/>
                      <!-- Leader Line Callouts -->
                      <polyline points="215,95 250,70 325,70" fill="none" stroke="#111315" strokeWidth="1"/>
                      <text x="252" y="64" fontSize="9" fontFamily="JetBrains Mono" fill="#111315">CFD_MESH: 1.2M CELLS</text>
                      <polyline points="120,145 75,180 25,180" fill="none" stroke="#111315" strokeWidth="1"/>
                      <text x="25" y="174" fontSize="9" fontFamily="JetBrains Mono" fill="#13A4A9">ROM_SOLVER: dt=1.0ms</text>
                    </svg>
                  </div>
                </div>

                <div className="space-y-3 border-t border-black/10 pt-5">
                  <label className="text-xs font-mono uppercase text-neutral-500">Active Engineering Session Profile</label>
                  <div className="p-3.5 rounded-2xl bg-[#F6F5F0] flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Jiafeng Du — Simulation Infra & Tooling</div>
                      <div className="text-xs font-mono text-neutral-500">Linux Cluster • Python/Bash CI • RTL/Thermal Solvers</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 font-mono text-xs">AUTH_OK</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- OURA & CO. Inspired Hairline Metric Grid -->
            <div className="grid grid-cols-1 md:grid-cols-4 border border-black/15 rounded-[24px] overflow-hidden bg-white divide-y md:divide-y-0 md:divide-x divide-black/15">
              <div className="p-7 flex flex-col justify-between">
                <span className="text-xs font-mono text-neutral-500">01 / TIME-STEP RESOLUTION</span>
                <div className="text-5xl font-light tracking-tight mt-6">1.0<span className="text-xl font-mono text-[#13A4A9]">ms</span></div>
                <p className="text-xs text-neutral-500 mt-2">Synchronized across RTL power & thermal domains</p>
              </div>
              <div className="p-7 flex flex-col justify-between">
                <span className="text-xs font-mono text-neutral-500">02 / REGRESSION REPRODUCIBILITY</span>
                <div className="text-5xl font-light tracking-tight mt-6">100<span className="text-xl font-mono text-[#8E90C6]">%</span></div>
                <p className="text-xs text-neutral-500 mt-2">Bit-exact deterministic SHA-256 trace verification</p>
              </div>
              <div className="p-7 flex flex-col justify-between">
                <span className="text-xs font-mono text-neutral-500">03 / CFD ROM SPEEDUP</span>
                <div className="text-5xl font-light tracking-tight mt-6">420<span className="text-xl font-mono text-[#F0C754]">x</span></div>
                <p className="text-xs text-neutral-500 mt-2">16-node reduced-order thermal solver vs full 3D CFD</p>
              </div>
              <div className="p-7 bg-[#111315] text-white flex flex-col justify-between">
                <span className="text-xs font-mono text-[#D9F99D]">04 / FULL-STACK REPOSITORY</span>
                <div className="text-4xl font-light tracking-tight mt-6">12 Pages</div>
                <button onClick=${() => navTo(2)} className="mt-3 inline-flex items-center gap-2 text-xs font-mono text-[#D9F99D] hover:underline">
                  <span>Proceed to Page 02 Hardware Probe</span>
                  <span>↗</span>
                </button>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 02: RTL & SENSOR HUD PROBE (REALITY BY DESIGN STYLE) ==================== -->
        ${currentPage === 2 && html`
          <section className="space-y-8 animate-fadeIn">
            <div className="rounded-[28px] bg-[#111315] text-white p-8 lg:p-12 border border-white/15 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <span className="text-xs font-mono text-[#D9F99D]">PAGE 02 // REALITY BY DESIGN — HARDWARE & RTL MACROMODEL TELEMETRY</span>
                  <h2 className="text-3xl lg:text-5xl font-light tracking-tight mt-1">
                    IP-Level Power Macromodel & <span className="font-serif italic text-[#96C7D2]">Hardware Probe</span>
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick=${() => {
                      setSimState(p => ({ ...p, hardwareConnected: !p.hardwareConnected }));
                      notify('Re-synchronized BLE GATT 0x181A & RTL JTAG Trace Bus');
                    }}
                    className="px-5 py-2.5 rounded-full bg-[#D9F99D] text-black font-mono text-xs font-semibold hover:opacity-90"
                  >
                    ${simState.hardwareConnected ? '● LINK LOCKED (RE-CALIBRATE)' : 'CONNECT BLE / RTL PROBE'}
                  </button>
                  <button onClick=${() => navTo(4)} className="px-4 py-2.5 rounded-full border border-white/20 font-mono text-xs hover:bg-white/10">
                    Open Trace Solver (04) ↗
                  </button>
                </div>
              </div>

              <!-- Centerpiece HUD Callout Diagram -->
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-8">
                <div className="lg:col-span-4 space-y-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[#96C7D2]">[IP_MACROMODEL_01 // BLE_5.3_SOC]</div>
                    <div className="text-lg font-light text-white mt-1">nRF5340 Dual-Core ARM Cortex-M33</div>
                    <div className="text-neutral-400 mt-1">Dynamic Power: 18.4 mW @ 64MHz | Leakage: 0.42 mW</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[#F0C754]">[IP_MACROMODEL_02 // PIEZO_MEMS_ADC]</div>
                    <div className="text-lg font-light text-white mt-1">Differential Pressure Bridge (-20..+20 kPa)</div>
                    <div className="text-neutral-400 mt-1">Sampling Rate: 1,000 Hz Time-Indexed Stream</div>
                  </div>
                </div>

                <div className="lg:col-span-4 flex justify-center">
                  <svg viewBox="0 0 320 300" className="w-full max-w-[300px]">
                    <circle cx="160" cy="150" r="120" fill="none" stroke="#ffffff22" strokeDasharray="4 4"/>
                    <circle cx="160" cy="150" r="85" fill="#13A4A9" fillOpacity="0.12" stroke="#13A4A9" strokeWidth="1"/>
                    <!-- Rhino Ergonomic Coral-Pink Breathing Trainer Hardware Silhouette -->
                    <path d="M110 110 C110 85 195 85 215 110 L240 110 L240 138 L210 142 L185 225 C180 242 145 242 142 222 L135 148 L110 135 Z" fill="#F0A7AB" stroke="#FFF" strokeWidth="1.5"/>
                    <rect x="235" y="114" width="22" height="20" rx="4" fill="#13A4A9"/>
                    <!-- HUD Callout Lines -->
                    <polyline points="246,120 275,75 312,75" fill="none" stroke="#D9F99D" strokeWidth="1.2"/>
                    <text x="210" y="66" fontSize="9" fontFamily="JetBrains Mono" fill="#D9F99D">VENTURI_NOZZLE_CFD</text>
                    <polyline points="165,165 95,245 20,245" fill="none" stroke="#96C7D2" strokeWidth="1.2"/>
                    <text x="20" y="238" fontSize="9" fontFamily="JetBrains Mono" fill="#96C7D2">DIE_HOTSPOT: 38.2°C</text>
                  </svg>
                </div>

                <div className="lg:col-span-4 space-y-4 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[#F0A7AB]">[IP_MACROMODEL_03 //PROPORTIONAL_VALVE]</div>
                    <div className="text-lg font-light text-white mt-1">Variable Impedance Stepper Actuator</div>
                    <div className="text-neutral-400 mt-1">Transient Coil Peak: 28.5 mW | Thermal Tau: 4.2s</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[#D9F99D]">[RTL_SIM_INTERFACE // VERILATOR_CO_SIM]</div>
                    <div className="text-lg font-light text-white mt-1">VCD / FST Waveform Trace Pipe Active</div>
                    <div className="text-neutral-400 mt-1">Zero packet drop • Seed: 0x2026CAFE</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 03: SYSTEM WORKSPACE OVERVIEW ==================== -->
        ${currentPage === 3 && html`
          <section className="space-y-8 animate-fadeIn">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/15 pb-6">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">PAGE 03 // UNIFIED TELEMETRY & SIMULATION CONTROL</span>
                <h2 className="text-4xl font-light tracking-tight mt-1">
                  Executive <span className="font-serif italic">Simulation & Rehab</span> Workspace
                </h2>
              </div>
              <div className="flex gap-3">
                <button onClick=${() => navTo(6)} className="px-5 py-2.5 rounded-full bg-[#111315] text-white text-xs font-mono flex items-center gap-2">
                  <span>Start Real-Time Trace Simulator (06)</span>
                  <span className="text-[#D9F99D]">↗</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Card 1: Hardware & Macromodel Status -->
              <div className="p-7 rounded-[24px] bg-white border border-black/10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
                    <span>01 / DEVICE & RTL TARGET</span>
                    <span className="text-emerald-600">● ONLINE</span>
                  </div>
                  <h3 className="text-2xl font-light mt-3">${simState.activeTarget}</h3>
                  <p className="text-xs text-neutral-500 mt-2">
                    Coupled with 16-node reduced-order thermal solver and patient spirometry telemetry stream.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-black/10 flex justify-between items-center font-mono text-xs">
                  <span>SOC BATTERY: 86%</span>
                  <button onClick=${() => navTo(2)} className="text-[#13A4A9] hover:underline">Inspect HUD Probe ↗</button>
                </div>
              </div>

              <!-- Card 2: Latest Trace-Driven Solver Output -->
              <div className="p-7 rounded-[24px] bg-white border border-black/10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
                    <span>02 / LATEST TRACE SOLVER RUN</span>
                    <span>${simState.traceRuns[simState.traceRuns.length - 1].id}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div>
                      <div className="text-xs font-mono text-neutral-400">FVC</div>
                      <div className="text-2xl font-light">${simState.traceRuns[simState.traceRuns.length - 1].fvc}L</div>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-neutral-400">SOC PWR</div>
                      <div className="text-2xl font-light text-[#8E90C6]">${simState.traceRuns[simState.traceRuns.length - 1].socPowerMw}mW</div>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-neutral-400">HOTSPOT</div>
                      <div className="text-2xl font-light text-[#F0A7AB]">${simState.traceRuns[simState.traceRuns.length - 1].peakHotspotC}°C</div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-black/10 flex justify-between items-center font-mono text-xs">
                  <span>${simState.traceRuns[simState.traceRuns.length - 1].hash}</span>
                  <button onClick=${() => navTo(4)} className="text-[#13A4A9] hover:underline">Run Time-Step Solver ↗</button>
                </div>
              </div>

              <!-- Card 3: Linux Compute Cluster & Regression Pipeline -->
              <div className="p-7 rounded-[24px] bg-[#111315] text-white flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs font-mono text-[#D9F99D]">
                    <span>03 / LINUX REGRESSION FARM</span>
                    <span>4 NODES ACTIVE</span>
                  </div>
                  <h3 className="text-2xl font-light mt-3">${simState.regressionRuns.length} Automated Suites Passing</h3>
                  <p className="text-xs text-neutral-400 mt-2">
                    Continuous integration across Verilator RTL, power macromodels, and CFD thermal solvers.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/15 flex justify-between items-center font-mono text-xs">
                  <span>DRIFT &lt; 0.02%</span>
                  <button onClick=${() => navTo(8)} className="text-[#D9F99D] hover:underline">Manage Cluster (08) ↗</button>
                </div>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 04: TIME-INDEXED POWER/THERMAL & SPIROMETRY SOLVER LAB ==================== -->
        ${currentPage === 4 && html`
          <section className="space-y-8 animate-fadeIn">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/15 pb-6">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">PAGE 04 // TIME-INDEXED POWER, THERMAL & AIRFLOW TRACE SOLVER</span>
                <h2 className="text-4xl font-light tracking-tight mt-1">
                  Coupled <span className="font-serif italic">CFD Spirometry & Thermal</span> Solver Lab
                </h2>
              </div>
              <button
                onClick=${handleRunTraceSolver}
                className="px-6 py-3 rounded-full bg-[#13A4A9] text-white font-mono text-xs font-semibold hover:opacity-95 flex items-center gap-2 shadow-sm"
              >
                <span>${solverRunning ? 'SOLVING TIME-INDEXED TRACE...' : '▶ EXECUTE TRACE-DRIVEN SOLVER RUN'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 p-7 rounded-[24px] bg-white border border-black/10 space-y-6">
                <div className="flex justify-between items-center text-xs font-mono text-neutral-500">
                  <span>REAL-TIME TRANSIENT WAVEFORM (dt = 1.0ms)</span>
                  <span>SOLVER: C++20 ROM + RK4 INTEGRATOR</span>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 rounded-2xl bg-[#F6F5F0] font-mono">
                  <div>
                    <div className="text-[11px] text-neutral-500">AIRFLOW TRACE (Q)</div>
                    <div className="text-2xl font-semibold text-[#13A4A9]">${liveFlowLpm} <span className="text-xs">L/min</span></div>
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-500">IP POWER (P_total)</div>
                    <div className="text-2xl font-semibold text-[#8E90C6]">${livePowerMw} <span className="text-xs">mW</span></div>
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-500">PEAK DIE TEMP (T_max)</div>
                    <div className="text-2xl font-semibold text-[#F0A7AB]">${liveTempC} <span className="text-xs">°C</span></div>
                  </div>
                </div>

                <!-- Multi-Domain Time-Indexed SVG Plot -->
                <svg viewBox="0 0 600 190" className="w-full bg-[#111315] rounded-2xl p-4">
                  <line x1="30" y1="40" x2="570" y2="40" stroke="#ffffff15" strokeDasharray="3 3"/>
                  <line x1="30" y1="95" x2="570" y2="95" stroke="#ffffff15" strokeDasharray="3 3"/>
                  <line x1="30" y1="150" x2="570" y2="150" stroke="#ffffff15" strokeDasharray="3 3"/>
                  <!-- Airflow Curve -->
                  <path d="M30 150 Q120 20 220 85 T410 55 T570 140" fill="none" stroke="#13A4A9" strokeWidth="2.5"/>
                  <!-- Power Macromodel Curve -->
                  <path d="M30 160 Q140 55 240 105 T420 75 T570 150" fill="none" stroke="#8E90C6" strokeWidth="2"/>
                  <!-- Thermal Transient Response Curve -->
                  <path d="M30 165 C150 140 280 85 450 68 L570 82" fill="none" stroke="#F0A7AB" strokeWidth="2" strokeDasharray="5 3"/>
                  <text x="42" y="28" fill="#13A4A9" fontSize="10" fontFamily="JetBrains Mono">─ Airflow Q(t)</text>
                  <text x="165" y="28" fill="#8E90C6" fontSize="10" fontFamily="JetBrains Mono">─ Macromodel Power P(t)</text>
                  <text x="345" y="28" fill="#F0A7AB" fontSize="10" fontFamily="JetBrains Mono">-- Die Thermal Response T(t)</text>
                </svg>
              </div>

              <!-- Trace Run Ledger -->
              <div className="lg:col-span-5 p-7 rounded-[24px] bg-white border border-black/10 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="text-xs font-mono text-neutral-500">VERIFIED TRACE-DRIVEN SIMULATION ARCHIVE</div>
                  <div className="divide-y divide-black/10">
                    ${simState.traceRuns.map(t => html`
                      <div key=${t.id} className="py-3 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="font-semibold text-black">${t.id}</span>
                          <span className="text-neutral-400 ml-2">${t.date}</span>
                          <div className="text-[11px] text-neutral-500">FVC: ${t.fvc}L | FEV1: ${t.fev1}L | PEF: ${t.pef}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#8E90C6]">${t.socPowerMw} mW</div>
                          <div className="text-[#13A4A9]">${t.peakHotspotC} °C</div>
                        </div>
                      </div>
                    `)}
                  </div>
                </div>
                <div className="pt-4 border-t border-black/10 flex justify-between items-center text-xs font-mono">
                  <span>DETERMINISTIC HASH VERIFIED</span>
                  <button onClick=${() => navTo(9)} className="text-[#13A4A9] hover:underline">View 4x4 Thermal Map (09) ↗</button>
                </div>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 05: CFD AIRFLOW & TERRAIN BOUNDARY PROFILES ==================== -->
        ${currentPage === 5 && html`
          <section className="space-y-8 animate-fadeIn">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/15 pb-6">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">PAGE 05 // CFD BOUNDARY CONDITIONS & GAMIFIED TERRAIN SCENARIOS</span>
                <h2 className="text-4xl font-light tracking-tight mt-1">
                  Select <span className="font-serif italic">Fluid-Thermal Scenario</span> & Impedance Level
                </h2>
              </div>
              <button onClick=${() => navTo(6)} className="px-5 py-2.5 rounded-full bg-[#111315] text-white text-xs font-mono">
                Launch Selected Scenario in Simulator (06) ↗
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              ${[
                { id: 'CFD-MIST-01', name: 'Misty Pine Valley — Level 1', kpa: 1.5, cells: '1.2M Polyhedral Cells', ambient: 24.5, color: '#13A4A9', desc: 'Laminar inspiratory baseline for post-op lung expansion & steady-state thermal validation.' },
                { id: 'CFD-ALPS-02', name: 'Alpine Ridge — Level 2', kpa: 2.8, cells: '2.4M Hex-Dominant Cells', ambient: 18.0, color: '#8E90C6', desc: 'High-altitude turbulent resistance profile stressing proportional valve coil macromodel.' },
                { id: 'CFD-REEF-03', name: 'Abyssal Trench — Level 3', kpa: 4.2, cells: '3.8M Coupled FSI Mesh', ambient: 28.5, color: '#F0A7AB', desc: 'Maximum expiratory back-pressure workload for peak die hotspot spatiotemporal testing.' }
              ].map(sc => html`
                <div
                  key=${sc.id}
                  onClick=${() => {
                    setSimState(p => ({ ...p, selectedScenario: { id: sc.id, name: sc.name, resistanceKpa: sc.kpa, meshCells: sc.cells, ambientTempC: sc.ambient } }));
                    notify(`Loaded Scenario ${sc.id} (${sc.cells}, ${sc.kpa} kPa)`);
                  }}
                  className=${`p-7 rounded-[24px] bg-white border transition-all cursor-pointer flex flex-col justify-between ${
                    simState.selectedScenario.id === sc.id ? 'border-2 border-[#111315] shadow-md' : 'border-black/10 hover:border-black/30'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center font-mono text-xs">
                      <span className="px-2.5 py-1 rounded-full text-white" style=${{ backgroundColor: sc.color }}>${sc.id}</span>
                      <span>IMPEDANCE: ${sc.kpa} kPa</span>
                    </div>
                    <h3 className="text-2xl font-light">${sc.name}</h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">${sc.desc}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-black/10 font-mono text-xs space-y-1 text-neutral-500">
                    <div>CFD MESH: ${sc.cells}</div>
                    <div>AMBIENT BOUNDARY: ${sc.ambient} °C</div>
                  </div>
                </div>
              `)}
            </div>
          </section>
        `}

        <!-- ==================== PAGE 06: REAL-TIME TRACE-DRIVEN CLOSED-LOOP SIMULATOR ==================== -->
        ${currentPage === 6 && html`
          <section className="space-y-6 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">PAGE 06 // CLOSED-LOOP INTERACTIVE TRACE-DRIVEN SIMULATOR</span>
                <h2 className="text-3xl font-light tracking-tight">
                  Scenario: <span className="font-serif italic">${simState.selectedScenario.name}</span>
                </h2>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="px-3 py-1.5 rounded-full bg-white border border-black/10">TIME STEPS: ${simStepCount.toLocaleString()}</span>
                <span className="px-3 py-1.5 rounded-full bg-[#F0C754]/20 text-black font-semibold">SCORE: ${simScore}</span>
                <button
                  onClick=${() => setGameActive(!gameActive)}
                  className="px-5 py-2 rounded-full bg-[#111315] text-white font-semibold"
                >
                  ${gameActive ? '⏸ PAUSE TRACE ENGINE' : '▶ START TRACE ENGINE'}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] overflow-hidden border border-black/15 bg-white p-4 space-y-4">
              <canvas ref=${canvasRef} width="920" height="280" className="w-full h-[280px] rounded-2xl border border-black/10"></canvas>
              <div className="flex flex-wrap items-center justify-between gap-4 px-2">
                <div className="text-xs font-mono text-neutral-500">
                  Hold the button below to inject a high-airflow inspiratory workload trace into the real-time solver.
                </div>
                <button
                  onMouseDown=${() => { setGameActive(true); setInhaling(true); }}
                  onMouseUp=${() => setInhaling(false)}
                  onTouchStart=${() => { setGameActive(true); setInhaling(true); }}
                  onTouchEnd=${() => setInhaling(false)}
                  className=${`px-8 py-3.5 rounded-full font-mono text-xs font-semibold transition-all ${
                    inhaling ? 'bg-[#13A4A9] text-white scale-95' : 'bg-[#D9F99D] text-black hover:bg-[#13A4A9] hover:text-white'
                  }`}
                >
                  ${inhaling ? '▲ INJECTING INSPIRATORY AIRFLOW TRACE (385 L/min)...' : 'HOLD TO INHALE / INJECT WORKLOAD TRACE'}
                </button>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 07: MULTI-NODE LOCKSTEP CO-SIMULATION ARENA ==================== -->
        ${currentPage === 7 && html`
          <section className="space-y-8 animate-fadeIn">
            <div className="border-b border-black/15 pb-6 flex flex-wrap justify-between items-end gap-4">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">PAGE 07 // DISTRIBUTED DISCRETE-EVENT LOCKSTEP SYNCHRONIZATION</span>
                <h2 className="text-4xl font-light tracking-tight mt-1">
                  Multi-Node <span className="font-serif italic">Co-Simulation & Co-Op</span> Arena
                </h2>
              </div>
              <button onClick=${() => notify('Synchronized MPI/gRPC barrier across Node A & Node B (0.4ms jitter)')} className="px-5 py-2.5 rounded-full bg-[#111315] text-white font-mono text-xs">
                Force Barrier Sync (dt = 1.0ms) ↗
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-7 rounded-[24px] bg-white border border-black/10 space-y-4">
                <div className="flex justify-between font-mono text-xs text-[#13A4A9]">
                  <span>NODE_A // LOCAL PATIENT & RTL ENGINE</span>
                  <span>PHASE LOCK: 99.4%</span>
                </div>
                <h3 className="text-2xl font-light">Xiaoming Li (Target: AC-PRO-9942)</h3>
                <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-[#13A4A9] w-[84%]"></div>
                </div>
                <div className="text-xs font-mono text-neutral-500">Airflow: 365 L/min • Die Power: 44.8 mW • Thermal Node #5: 38.1°C</div>
              </div>

              <div className="p-7 rounded-[24px] bg-white border border-black/10 space-y-4">
                <div className="flex justify-between font-mono text-xs text-[#8E90C6]">
                  <span>NODE_B // REMOTE CO-OP PARTNER & CFD ENGINE</span>
                  <span>LATENCY: 6.2ms</span>
                </div>
                <h3 className="text-2xl font-light">Ali (Target: AC-PRO-8810)</h3>
                <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-[#8E90C6] w-[81%]"></div>
                </div>
                <div className="text-xs font-mono text-neutral-500">Airflow: 352 L/min • Die Power: 43.2 mW • Thermal Node #5: 37.8°C</div>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 08: LINUX COMPUTE CLUSTER & HARDWARE LEASE INFRASTRUCTURE (JD2 CORE) ==================== -->
        ${currentPage === 8 && html`
          <section className="space-y-8 animate-fadeIn">
            <div className="border-b border-black/15 pb-6 flex flex-wrap justify-between items-end gap-4">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">PAGE 08 // SIMULATION INFRASTRUCTURE, LINUX SERVERS & HARDWARE ASSET POOL</span>
                <h2 className="text-4xl font-light tracking-tight mt-1">
                  Compute Environment & <span className="font-serif italic">Device Lease</span> Management
                </h2>
              </div>
              <div className="flex gap-3">
                <button
                  onClick=${() => handleTriggerRegression('Full_Cluster_Sanity_Sweep', 'Linux + RTL + CFD')}
                  className="px-5 py-2.5 rounded-full bg-[#111315] text-white font-mono text-xs"
                >
                  + Dispatch Cluster Regression Job ↗
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <!-- Linux Compute Cluster Nodes -->
              <div className="lg:col-span-8 p-7 rounded-[24px] bg-white border border-black/10 space-y-4">
                <div className="flex justify-between items-center text-xs font-mono text-neutral-500">
                  <span>LINUX SIMULATION SERVER FLEET (EPYC / NEOVERSE)</span>
                  <span>PROVISIONED VIA BASH / ANSIBLE</span>
                </div>
                <div className="divide-y divide-black/10">
                  ${simState.clusterNodes.map(n => html`
                    <div key=${n.nodeId} className="py-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-sm font-semibold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>${n.nodeId}</span>
                          <span className="text-xs font-normal text-neutral-400">(${n.os})</span>
                        </div>
                        <div className="text-xs text-neutral-500 font-mono mt-1">${n.cpu} • Active Job: ${n.job}</div>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-xs">
                        <span>LOAD: ${n.load}%</span>
                        <span className="text-[#13A4A9]">TEMP: ${n.tempC}°C</span>
                        <span className="px-2.5 py-1 rounded-full bg-black/5">${n.status}</span>
                      </div>
                    </div>
                  `)}
                </div>
              </div>

              <!-- Hardware DevKit / Patient Trainer Lease Card -->
              <div className="lg:col-span-4 p-7 rounded-[24px] bg-[#111315] text-white flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="text-xs font-mono text-[#D9F99D]">HARDWARE LEASE & ASSET TRACKING</div>
                  <h3 className="text-2xl font-light">AeroCare TracePro Unit #AC-9942</h3>
                  <p className="text-xs text-neutral-400">
                    Shared hospital-to-home hardware pool with automated telemetry sync and deposit lifecycle management.
                  </p>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 font-mono text-xs space-y-2">
                    <div className="flex justify-between"><span>ALLOCATED DAYS:</span><span>${simState.leaseUsedDays} / ${simState.leaseQuotaDays} Days</span></div>
                    <div className="flex justify-between"><span>COLLATERAL DEPOSIT:</span><span>$450.00 (LOCKED)</span></div>
                  </div>
                </div>
                <button
                  onClick=${() => {
                    setSimState(p => ({ ...p, leaseQuotaDays: p.leaseQuotaDays + 15 }));
                    notify('Extended Hardware Unit Lease Quota by +15 Days');
                  }}
                  className="mt-6 w-full py-3 rounded-full bg-[#D9F99D] text-black font-mono text-xs font-semibold hover:opacity-90"
                >
                  Extend Hardware Lease (+15 Days) ↗
                </button>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 09: SPATIOTEMPORAL HOTSPOT MAP & COMPONENT HYGIENE/CALIBRATION ==================== -->
        ${currentPage === 9 && html`
          <section className="space-y-8 animate-fadeIn">
            <div className="border-b border-black/15 pb-6">
              <span className="text-xs font-mono text-[#13A4A9]">PAGE 09 // SPATIOTEMPORAL HOTSPOT ANALYSIS & SENSOR STERILIZATION SCHEDULE</span>
              <h2 className="text-4xl font-light tracking-tight mt-1">
                Transient <span className="font-serif italic">4x4 Thermal Hotspot Grid</span> & Component Wear
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <!-- 4x4 Spatiotemporal Thermal Hotspot Grid + 4-Ring Wear Chart -->
              <div className="lg:col-span-7 p-7 rounded-[24px] bg-white border border-black/10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                  <div className="text-xs font-mono text-neutral-500 mb-3">4x4 DIE & VALVE THERMAL HOTSPOT MAP (°C)</div>
                  <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                    ${[34.2, 35.1, 35.4, 34.0, 35.8, 38.6, 38.4, 35.2, 35.5, 38.2, 37.9, 34.9, 33.8, 34.4, 34.1, 33.6].map((temp, idx) => html`
                      <div
                        key=${idx}
                        className="p-3 rounded-xl text-center font-semibold border border-black/5"
                        style=${{
                          backgroundColor: temp > 38 ? '#F0A7AB' : temp > 35 ? '#F0C754' : '#96C7D2',
                          color: '#111315'
                        }}
                      >
                        ${temp}°
                      </div>
                    `)}
                  </div>
                </div>

                <!-- 4-Part Concentric Disinfection & Sensor Calibration Rings -->
                <div className="flex flex-col items-center">
                  <svg viewBox="0 0 200 200" className="w-44 h-44">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#13A4A9" strokeWidth="12" strokeDasharray="410 500" strokeLinecap="round"/>
                    <circle cx="100" cy="100" r="62" fill="none" stroke="#8E90C6" strokeWidth="12" strokeDasharray="280 500" strokeLinecap="round"/>
                    <circle cx="100" cy="100" r="44" fill="none" stroke="#F0C754" strokeWidth="12" strokeDasharray="190 500" strokeLinecap="round"/>
                    <circle cx="100" cy="100" r="26" fill="none" stroke="#F0A7AB" strokeWidth="12" strokeDasharray="110 500" strokeLinecap="round"/>
                  </svg>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono mt-2">
                    <span className="text-[#13A4A9]">● Mouthpiece: 82%</span>
                    <span className="text-[#8E90C6]">● HEPA Filter: 68%</span>
                    <span className="text-[#F0C754]">● Flow Valve: 45%</span>
                    <span className="text-[#F0A7AB]">● Enclosure: 24%</span>
                  </div>
                </div>
              </div>

              <!-- Interactive Calibration & Sterilization Booking Calendar -->
              <div className="lg:col-span-5 p-7 rounded-[24px] bg-white border border-black/10 space-y-4">
                <div className="text-xs font-mono text-neutral-500">OCTOBER 2026 // CALIBRATION & DISINFECTION BOOKING</div>
                <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-xs">
                  ${Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                    const booked = simState.calibrationDays.includes(day);
                    return html`
                      <button
                        key=${day}
                        onClick=${() => toggleCalibrationDay(day)}
                        className=${`py-2 rounded-xl transition-all ${
                          booked ? 'bg-[#13A4A9] text-white font-bold shadow-sm' : 'bg-[#F6F5F0] hover:bg-black/10'
                        }`}
                      >
                        ${day}
                      </button>
                    `;
                  })}
                </div>
                <p className="text-xs font-mono text-neutral-500">
                  Scheduled Dates: Oct ${simState.calibrationDays.join(', ')} (Click any date to toggle)
                </p>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 10: CI/CD REGRESSION TRIAGE & MODELING COLLABORATION DESK ==================== -->
        ${currentPage === 10 && html`
          <section className="space-y-8 animate-fadeIn">
            <div className="border-b border-black/15 pb-6 flex flex-wrap justify-between items-end gap-4">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">PAGE 10 // AUTOMATED REGRESSION PIPELINE & MODELING ENGINEER COLLABORATION</span>
                <h2 className="text-4xl font-light tracking-tight mt-1">
                  Regression <span className="font-serif italic">Triage & Telehealth</span> Desk
                </h2>
              </div>
              <button
                onClick=${() => handleTriggerRegression('RTL_CFD_Nightly_Verification', 'Time-Indexed Co-Sim')}
                className="px-5 py-2.5 rounded-full bg-[#13A4A9] text-white font-mono text-xs font-semibold"
              >
                ▶ Run Python Regression Suite (run_regression.py)
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <!-- Automated Regression Suite Table -->
              <div className="lg:col-span-7 p-7 rounded-[24px] bg-white border border-black/10 space-y-4">
                <div className="text-xs font-mono text-neutral-500">AUTOMATED SIMULATION REGRESSION RUNS (CI/CD)</div>
                <div className="divide-y divide-black/10 font-mono text-xs">
                  ${simState.regressionRuns.map(r => html`
                    <div key=${r.id} className="py-3.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-black">${r.id} — ${r.target}</div>
                        <div className="text-neutral-400">${r.domain} • ${r.steps} steps • Seed: ${r.seed}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 font-bold">${r.status}</span>
                        <div className="text-neutral-400 mt-1">Drift: ${r.drift} (${r.runtime})</div>
                      </div>
                    </div>
                  `)}
                </div>
              </div>

              <!-- Modeling & Clinical Collaboration Log -->
              <div className="lg:col-span-5 p-7 rounded-[24px] bg-white border border-black/10 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="text-xs font-mono text-neutral-500">MODELING & CLINICAL COLLABORATION STREAM</div>
                  <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                    ${chatLogs.map((c, i) => html`
                      <div key=${i} className="p-3.5 rounded-2xl bg-[#F6F5F0] text-xs space-y-1">
                        <div className="font-mono font-semibold text-[#13A4A9] flex justify-between">
                          <span>${c.sender}</span>
                          <span className="text-neutral-400">${c.time}</span>
                        </div>
                        <p className="text-neutral-700">${c.text}</p>
                      </div>
                    `)}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-black/10">
                  <input
                    value=${chatInput}
                    onChange=${e => setChatInput(e.target.value)}
                    placeholder="Post note to modeling / clinical team..."
                    className="flex-1 px-4 py-2.5 rounded-full bg-[#F6F5F0] text-xs font-mono focus:outline-none"
                  />
                  <button
                    onClick=${() => {
                      if (!chatInput.trim()) return;
                      setChatLogs(p => [...p, { sender: 'Jiafeng Du (SimInfra Eng)', time: 'NOW', text: chatInput }]);
                      setChatInput('');
                    }}
                    className="px-5 py-2.5 rounded-full bg-[#111315] text-white font-mono text-xs"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 11: CROSS-PROJECT BENCHMARKS & COHORT LEADERBOARD ==================== -->
        ${currentPage === 11 && html`
          <section className="space-y-8 animate-fadeIn">
            <div className="border-b border-black/15 pb-6">
              <span className="text-xs font-mono text-[#13A4A9]">PAGE 11 // SCALABILITY BENCHMARKS & REHAB COHORT LEADERBOARD</span>
              <h2 className="text-4xl font-light tracking-tight mt-1">
                Cross-Project <span className="font-serif italic">Solver Throughput</span> & Cohort Ranking
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 p-7 rounded-[24px] bg-white border border-black/10 space-y-4">
                <div className="text-xs font-mono text-neutral-500">MULTI-NODE SIMULATION THROUGHPUT & COHORT SCORE</div>
                <svg viewBox="0 0 560 210" className="w-full">
                  ${[65, 95, 130, 110, 155, 175, 160, 190].map((h, i) => html`
                    <g key=${i}>
                      <rect x=${40 + i * 62} y=${190 - h} width="16" height=${h} rx="4" fill="#13A4A9"/>
                      <rect x=${60 + i * 62} y=${190 - h * 0.82} width="16" height=${h * 0.82} rx="4" fill="#8E90C6"/>
                    </g>
                  `)}
                  <polyline points="48,110 110,85 172,55 234,75 296,40 358,28 420,42 482,20" fill="none" stroke="#F0C754" strokeWidth="3"/>
                </svg>
              </div>

              <div className="lg:col-span-5 p-7 rounded-[24px] bg-white border border-black/10 space-y-3">
                <div className="text-xs font-mono text-neutral-500">VERIFIED BENCHMARK COHORT (A-Z)</div>
                ${[
                  { rank: '01', name: 'Xiaoming Li (Node-USW-01)', score: '4,308 pts', throughput: '1.24M steps/s' },
                  { rank: '02', name: 'Ali (Node-USW-02)', score: '4,120 pts', throughput: '1.18M steps/s' },
                  { rank: '03', name: 'Bage (Node-RTL-03)', score: '3,890 pts', throughput: '1.09M steps/s' },
                  { rank: '04', name: 'Ms. Bai (Node-EDA-04)', score: '3,640 pts', throughput: '980k steps/s' }
                ].map(u => html`
                  <div key=${u.rank} className="p-3.5 rounded-2xl bg-[#F6F5F0] flex items-center justify-between font-mono text-xs">
                    <div>
                      <span className="font-bold text-[#13A4A9] mr-2">#${u.rank}</span>
                      <span className="font-semibold text-black">${u.name}</span>
                    </div>
                    <div className="text-right">
                      <div>${u.score}</div>
                      <div className="text-[10px] text-neutral-500">${u.throughput}</div>
                    </div>
                  </div>
                `)}
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 12: EXPERIMENT VERSIONING & 20-TILE CO-DESIGN VAULT ==================== -->
        ${currentPage === 12 && html`
          <section className="space-y-8 animate-fadeIn">
            <div className="border-b border-black/15 pb-6 flex flex-wrap justify-between items-end gap-4">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">PAGE 12 // EXPERIMENT REPRODUCIBILITY VAULT & 20-TILE CO-DESIGN MATRIX</span>
                <h2 className="text-4xl font-light tracking-tight mt-1">
                  the art of <span className="font-semibold">co-design</span> & Reproducible Artifacts
                </h2>
              </div>
              <button
                onClick=${() => notify('Exported Signed SHA-256 Simulation & Rehab Manifest JSON')}
                className="px-5 py-2.5 rounded-full bg-[#111315] text-white font-mono text-xs"
              >
                Export Reproducible Artifact Bundle (.json) ↗
              </button>
            </div>

            <!-- 5x4 = 20 Tile Co-Design Inspired Color Block Matrix -->
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
              ${[
                { code: '01', title: 'RTL Power Pipe', bg: '#F0A7AB', tag: 'VERILATOR' },
                { code: '02', title: 'CFD Mesh ROM', bg: '#2B5B84', tag: '1.2M CELLS', light: true },
                { code: '03', title: 'Time-Step Kernel', bg: '#F0C754', tag: 'dt = 1.0ms' },
                { code: '04', title: 'Hotspot Solver', bg: '#96C7D2', tag: '4x4 RC GRID' },
                { code: '05', title: 'Linux Farm CI', bg: '#13A4A9', tag: 'UBUNTU 22.04', light: true },
                { code: '06', title: 'Python Harness', bg: '#5B7042', tag: 'PYTEST_SIM', light: true },
                { code: '07', title: 'BLE GATT 0x181A', bg: '#E6D6C8', tag: 'LOW_ENERGY' },
                { code: '08', title: 'Piezo Bridge', bg: '#D94E34', tag: '1kHz ADC', light: true },
                { code: '09', title: 'Valve Actuator', bg: '#F2C5BB', tag: 'PWM_COIL' },
                { code: '10', title: 'SHA-256 Seed', bg: '#E8C547', tag: 'BIT_EXACT' },
                { code: '11', title: 'FVC Maneuver', bg: '#F0C754', tag: '3.89 LITERS' },
                { code: '12', title: 'FEV1 Ratio', bg: '#B7D3D8', tag: '84.3% NORM' },
                { code: '13', title: 'Co-Sim Barrier', bg: '#E39D44', tag: 'MPI_SYNC' },
                { code: '14', title: 'Express REST', bg: '#3E5496', tag: 'NODE_API', light: true },
                { code: '15', title: 'React 18 ESM', bg: '#B5C95A', tag: 'MODULAR_UI' },
                { code: '16', title: 'Sterile UV-C', bg: '#2F58A6', tag: 'ISO_18562', light: true },
                { code: '17', title: 'Lease Ledger', bg: '#EAC7C1', tag: '30D_QUOTA' },
                { code: '18', title: 'Thoracic Rx', bg: '#A5C4D4', tag: 'MD_VERIFIED' },
                { code: '19', title: 'GitHub Actions', bg: '#C7BFD9', tag: 'AUTO_PAGES' },
                { code: '20', title: '200m Milestone', bg: '#88C3B8', tag: 'REHAB_BADGE' }
              ].map(tile => html`
                <div
                  key=${tile.code}
                  onClick=${() => notify(`Artifact Tile #${tile.code}: ${tile.title} (${tile.tag}) — Verified`)}
                  className="aspect-square rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-sm"
                  style=${{ backgroundColor: tile.bg, color: tile.light ? '#FFFFFF' : '#111315' }}
                >
                  <div className="flex justify-between items-center font-mono text-[11px] opacity-80">
                    <span>#${tile.code}</span>
                    <span>${tile.tag}</span>
                  </div>
                  <div className="text-lg font-medium leading-snug">${tile.title}</div>
                </div>
              `)}
            </div>
          </section>
        `}

      </main>

      <!-- Minimalist Footer with Multi-File Architecture Indicator -->
      <footer className="border-t border-black/10 px-4 lg:px-10 py-6 mt-12 bg-white/60">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <div>
            AEROCARE // TRACE-DRIVEN SIMULATION INFRASTRUCTURE & PULMONARY TELEMETRY (12-PAGE FULL-STACK SUITE)
          </div>
          <div className="flex items-center gap-4">
            <span>Frontend: React 18 ESM (src/app.js)</span>
            <span>•</span>
            <span>Backend: Node/Express (server/server.js)</span>
            <span>•</span>
            <span>Tooling: C++20 & Python (engine/ + scripts/)</span>
          </div>
        </div>
      </footer>
    </div>
  `;
}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(AeroCareSimApp));
