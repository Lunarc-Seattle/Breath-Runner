import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import htm from 'https://esm.sh/htm@3.1.1';
import { PAGES_META, INITIAL_SIM_STATE } from './data/simStore.js';

const html = htm.bind(React.createElement);

function AeroCareBreathApp() {
  const [currentPage, setCurrentPage] = useState(1);
  const [state, setState] = useState(INITIAL_SIM_STATE);
  const [toast, setToast] = useState(null);
  const [testingBreath, setTestingBreath] = useState(false);
  const [liveFlowLpm, setLiveFlowLpm] = useState(385);
  const [liveVolumeL, setLiveVolumeL] = useState(3.89);
  const [gameActive, setGameActive] = useState(false);
  const [inhaling, setInhaling] = useState(false);
  const [gameScore, setGameScore] = useState(4308);
  const canvasRef = useRef(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const navTo = (id) => {
    setCurrentPage(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRunSpirometry = () => {
    if (testingBreath) return;
    setTestingBreath(true);
    notify('Sampling 1,000Hz Inspiratory & Expiratory Airflow...');
    setTimeout(() => {
      const fvc = Number((3.7 + Math.random() * 0.45).toFixed(2));
      const fev1 = Number((fvc * 0.84).toFixed(2));
      const pef = Math.floor(450 + Math.random() * 45);
      setLiveFlowLpm(pef);
      setLiveVolumeL(fvc);
      setTestingBreath(false);
      setState(p => ({
        ...p,
        traceRuns: [...p.traceRuns, { id: `TEST-${Math.floor(105 + Math.random() * 800)}`, date: '2026-10-25', fvc, fev1, pef, ratio: '84.8%', impedance: '2.5 kPa' }]
      }));
      notify(`Saved! FVC: ${fvc}L | FEV1: ${fev1}L | PEF: ${pef} L/min`);
    }, 900);
  };

  const handleTriggerRegression = () => {
    const newRun = {
      id: `REG-${Math.floor(8845 + Math.random() * 900)}`,
      target: 'Breath_Flow_Calibration_Sweep',
      domain: 'Airflow Telemetry Pipeline',
      steps: '180,000',
      runtime: '1.12s',
      drift: '0.003L',
      seed: '0x94FA21C0',
      status: 'PASS'
    };
    setState(p => ({ ...p, regressionRuns: [newRun, ...p.regressionRuns] }));
    notify(`Regression ${newRun.id} PASSED (0.003L drift)`);
  };

  useEffect(() => {
    if (currentPage !== 6 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId, playerY = 170, velY = 0, scrollX = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#D4E4E8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#96C7D2';
      ctx.beginPath();
      ctx.moveTo(0, 240); ctx.lineTo(190, 80); ctx.lineTo(380, 200); ctx.lineTo(590, 65); ctx.lineTo(880, 240);
      ctx.fill();
      if (gameActive) {
        scrollX += 2.5;
        velY = inhaling ? -3.5 : velY + 0.22;
        playerY = Math.max(45, Math.min(200, playerY + velY));
      }
      for (let i = 0; i < 10; i++) {
        const cx = ((i * 120 - scrollX) % 1100 + 1100) % 1100;
        ctx.fillStyle = '#F0C754';
        ctx.beginPath(); ctx.arc(cx, 110 + (i % 3) * 30, 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = inhaling ? '#13A4A9' : '#F0A7AB';
      ctx.beginPath(); ctx.arc(110, playerY, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#153B40';
      ctx.fillRect(0, 230, canvas.width, 50);
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [currentPage, gameActive, inhaling]);

  return html`
    <div className="min-h-screen flex flex-col justify-between">
      <header className="sticky top-0 z-50 bg-[#F6F5F0]/95 backdrop-blur-md border-b border-black/10 px-4 lg:px-8 py-3">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick=${() => navTo(1)}>
            <div className="w-8 h-8 rounded-full bg-[#13A4A9] text-white flex items-center justify-center font-mono text-xs font-bold">JY</div>
            <div>
              <div className="font-semibold tracking-tight text-sm">BREATH TRAINING // JIE (FIA) YIN</div>
              <p className="text-[11px] text-neutral-500 font-mono">Gamified Breathing Training for Lung Recovery at Home</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto py-1 max-w-full no-scrollbar">
            ${PAGES_META.map(p => html`
              <button key=${p.id} onClick=${() => navTo(p.id)}
                className=${`px-2.5 py-1.5 rounded-full text-xs font-mono whitespace-nowrap ${currentPage === p.id ? 'bg-[#111315] text-white' : 'text-neutral-600 hover:bg-black/5'}`}>
                <span className="text-[#13A4A9] mr-1">${p.code}</span>${p.name}
              </button>
            `)}
          </nav>
        </div>
      </header>

      ${toast && html`<div className="fixed bottom-6 right-6 z-50 bg-[#111315] text-white px-5 py-3 rounded-2xl shadow-xl font-mono text-xs">● ${toast}</div>`}

      <main className="max-w-[1440px] w-full mx-auto px-4 lg:px-10 py-8 flex-1">
        ${currentPage === 1 && html`
          <section className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 border border-black/15 rounded-[28px] overflow-hidden bg-white">
              <div className="lg:col-span-7 p-8 lg:p-14 flex flex-col justify-between bg-[#F6F5F0] border-r border-black/10">
                <div className="space-y-5">
                  <span className="px-3 py-1 rounded-full bg-white border border-black/10 text-xs font-mono">01 WELCOME // DESIGNED & ENGINEERED BY JIE (FIA) YIN</span>
                  <h1 className="text-4xl lg:text-6xl font-light tracking-tight leading-[1.08]">
                    Gamified <span className="font-serif italic text-[#13A4A9]">Breathing Training</span> for Lung Recovery at Home.
                  </h1>
                  <p className="text-neutral-600 text-base">
                    A companion web & cloud platform for a smart breathing trainer: Bluetooth device pairing, digital lung-capacity tests, map-based training games, community leaderboards, disinfection booking, and hospital device rental.
                  </p>
                </div>
                <div className="pt-8 flex flex-wrap gap-3">
                  <button onClick=${() => navTo(3)} className="px-6 py-3.5 rounded-full bg-[#13A4A9] text-white text-sm font-medium">Good morning, welcome back — Log in ↗</button>
                  <button onClick=${() => navTo(2)} className="px-6 py-3.5 rounded-full bg-white border border-black/15 text-sm font-mono">02 Pair Device →</button>
                  <button onClick=${() => navTo(6)} className="px-6 py-3.5 rounded-full bg-[#111315] text-white text-sm font-mono">Play Forest Game (06)</button>
                </div>
              </div>
              <div className="lg:col-span-5 p-8 lg:p-12 flex flex-col justify-between">
                <div className="text-xs font-mono text-neutral-400">COLOR SYSTEM // #13A4A9 • #8E90C6 • #F0C754 • #F0A7AB • #96C7D2</div>
                <div className="p-6 rounded-2xl bg-[#F6F5F0] my-4 space-y-2">
                  <div className="text-sm font-semibold">Jie (Fia) Yin — UX/UI, Product & Full-Stack Engineering</div>
                  <div className="text-xs font-mono text-neutral-500">React 18 • Node/Express API • C++20 Spirometry DSP • Python CI</div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center font-mono">
                  <div className="p-3 rounded-xl bg-[#13A4A9]/10"><div className="text-xl font-bold text-[#13A4A9]">200m</div><div className="text-[10px]">Trained</div></div>
                  <div className="p-3 rounded-xl bg-[#8E90C6]/15"><div className="text-xl font-bold text-[#8E90C6]">3.89L</div><div className="text-[10px]">Peak FVC</div></div>
                  <div className="p-3 rounded-xl bg-[#F0C754]/20"><div className="text-xl font-bold">4,308</div><div className="text-[10px]">Score</div></div>
                </div>
              </div>
            </div>
          </section>
        `}

        ${currentPage === 2 && html`
          <section className="rounded-[28px] bg-[#111315] text-white p-8 lg:p-12 space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-white/10 pb-6">
              <div>
                <span className="text-xs font-mono text-[#D9F99D]">02 PAIR THE DEVICE // BLUETOOTH SMART BREATHING TRAINER</span>
                <h2 className="text-4xl font-light mt-1">Connect Your <span className="font-serif italic text-[#96C7D2]">Smart Breathing Trainer</span></h2>
              </div>
              <button onClick=${() => notify('Bluetooth Connected: Smart Breathing Trainer (Battery 70%)')} className="px-5 py-2.5 rounded-full bg-[#D9F99D] text-black font-mono text-xs font-semibold">
                ● AUTO-CONNECTED VIA BLUETOOTH (70%)
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="text-[#96C7D2]">01 / PRESS AND HOLD BUTTON</div>
                <div className="text-lg font-sans">Wake Up Portable Trainer</div>
                <p className="text-neutral-400">Ergonomic Rhino-modeled PP & medical silicone shell.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="text-[#F0C754]">02 / TURN ON BLUETOOTH</div>
                <div className="text-lg font-sans">1,000Hz Airflow Sensor Stream</div>
                <p className="text-neutral-400">Real-time inhale & exhale pressure telemetry.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="text-[#F0A7AB]">03 / AUTO-CONNECT</div>
                <div className="text-lg font-sans">Synced with Hospital Cloud</div>
                <button onClick=${() => navTo(3)} className="text-[#D9F99D] pt-2 block">Proceed to 03 Home ↗</button>
              </div>
            </div>
          </section>
        `}

        ${currentPage === 3 && html`
          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-black/15 pb-5">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">03 HOME // DEVICE STATUS AT A GLANCE</span>
                <h2 className="text-4xl font-light mt-1">Good morning, <span className="font-serif italic">Xiaoming</span></h2>
              </div>
              <button onClick=${() => navTo(6)} className="px-6 py-2.5 rounded-full bg-[#13A4A9] text-white font-mono text-xs font-semibold">Start Training (06) ↗</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-7 rounded-3xl bg-white border border-black/10 space-y-3">
                <div className="text-xs font-mono text-neutral-400">DEVICE STATUS</div>
                <div className="text-2xl font-light">Battery 70% • Phone Connected</div>
                <button onClick=${() => navTo(2)} className="text-xs font-mono text-[#13A4A9]">Pair / Inspect Device (02) ↗</button>
              </div>
              <div className="p-7 rounded-3xl bg-white border border-black/10 space-y-3">
                <div className="text-xs font-mono text-neutral-400">LUNG TRAINING</div>
                <div className="text-2xl font-light">${state.selectedScenario.name}</div>
                <button onClick=${() => navTo(5)} className="text-xs font-mono text-[#13A4A9]">Choose a Map (05) ↗</button>
              </div>
              <div className="p-7 rounded-3xl bg-[#111315] text-white space-y-3">
                <div className="text-xs font-mono text-[#D9F99D]">HYGIENE & RENTAL</div>
                <div className="text-2xl font-light">Disinfection & Lease Active</div>
                <button onClick=${() => navTo(9)} className="text-xs font-mono text-[#D9F99D]">Book Disinfection (09) ↗</button>
              </div>
            </div>
          </section>
        `}

        ${currentPage === 4 && html`
          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-black/15 pb-5">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">04 SPIROMETRY LAB // DIGITAL LUNG-CAPACITY TEST</span>
                <h2 className="text-4xl font-light mt-1">Quantified <span className="font-serif italic">Lung Function</span> Measurement</h2>
              </div>
              <button onClick=${handleRunSpirometry} className="px-6 py-2.5 rounded-full bg-[#13A4A9] text-white font-mono text-xs font-semibold">
                ${testingBreath ? 'SAMPLING BREATH...' : '▶ RUN SPIROMETRY TEST'}
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-7 rounded-3xl bg-white border border-black/10 space-y-4">
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div className="p-4 rounded-2xl bg-[#F6F5F0]"><div className="text-xs text-neutral-500">PEAK FLOW</div><div className="text-2xl font-bold text-[#13A4A9]">${liveFlowLpm} L/min</div></div>
                  <div className="p-4 rounded-2xl bg-[#F6F5F0]"><div className="text-xs text-neutral-500">VITAL CAPACITY (FVC)</div><div className="text-2xl font-bold text-[#8E90C6]">${liveVolumeL} L</div></div>
                </div>
                <p className="text-xs text-neutral-500 font-mono">Replaces traditional 3-ball spirometers with quantified flow-volume curves.</p>
              </div>
              <div className="p-7 rounded-3xl bg-white border border-black/10 space-y-2 font-mono text-xs">
                <div className="text-neutral-400 mb-2">SPIROMETRY TEST HISTORY</div>
                ${state.traceRuns.map(t => html`
                  <div key=${t.id} className="py-2.5 border-b border-black/10 flex justify-between">
                    <span>${t.id} (${t.date}) — FVC: ${t.fvc}L | FEV1: ${t.fev1}L</span>
                    <span className="text-[#13A4A9] font-semibold">${t.ratio}</span>
                  </div>
                `)}
              </div>
            </div>
          </section>
        `}

        ${currentPage === 5 && html`
          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-black/15 pb-5">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">05 CHOOSE A MAP // PICK A SCENE AND A LEVEL</span>
                <h2 className="text-4xl font-light mt-1">Choose a <span className="font-serif italic">Training Map</span></h2>
              </div>
              <button onClick=${() => navTo(6)} className="px-6 py-2.5 rounded-full bg-[#13A4A9] text-white font-mono text-xs font-semibold">Start Training (06) ↗</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              ${[
                { id: 'MAP-01', name: 'Forest · Level 1', kpa: 1.5, color: '#13A4A9', desc: 'Misty pine forest & mountain cliffs. Ideal for daily home recovery.' },
                { id: 'MAP-02', name: 'Desert Sunset · Level 2', kpa: 2.5, color: '#8E90C6', desc: 'Moderate dual-mode valve resistance to build respiratory muscle strength.' },
                { id: 'MAP-03', name: 'Glacier Peak · Level 3', kpa: 3.5, color: '#96C7D2', desc: 'High-capacity endurance course (Unlocks at 250 min).' }
              ].map(m => html`
                <div key=${m.id} onClick=${() => { setState(p => ({ ...p, selectedScenario: { id: m.id, name: m.name, valveKpa: m.kpa } })); notify(`Selected ${m.name}`); }}
                  className="p-7 rounded-3xl bg-white border border-black/15 cursor-pointer hover:border-[#13A4A9] space-y-3">
                  <span className="px-3 py-1 rounded-full text-white font-mono text-xs" style=${{ backgroundColor: m.color }}>${m.name}</span>
                  <h3 className="text-2xl font-light">${m.name}</h3>
                  <p className="text-xs text-neutral-600">${m.desc}</p>
                  <div className="text-xs font-mono text-neutral-400 pt-2">VALVE RESISTANCE: ${m.kpa} kPa</div>
                </div>
              `)}
            </div>
          </section>
        `}

        ${currentPage === 6 && html`
          <section className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs font-mono text-[#13A4A9]">06 TRAINING GAME // FOREST, LEVEL 1</span>
                <h2 className="text-3xl font-light">${state.selectedScenario.name} — Score: ${gameScore}</h2>
              </div>
              <button onClick=${() => setGameActive(!gameActive)} className="px-5 py-2 rounded-full bg-[#111315] text-white font-mono text-xs">
                ${gameActive ? '⏸ PAUSE GAME' : '▶ START GAME'}
              </button>
            </div>
            <div className="p-4 rounded-3xl bg-white border border-black/15 space-y-4">
              <canvas ref=${canvasRef} width="900" height="280" className="w-full h-[280px] rounded-2xl border border-black/10"></canvas>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-neutral-500">Hold button to inhale, jump across cliffs, and collect gold coins.</span>
                <button
                  onMouseDown=${() => { setGameActive(true); setInhaling(true); }}
                  onMouseUp=${() => setInhaling(false)}
                  className="px-8 py-3 rounded-full bg-[#13A4A9] text-white font-mono text-xs font-semibold">
                  ${inhaling ? '▲ INHALING DEEPLY...' : 'HOLD TO INHALE & JUMP'}
                </button>
              </div>
            </div>
          </section>
        `}

        ${currentPage === 7 && html`
          <section className="space-y-6">
            <h2 className="text-4xl font-light border-b border-black/15 pb-4">07 Multiplayer <span className="font-serif italic">Co-Op & PK</span> Mode</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-7 rounded-3xl bg-white border border-black/10 space-y-3">
                <div className="text-xs font-mono text-[#13A4A9]">PLAYER 1 // XIAOMING</div>
                <div className="text-2xl font-light">4,308 pts • FVC 3.89 L</div>
                <div className="h-3 rounded-full bg-neutral-100"><div className="h-full bg-[#13A4A9] w-[86%] rounded-full"></div></div>
              </div>
              <div className="p-7 rounded-3xl bg-white border border-black/10 space-y-3">
                <div className="text-xs font-mono text-[#8E90C6]">PLAYER 2 // ALI</div>
                <div className="text-2xl font-light">4,120 pts • FVC 3.75 L</div>
                <div className="h-3 rounded-full bg-neutral-100"><div className="h-full bg-[#8E90C6] w-[82%] rounded-full"></div></div>
              </div>
            </div>
          </section>
        `}

        ${currentPage === 8 && html`
          <section className="space-y-6">
            <h2 className="text-4xl font-light border-b border-black/15 pb-4">08 Hospital <span className="font-serif italic">Device Rental</span> & Telemetry Cloud</h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 p-7 rounded-3xl bg-white border border-black/10 space-y-3 font-mono text-xs">
                <div className="text-neutral-400">CLOUD TELEMETRY SERVERS</div>
                ${state.serverNodes.map(n => html`
                  <div key=${n.nodeId} className="py-3 border-b border-black/10 flex justify-between">
                    <span>${n.nodeId} (${n.os}) — ${n.job}</span>
                    <span className="text-[#13A4A9] font-bold">${n.status} (${n.load}%)</span>
                  </div>
                `)}
              </div>
              <div className="lg:col-span-4 p-7 rounded-3xl bg-[#111315] text-white space-y-4">
                <div className="text-xs font-mono text-[#D9F99D]">SHARED DEVICE LEASE</div>
                <div className="text-2xl font-light">Day ${state.leaseUsedDays} of ${state.leaseQuotaDays}</div>
                <p className="text-xs text-neutral-400">Economical shared rental from Peking Univ. Hospital (Deposit ¥228).</p>
                <button onClick=${() => { setState(p => ({ ...p, leaseQuotaDays: p.leaseQuotaDays + 15 })); notify('Extended lease +15 days'); }}
                  className="w-full py-3 rounded-full bg-[#D9F99D] text-black font-mono text-xs font-semibold">Extend Rental (+15 Days)</button>
              </div>
            </div>
          </section>
        `}

        ${currentPage === 9 && html`
          <section className="space-y-6">
            <h2 className="text-4xl font-light border-b border-black/15 pb-4">09 Hygiene & <span className="font-serif italic">Disinfection Booking</span></h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-7 rounded-3xl bg-white border border-black/10 space-y-3">
                <div className="text-xs font-mono text-neutral-400">DISINFECTION NEEDS BY PART</div>
                ${state.disinfectionParts.map(d => html`
                  <div key=${d.part} className="p-3 rounded-2xl bg-[#F6F5F0] flex justify-between font-mono text-xs">
                    <span>${d.part} — ${d.tip}</span>
                    <span className="font-bold" style=${{ color: d.color }}>${d.pct}%</span>
                  </div>
                `)}
              </div>
              <div className="p-7 rounded-3xl bg-white border border-black/10 space-y-4">
                <div className="text-xs font-mono text-neutral-400">BOOK DISINFECTION (APRIL CALENDAR)</div>
                <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-xs">
                  ${Array.from({ length: 30 }, (_, i) => i + 1).map(day => html`
                    <button key=${day}
                      onClick=${() => {
                        setState(p => ({ ...p, bookedDays: p.bookedDays.includes(day) ? p.bookedDays.filter(x => x !== day) : [...p.bookedDays, day] }));
                        notify(`Toggled April ${day} disinfection booking`);
                      }}
                      className=${`py-2 rounded-xl ${state.bookedDays.includes(day) ? 'bg-[#13A4A9] text-white font-bold' : 'bg-[#F6F5F0]'}`}>
                      ${day}
                    </button>
                  `)}
                </div>
              </div>
            </div>
          </section>
        `}

        ${currentPage === 10 && html`
          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-black/15 pb-4">
              <h2 className="text-4xl font-light">10 Physician <span className="font-serif italic">Telehealth & CI Pipeline</span></h2>
              <button onClick=${handleTriggerRegression} className="px-5 py-2.5 rounded-full bg-[#13A4A9] text-white font-mono text-xs">▶ Run Python Regression Suite</button>
            </div>
            <div className="p-7 rounded-3xl bg-white border border-black/10 space-y-3 font-mono text-xs">
              ${state.regressionRuns.map(r => html`
                <div key=${r.id} className="py-3 border-b border-black/10 flex justify-between">
                  <span>${r.id} — ${r.target} (${r.steps} samples)</span>
                  <span className="text-emerald-600 font-bold">${r.status} (Drift: ${r.drift})</span>
                </div>
              `)}
            </div>
          </section>
        `}

        ${currentPage === 11 && html`
          <section className="space-y-6">
            <h2 className="text-4xl font-light border-b border-black/15 pb-4">11 Community & <span className="font-serif italic">Friends Ranking</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              ${['01 Ali — 4,308 pts', '02 Bage — 4,120 pts', '03 Ms. Bai — 3,890 pts', '04 Mr. Bi — 3,640 pts'].map(f => html`
                <div key=${f} className="p-5 rounded-2xl bg-white border border-black/10 flex justify-between">
                  <span className="font-semibold">${f}</span>
                  <span className="text-[#13A4A9]">PEKING UNIV. COHORT</span>
                </div>
              `)}
            </div>
          </section>
        `}

        ${currentPage === 12 && html`
          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-black/15 pb-4">
              <h2 className="text-4xl font-light">12 Profile, <span className="font-serif italic">Activity Log & Badges</span></h2>
              <span className="font-mono text-xs">Activity Log: 4.3083 • Total: 200 min</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              ${['Lv.1 Crown', 'Lv.2 Medal', '200m Trained', 'Forest Lv.1', 'FVC 3.89L', 'BLE Synced', 'Sterile Care', 'Co-Op Team', 'Hospital Lease', 'Jie (Fia) Yin'].map((b, i) => html`
                <div key=${b} className="p-5 rounded-2xl bg-white border border-black/10 font-mono text-xs flex flex-col justify-between aspect-square"
                  style=${{ backgroundColor: ['#F0A7AB', '#96C7D2', '#F0C754', '#13A4A9', '#8E90C6'][i % 5] }}>
                  <span>#0${i + 1}</span>
                  <span className="text-base font-sans font-semibold text-black">${b}</span>
                </div>
              `)}
            </div>
          </section>
        `}
      </main>

      <footer className="border-t border-black/10 px-8 py-5 text-xs font-mono text-neutral-500 flex justify-between">
        <span>GAMIFIED BREATHING TRAINING FOR LUNG RECOVERY — JIE (FIA) YIN</span>
        <span>React 18 • Express API • C++20 Spirometry • Python CI</span>
      </footer>
    </div>
  `;
}

createRoot(document.getElementById('root')).render(React.createElement(AeroCareBreathApp));
