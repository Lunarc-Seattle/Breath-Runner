import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import htm from 'https://esm.sh/htm@3.1.1';
import { PAGES_META, INITIAL_SIM_STATE, PDF_COLORS, solidStyle } from './data/simStore.js';
import { ForestRunnerStage } from './components/ForestRunnerStage.js';
import { NavDrawer } from './components/NavDrawer.js';
import { bluetoothSupport, SUPPORT_MESSAGES, pairTrainer, describePairError } from './services/trainerBluetooth.js';

const html = htm.bind(React.createElement);

function AeroCareClientApp() {
  const [currentPage, setCurrentPage] = useState(1);
  const [state, setState] = useState(INITIAL_SIM_STATE);
  const [toast, setToast] = useState(null);

  // Spirometry & Game States
  const [testingBreath, setTestingBreath] = useState(false);
  const [liveFlow, setLiveFlow] = useState(392);
  const [liveFvc, setLiveFvc] = useState(3.89);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const navTo = (id) => {
    setCurrentPage(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real Web Bluetooth pairing: the browser's chooser lists nearby AeroCare trainers.
  const trainerRef = useRef(null);
  const handleDisconnect = () => {
    trainerRef.current = null;
    setState(p => ({ ...p, bleConnected: false, deviceName: null, batteryPct: null }));
  };
  const handleBluetoothPair = async () => {
    if (state.bleScanning) return;
    const support = bluetoothSupport();
    if (support !== 'ok') {
      setState(p => ({ ...p, bleError: SUPPORT_MESSAGES[support] }));
      notify(SUPPORT_MESSAGES[support]);
      return;
    }
    setState(p => ({ ...p, bleScanning: true, bleError: null }));
    try {
      const trainer = await pairTrainer({ onDisconnect: () => {
        handleDisconnect();
        notify('Trainer disconnected.');
      } });
      trainerRef.current = trainer;
      setState(p => ({ ...p, bleScanning: false, bleConnected: true, deviceName: trainer.name, batteryPct: trainer.battery }));
      notify(`Connected to ${trainer.name}${trainer.battery !== null ? ` (battery ${trainer.battery}%)` : ''}`);
    } catch (err) {
      const message = describePairError(err);
      setState(p => ({ ...p, bleScanning: false, bleConnected: false, bleError: message }));
      notify(message);
    }
  };
  const handleBluetoothDisconnect = () => {
    trainerRef.current?.disconnect();
    handleDisconnect();
  };

  // Select Map & Optionally Jump to Game
  const handleSelectMap = (mapObj, startImmediately = false) => {
    setState(p => ({
      ...p,
      lastMap: {
        ...p.lastMap,
        id: mapObj.id,
        name: mapObj.name,
        valveKpa: mapObj.kpa,
        targetL: mapObj.targetL,
        lastPlayed: 'Selected Just Now'
      }
    }));
    if (startImmediately) {
      navTo(4);
      notify(`Launching ${mapObj.name} (${mapObj.kpa} kPa resistance)...`);
    } else {
      notify(`Switched active training map to ${mapObj.name}`);
    }
  };

  return html`
    <div className="min-h-screen flex flex-col justify-between">
      <!-- ==================== TOP BAR: HOME MARK + HOVER-REVEAL PAGE DRAWER ==================== -->
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-10 py-3.5">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-4">
          <${NavDrawer} pages=${PAGES_META} currentPage=${currentPage} onNavigate=${navTo} />

          <!-- Center/Right Quick Status & Profile Pill -->
          <div className="flex items-center gap-3">
            <!-- Inline Bluetooth Pill -->
            <button
              onClick=${handleBluetoothPair}
              title=${state.bleConnected ? 'Trainer connected' : 'Pair your AeroCare trainer'}
              className=${`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-mono font-medium transition-colors ${
                state.bleConnected ? 'bg-[#13A4A9]/10 text-[#0B7377] hover:bg-[#13A4A9]/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className=${`w-2 h-2 rounded-full ${state.bleConnected ? 'bg-[#0F8387]' : state.bleScanning ? 'bg-[#71739E] animate-pulse' : 'bg-slate-400'}`}></span>
              <span>${state.bleScanning
                ? 'Searching…'
                : state.bleConnected
                  ? `${state.deviceName}${state.batteryPct !== null ? ` • ${state.batteryPct}%` : ''}`
                  : 'No trainer · Pair'}</span>
            </button>

            <!-- Quick Profile Avatar Button (Jumps to Page 12 Profile) -->
            <button
              onClick=${() => navTo(12)}
              className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-2xl bg-[#8E90C6]/15 hover:bg-[#8E90C6]/25 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#71739E] text-white flex items-center justify-center text-xs font-bold">
                XM
              </div>
              <span className="text-xs font-semibold text-slate-700">${state.userName}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Toast Notification -->
      ${toast && html`
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E2432] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-white/15 flex items-center gap-3 font-mono text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F0C754]"></span>
          <span>${toast}</span>
        </div>
      `}

      <!-- ==================== MAIN CONTENT AREA ==================== -->
      <main className="max-w-[1380px] w-full mx-auto px-4 lg:px-10 py-8 flex-1">

        <!-- ==================== PAGE 01: USER WELCOME, RESUME / PICK MAP & INLINE BLE PAIRING ==================== -->
        ${currentPage === 1 && html`
          <section className="space-y-8 animate-page">
            <!-- Hero Greeting & Inline Bluetooth Pairing Card -->
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <!-- Left 8 Cols: Warm Patient Greeting & "Resume or Pick Map?" Prompt -->
              <div className="lg:col-span-8 rounded-[32px] bg-white p-8 lg:p-10 border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <!-- Decorative PDF Palette Blobs -->
                <div className=" -right-12 -top-12 w-48 h-48 rounded-full opacity-20 pointer-events-none" style=${{ backgroundColor: PDF_COLORS.purple, position: 'absolute' }}></div>
                <div className=" right-24 -bottom-16 w-40 h-40 rounded-full opacity-20 pointer-events-none" style=${{ backgroundColor: PDF_COLORS.yellow, position: 'absolute' }}></div>

                <div className="space-y-4 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold" style=${{ backgroundColor: '#13A4A918', color: PDF_COLORS.tealInk }}>
                    <span>🌿 Daily Lung Recovery Companion</span>
                    <span>•</span>
                    <span>Day 18 Streak</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                    Hi, ${state.userName}! 👋<br/>
                    <span className="font-normal text-slate-600 text-2xl sm:text-3xl">
                      What map would you like to practice today, or resume your last session?
                    </span>
                  </h1>
                </div>

                <!-- Primary Action Cards: Resume Last Session VS Choose New Map -->
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 relative z-10">
                  <!-- Option A: Resume Last Session -->
                  <div className="p-5 rounded-3xl text-white flex flex-col justify-between shadow-md" style=${{ backgroundColor: PDF_COLORS.tealDeep }}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span>RESUME LAST PRACTICE</span>
                        <span>${state.lastMap.progressPct}% DONE</span>
                      </div>
                      <div className="text-2xl font-bold">${state.lastMap.name}</div>
                      <div className="text-xs">
                        Valve Resistance: ${state.lastMap.valveKpa} kPa • Target: ${state.lastMap.targetL}L
                      </div>
                    </div>
                    <button
                      onClick=${() => navTo(4)}
                      className="mt-5 w-full py-3 rounded-2xl bg-white text-[#0B7377] font-bold text-xs uppercase tracking-wider hover:bg-opacity-95 transition-all flex items-center justify-center gap-2"
                    >
                      <span>▶ Resume ${state.lastMap.name}</span>
                    </button>
                  </div>

                  <!-- Option B: QuickSpirometry or Schedule -->
                  <div className="p-5 rounded-3xl bg-[#8E90C6]/15 border border-[#8E90C6]/30 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-[#5D5FA0] font-semibold">
                        <span>TODAY'S CHECKUP</span>
                        <span>PEAK: 3.89 L</span>
                      </div>
                      <div className="text-2xl font-bold text-slate-800">Blow a Lung Test First?</div>
                      <div className="text-xs text-slate-600">
                        Measure today's FVC & FEV1 before jumping into a new map scene.
                      </div>
                    </div>
                    <div className="mt-5 flex gap-2">
                      <button
                        onClick=${() => navTo(5)}
                        className="flex-1 py-3 rounded-2xl text-white font-bold text-xs uppercase tracking-wider transition-all"
                        style=${{ backgroundColor: PDF_COLORS.purpleDeep }}
                      >
                        Spirometry Lab
                      </button>
                      <button
                        onClick=${() => navTo(2)}
                        className="px-4 py-3 rounded-2xl bg-white text-slate-700 font-semibold text-xs border border-slate-200"
                      >
                        Schedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right 4 Cols: Inline Bluetooth Device Pairing & Status Card (No Separate Pair Page Needed!) -->
              <div className="lg:col-span-4 rounded-[32px] bg-white p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-500">Bluetooth Trainer</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style=${{ backgroundColor: state.bleConnected ? '#13A4A918' : state.bleScanning ? '#8E90C620' : '#F0A7AB30', color: state.bleConnected ? PDF_COLORS.tealInk : state.bleScanning ? '#5D5FA0' : '#B23A26' }}>
                      ${state.bleScanning ? 'SEARCHING…' : state.bleConnected ? '● CONNECTED' : 'NOT CONNECTED'}
                    </span>
                  </div>

                  <!-- Rhino Coral-Pink Breathing Trainer Illustration -->
                  <div className="py-3 flex justify-center">
                    <svg viewBox="0 0 240 165" className="w-48 h-36">
                      <circle cx="120" cy="82" r="68" fill="#8E90C6" fillOpacity="0.18"/>
                      <circle cx="165" cy="115" r="35" fill="#F0C754" fillOpacity="0.35"/>
                      <path d="M85 60 C85 42 145 42 160 60 L182 60 L182 82 L158 85 L138 142 C134 154 110 154 108 140 L102 88 L85 78 Z" fill="#F0A7AB" stroke="#1E2432" strokeWidth="1.5"/>
                      <rect x="178" y="64" width="16" height="14" rx="3" fill="#13A4A9"/>
                    </svg>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Device</span>
                      <span className="font-mono font-semibold">${state.deviceName || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Battery Level</span>
                      <span className="font-mono font-bold text-[#0B7377]">${state.batteryPct !== null ? `${state.batteryPct}%` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Mouthpiece Status</span>
                      <span className="font-mono text-[#5D5FA0]">${state.bleConnected ? 'Sterile (UV-C OK)' : '—'}</span>
                    </div>
                  </div>

                  ${state.bleError && !state.bleConnected && html`
                    <div className="p-3.5 rounded-2xl bg-[#F0C754]/15 border border-[#F0C754]/50 text-xs text-slate-700 leading-relaxed">
                      <div className="font-bold text-[#8a6500] mb-0.5">Trainer not found</div>
                      ${state.bleError}
                    </div>
                  `}
                  ${!state.bleConnected && html`
                    <button onClick=${() => navTo(4)} className="text-xs font-semibold text-[#0B7377] hover:underline">
                      No trainer? Play Forest · Level 1 in free-trial mode →
                    </button>
                  `}
                </div>

                <button
                  onClick=${state.bleConnected ? handleBluetoothDisconnect : handleBluetoothPair}
                  disabled=${state.bleScanning}
                  className="mt-4 w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider text-white transition-all shadow-sm"
                  style=${{ backgroundColor: state.bleScanning ? PDF_COLORS.purpleDeep : '#1E2432' }}
                >
                  ${state.bleScanning ? 'Searching for trainer…' : state.bleConnected ? 'Disconnect trainer' : 'Pair Bluetooth trainer'}
                </button>
              </div>
            </div>

            <!-- Bottom Section: "Which Map Would You Like to Blow Today?" -->
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Pick a Map to Practice Today</h2>
                  <p className="text-xs text-slate-600">Click any scene below to load its resistance valve profile and start training</p>
                </div>
                <button onClick=${() => navTo(3)} className="text-xs font-semibold text-[#0B7377] hover:underline">
                  View Full Map Catalog (03) →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${state.maps.map(m => html`
                  <div
                    key=${m.id}
                    className=${`rounded-[28px] bg-white p-6 border transition-all flex flex-col justify-between shadow-sm ${
                      state.lastMap.id === m.id ? 'border-2 border-[#13A4A9]' : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style=${solidStyle(m.color)}>
                          ${m.tag}
                        </span>
                        <span className="font-mono text-xs text-slate-500">${m.kpa} kPa</span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800">${m.name}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">${m.desc}</p>
                    </div>

                    <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-slate-600">Target: ${m.targetL}L</span>
                      <button
                        onClick=${() => handleSelectMap(m, true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
                        style=${solidStyle(m.color)}
                      >
                        Practice Map →
                      </button>
                    </div>
                  </div>
                `)}
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 02: TODAY'S SCHEDULE (TASKLY INSPIRED) ==================== -->
        ${currentPage === 2 && html`
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-page">
            <!-- Left 4 Cols: Weekly Pinned & Mini Calendar -->
            <div className="lg:col-span-4 rounded-[32px] bg-white p-7 border border-slate-200/80 space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">Weekly Pinned</span>
                <span className="text-xs font-semibold text-[#0B7377]">Peking Univ. Rehab</span>
              </div>

              <div className="p-5 rounded-3xl bg-[#F0C754]/20 border border-[#F0C754]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F0C754] text-slate-900 font-bold text-[10px]">DOCTOR NOTE</span>
                  <span className="text-xs font-mono text-slate-600">Dr. Chen</span>
                </div>
                <div className="font-bold text-base text-slate-900">Call doctor for spirometry review</div>
                <p className="text-xs text-slate-600">Share your 3.89L FVC curve and adjust valve resistance to 2.0 kPa.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#F0A7AB]/30 flex items-center justify-center">🧼</span>
                  <div>
                    <div className="text-xs font-bold">Mouthpiece Sterilization</div>
                    <div className="text-[11px] text-slate-500">Booked for April 19</div>
                  </div>
                </div>
                <button onClick=${() => navTo(8)} className="text-xs font-semibold text-[#0B7377]">View →</button>
              </div>
            </div>

            <!-- Center/Right 8 Cols: Today's Schedule Timeline -->
            <div className="lg:col-span-8 rounded-[32px] bg-white p-8 border border-slate-200/80 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Today's Breathing Schedule</h2>
                  <p className="text-sm font-semibold text-[#F0C754]">Sunday, October 25</p>
                </div>
                <button
                  onClick=${() => navTo(4)}
                  className="px-5 py-2.5 rounded-2xl bg-[#F0C754] text-slate-900 font-bold text-xs"
                >
                  + Start Scheduled Session
                </button>
              </div>

              <div className="space-y-3.5">
                ${state.scheduleTasks.map(task => html`
                  <div
                    key=${task.id}
                    onClick=${() => {
                      setState(p => ({
                        ...p,
                        scheduleTasks: p.scheduleTasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t)
                      }));
                      notify(`Toggled task: ${task.title}`);
                    }}
                    className=${`p-5 rounded-3xl cursor-pointer transition-all flex items-center justify-between ${
                      task.highlight
                        ? 'bg-[#F0C754] text-slate-900 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input type="checkbox" checked=${task.done} readOnly className="w-4 h-4 rounded accent-[#13A4A9]" />
                      <div>
                        <div className="font-bold text-base">${task.title}</div>
                        <div className="text-xs opacity-80">${task.detail}</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold">${task.time}</span>
                  </div>
                `)}
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 03: CHOOSE A MAP ==================== -->
        ${currentPage === 3 && html`
          <section className="space-y-6 animate-page">
            <div className="flex flex-wrap justify-between items-end gap-4">
              <div>
                <span className="text-xs font-mono text-[#0B7377] font-semibold">03 CHOOSE A MAP // SCENE & RESISTANCE SELECTOR</span>
                <h2 className="text-3xl font-bold text-slate-900 mt-1">Pick a Scene & Valve Level</h2>
              </div>
              <button onClick=${() => navTo(4)} className="px-6 py-3 rounded-2xl bg-[#0F8387] text-white font-bold text-xs">
                Play ${state.lastMap.name} →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              ${state.maps.map(m => html`
                <div key=${m.id} className="rounded-[32px] bg-white p-7 border border-slate-200/80 flex flex-col justify-between space-y-6 shadow-sm">
                  <div className="space-y-4">
                    <div className="h-36 rounded-2xl flex items-center justify-center text-white font-bold text-xl" style=${solidStyle(m.color)}>
                      ${m.name}
                    </div>
                    <div className="flex justify-between text-xs font-mono text-slate-500">
                      <span>RESISTANCE: ${m.kpa} kPa</span>
                      <span>TARGET: ${m.targetL} L</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">${m.desc}</p>
                  </div>
                  <button
                    onClick=${() => handleSelectMap(m, true)}
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-xs uppercase tracking-wider"
                    style=${solidStyle(m.color)}
                  >
                    Start Training on ${m.name}
                  </button>
                </div>
              `)}
            </div>
          </section>
        `}

        <!-- ==================== PAGE 04: TRAINING GAME (BREATH RUNNER ON THE .AI MAP) ==================== -->
        ${currentPage === 4 && html`
          <${ForestRunnerStage}
            map=${state.lastMap}
            maps=${state.maps}
            bleConnected=${state.bleConnected}
            bleScanning=${state.bleScanning}
            deviceName=${state.deviceName}
            onToggleDevice=${() => {
              if (state.bleConnected) {
                handleBluetoothDisconnect();
                notify('Trainer disconnected. Free trial mode: hold the screen or Space to breathe.');
              } else {
                handleBluetoothPair();
              }
            }}
            onSelectMap=${m => handleSelectMap(m)}
            notify=${notify}
          />
        `}

        <!-- ==================== PAGE 05: SPIROMETRY LAB ==================== -->
        ${currentPage === 5 && html`
          <section className="space-y-6 animate-page">
            <div className="flex flex-wrap justify-between items-end gap-4">
              <div>
                <span className="text-xs font-mono text-[#5D5FA0] font-semibold">05 SPIROMETRY LAB // LUNG CAPACITY TEST</span>
                <h2 className="text-3xl font-bold text-slate-900">Digital Lung-Capacity & Flow Analyzer</h2>
              </div>
              <button
                onClick=${() => {
                  setTestingBreath(true);
                  notify('Sampling forced expiratory maneuver...');
                  setTimeout(() => {
                    const fvc = Number((3.75 + Math.random() * 0.35).toFixed(2));
                    setLiveFvc(fvc);
                    setTestingBreath(false);
                    notify(`New Spirometry Record Saved: FVC ${fvc} L`);
                  }, 800);
                }}
                className="px-6 py-3 rounded-2xl text-white font-bold text-xs"
                style=${{ backgroundColor: PDF_COLORS.tealDeep }}
              >
                ${testingBreath ? 'Measuring Airflow...' : '▶ Blow New Spirometry Test'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-[32px] bg-white p-7 border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-[#13A4A9]/10">
                    <div className="text-xs text-slate-600">Forced Vital Capacity (FVC)</div>
                    <div className="text-3xl font-bold text-[#0B7377] mt-1">${liveFvc} L</div>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#8E90C6]/15">
                    <div className="text-xs text-slate-600">Peak Expiratory Flow (PEF)</div>
                    <div className="text-3xl font-bold text-[#5D5FA0] mt-1">${liveFlow} L/m</div>
                  </div>
                </div>
                <svg viewBox="0 0 500 150" className="w-full bg-slate-900 rounded-2xl p-4">
                  <path d="M20 130 Q110 15 210 70 T480 125" fill="none" stroke="#13A4A9" strokeWidth="3"/>
                  <path d="M20 135 Q130 45 240 90 T480 130" fill="none" stroke="#8E90C6" strokeWidth="2.5"/>
                </svg>
              </div>

              <div className="rounded-[32px] bg-white p-7 border border-slate-200/80 space-y-3">
                <div className="text-xs font-mono text-slate-500">RECENT SPIROMETRY LOGS</div>
                ${state.spirometryLogs.map(l => html`
                  <div key=${l.id} className="p-4 rounded-2xl bg-slate-50 flex justify-between items-center text-xs font-mono">
                    <span><strong>${l.id}</strong> (${l.date}) — FVC: ${l.fvc}L | FEV1: ${l.fev1}L</span>
                    <span className="px-2.5 py-1 rounded-full bg-[#13A4A9]/15 text-[#0B7377] font-bold">${l.ratio}</span>
                  </div>
                `)}
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 06: MULTIPLAYER CO-OP ==================== -->
        ${currentPage === 6 && html`
          <section className="space-y-6 animate-page">
            <h2 className="text-3xl font-bold text-slate-900">06 Multiplayer Co-Op Breathing Arena</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-3">
                <span className="px-3 py-1 rounded-full bg-[#13A4A9]/15 text-[#0B7377] text-xs font-bold">PLAYER 1 • XIAOMING</span>
                <div className="text-2xl font-bold">4,308 pts • FVC 3.89 L</div>
                <div className="h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0F8387] w-[86%]"></div></div>
              </div>
              <div className="p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-3">
                <span className="px-3 py-1 rounded-full bg-[#8E90C6]/20 text-[#5D5FA0] text-xs font-bold">PLAYER 2 • ALI (ONLINE)</span>
                <div className="text-2xl font-bold">4,120 pts • FVC 3.75 L</div>
                <div className="h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#71739E] w-[82%]"></div></div>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 07: COMMUNITY RANKING ==================== -->
        ${currentPage === 7 && html`
          <section className="space-y-6 animate-page">
            <h2 className="text-3xl font-bold text-slate-900">07 Community & Friends Data Ranking</h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-4">
                <div className="text-xs font-mono text-slate-500">FRIENDS RANKING MULTI-SERIES CHART</div>
                <svg viewBox="0 0 520 200" className="w-full">
                  ${[60, 90, 125, 105, 145, 165, 150, 180].map((h, i) => html`
                    <g key=${i}>
                      <rect x=${35 + i * 58} y=${185 - h} width="14" height=${h} rx="4" fill="#13A4A9"/>
                      <rect x=${52 + i * 58} y=${185 - h * 0.8} width="14" height=${h * 0.8} rx="4" fill="#8E90C6"/>
                    </g>
                  `)}
                  <polyline points="42,105 100,80 158,55 216,70 274,38 332,26 390,40 448,18" fill="none" stroke="#F0C754" strokeWidth="3.5"/>
                </svg>
              </div>
              <div className="lg:col-span-5 p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-3">
                <div className="text-xs font-mono text-slate-500">FRIENDS LEADERBOARD (A - Z)</div>
                ${[
                  { name: 'Ali', score: '4,308 pts', color: '#13A4A9' },
                  { name: 'Bage', score: '4,120 pts', color: '#8E90C6' },
                  { name: 'Ms. Bai', score: '3,890 pts', color: '#F0C754' },
                  { name: 'Mr. Bi', score: '3,640 pts', color: '#F0A7AB' }
                ].map((f, idx) => html`
                  <div key=${f.name} className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center" style=${solidStyle(f.color)}>
                        ${idx + 1}
                      </span>
                      <span className="font-bold text-sm">${f.name}</span>
                    </div>
                    <span className="font-mono text-xs font-semibold">${f.score}</span>
                  </div>
                `)}
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 08: HYGIENE & DISINFECTION BOOKING ==================== -->
        ${currentPage === 8 && html`
          <section className="space-y-6 animate-page">
            <h2 className="text-3xl font-bold text-slate-900">08 Hygiene Status & Disinfection Booking</h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 p-7 rounded-[32px] bg-white border border-slate-200/80 flex flex-col sm:flex-row items-center gap-6">
                <svg viewBox="0 0 200 200" className="w-44 h-44 shrink-0">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#13A4A9" strokeWidth="12" strokeDasharray="410 500" strokeLinecap="round"/>
                  <circle cx="100" cy="100" r="62" fill="none" stroke="#8E90C6" strokeWidth="12" strokeDasharray="280 500" strokeLinecap="round"/>
                  <circle cx="100" cy="100" r="44" fill="none" stroke="#F0C754" strokeWidth="12" strokeDasharray="190 500" strokeLinecap="round"/>
                  <circle cx="100" cy="100" r="26" fill="none" stroke="#F0A7AB" strokeWidth="12" strokeDasharray="110 500" strokeLinecap="round"/>
                </svg>
                <div className="space-y-2.5 w-full">
                  <div className="text-xs font-mono text-slate-500">DISINFECTION NEEDS BY PART</div>
                  ${state.disinfectionParts.map(p => html`
                    <div key=${p.part} className="flex justify-between items-center text-xs">
                      <span className="font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style=${{ backgroundColor: p.color }}></span>
                        ${p.part}
                      </span>
                      <span className="font-mono">${p.pct}% (${p.status})</span>
                    </div>
                  `)}
                </div>
              </div>

              <div className="lg:col-span-6 p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-4">
                <div className="text-xs font-mono text-slate-500">BOOK HOSPITAL DISINFECTION // APRIL</div>
                <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-xs">
                  ${Array.from({ length: 30 }, (_, i) => i + 1).map(d => {
                    const booked = state.bookedDays.includes(d);
                    return html`
                      <button
                        key=${d}
                        onClick=${() => {
                          setState(p => ({ ...p, bookedDays: booked ? p.bookedDays.filter(x => x !== d) : [...p.bookedDays, d] }));
                          notify(`Updated April ${d} disinfection slot`);
                        }}
                        className=${`py-2 rounded-xl font-bold ${booked ? 'bg-[#0F8387] text-white' : 'bg-slate-50 hover:bg-slate-100'}`}
                      >
                        ${d}
                      </button>
                    `;
                  })}
                </div>
              </div>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 09: DEVICE RENTAL ==================== -->
        ${currentPage === 9 && html`
          <section className="space-y-6 animate-page">
            <h2 className="text-3xl font-bold text-slate-900">09 Shared Hospital Device Rental</h2>
            <div className="p-8 rounded-[32px] bg-white border border-slate-200/80 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-[#96C7D2]/25 text-[#0B7377] text-xs font-bold">ACTIVE LEASE • PEKING UNIV. HOSPITAL</span>
                <div className="text-2xl font-bold">Day ${state.leaseUsedDays} of ${state.leaseQuotaDays} Days</div>
                <p className="text-xs text-slate-600">Refundable Deposit Paid: ¥228.00 • Daily Shared Rate: ¥12.00/day</p>
              </div>
              <button
                onClick=${() => { setState(p => ({ ...p, leaseQuotaDays: p.leaseQuotaDays + 15 })); notify('Extended rental by +15 days'); }}
                className="px-6 py-3.5 rounded-2xl bg-[#0F8387] text-white font-bold text-xs"
              >
                Extend Lease (+15 Days)
              </button>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 10: DOCTOR & CI PIPELINE ==================== -->
        ${currentPage === 10 && html`
          <section className="space-y-6 animate-page">
            <h2 className="text-3xl font-bold text-slate-900">10 Physician Guidance & Automated Telemetry CI</h2>
            <div className="p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-3 font-mono text-xs">
              ${state.regressionRuns.map(r => html`
                <div key=${r.id} className="p-4 rounded-2xl bg-slate-50 flex justify-between items-center">
                  <span>${r.id} — ${r.target} (${r.steps} samples)</span>
                  <span className="px-3 py-1 rounded-full bg-[#13A4A9]/15 text-[#0B7377] font-bold">${r.status} (Drift: ${r.drift})</span>
                </div>
              `)}
            </div>
          </section>
        `}

        <!-- ==================== PAGE 11: RECOVERY JOURNEY & EMOTION CURVE (REF IMAGE 1) ==================== -->
        ${currentPage === 11 && html`
          <section className="space-y-6 animate-page">
            <div>
              <span className="text-xs font-mono text-[#5D5FA0] font-semibold">11 PATIENT RECOVERY JOURNEY & BEHAVIOR METRICS</span>
              <h2 className="text-3xl font-bold text-slate-900 mt-1">Rehabilitation Journey & Emotion Curve</h2>
            </div>

            <!-- Top Persona & Behavior Sliders Card (Ref Image 1 Style) -->
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 rounded-[32px] bg-white p-7 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#8E90C6]/25 flex items-center justify-center text-2xl">🧑‍⚕️</div>
                  <div>
                    <div className="font-bold text-lg">${state.userName} (38 yrs)</div>
                    <div className="text-xs text-slate-600">Thoracic Post-Op Recovery • Home User</div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#8E90C6]/10 text-xs text-slate-700 italic">
                  "Traditional 3-ball trainers felt repetitive and couldn't show my daily progress. With gamified maps and quantified FVC curves, I look forward to breathing training every morning!"
                </div>
              </div>

              <!-- Behavior Sliders -->
              <div className="lg:col-span-7 rounded-[32px] bg-white p-7 border border-slate-200/80 space-y-4">
                <div className="text-xs font-mono uppercase text-slate-500">Pulmonary Behavior & Progress Indicators</div>
                ${[
                  { label: 'Inspiratory Volume (FVC)', left: '1.5L', right: '4.5L', pct: '82%', color: '#13A4A9' },
                  { label: 'Expiratory Flow Stability', left: 'Unsteady', right: 'Locked', pct: '76%', color: '#8E90C6' },
                  { label: 'Daily Training Consistency', left: '1 Day/wk', right: '7 Days/wk', pct: '90%', color: '#F0C754' }
                ].map(s => html`
                  <div key=${s.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>${s.label}</span>
                      <span style=${{ color: s.color }}>${s.pct}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 relative">
                      <div className="h-full rounded-full" style=${{ width: s.pct, backgroundColor: s.color }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>${s.left}</span>
                      <span>${s.right}</span>
                    </div>
                  </div>
                `)}
              </div>
            </div>

            <!-- Bottom Emotion & Recovery Journey Curve (Ref Image 1) -->
            <div className="rounded-[32px] bg-white p-8 border border-slate-200/80 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-slate-800">5-Stage Post-Discharge Emotion & Lung Capacity Curve</span>
                <span className="text-xs font-mono text-[#0B7377]">Stage 1 → Stage 5</span>
              </div>
              <svg viewBox="0 0 800 180" className="w-full">
                <defs>
                  <linearGradient id="journeyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8E90C6" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#8E90C6" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                <path d="M60 135 L230 110 L400 75 L570 50 L740 30 L740 165 L60 165 Z" fill="url(#journeyGrad)"/>
                <polyline points="60,135 230,110 400,75 570,50 740,30" fill="none" stroke="#8E90C6" strokeWidth="3.5"/>
                ${[
                  { x: 60, y: 135, emoji: '😟', stage: '1. Post-Op Ward' },
                  { x: 230, y: 110, emoji: '🙂', stage: '2. Pair Trainer' },
                  { x: 400, y: 75, emoji: '😊', stage: '3. Forest Lv.1' },
                  { x: 570, y: 50, emoji: '😄', stage: '4. Co-Op Friends' },
                  { x: 740, y: 30, emoji: '🤩', stage: '5. Home Recovery' }
                ].map(pt => html`
                  <g key=${pt.stage}>
                    <circle cx=${pt.x} cy=${pt.y} r="14" fill="#F0C754"/>
                    <text x=${pt.x - 8} y=${pt.y + 5} fontSize="14">${pt.emoji}</text>
                    <text x=${pt.x - 42} y="168" fontSize="11" fill="#475569" fontWeight="600">${pt.stage}</text>
                  </g>
                `)}
              </svg>
            </div>
          </section>
        `}

        <!-- ==================== PAGE 12: MY PROFILE (CLARA MARTIN REF IMAGE 2 LAYOUT + PDF PALETTE) ==================== -->
        ${currentPage === 12 && html`
          <section className="rounded-[36px] overflow-hidden border border-slate-200/90 shadow-lg bg-[#EEF0F8] grid grid-cols-1 lg:grid-cols-12 animate-page">
            
            <!-- Left Purple Sidebar (Ref Image 2 Clara Martin Style using PDF #8E90C6) -->
            <aside className="lg:col-span-3 p-7 text-white flex flex-col justify-between" style=${{ backgroundColor: PDF_COLORS.purpleDeep }}>
              <div className="space-y-6">
                <div>
                  <div className="text-xs opacity-80">Dashboard</div>
                  <div className="text-xl font-bold leading-tight mt-0.5">Patient Profile<br/>Lung Rehab</div>
                </div>

                <nav className="space-y-2 text-xs font-semibold">
                  <div className="px-4 py-3 rounded-2xl bg-white text-[#5D5FA0] flex items-center justify-between shadow-sm">
                    <span>👤 My Profile</span>
                    <span>●</span>
                  </div>
                  <button onClick=${() => navTo(3)} className="w-full text-left px-4 py-2.5 rounded-2xl hover:bg-white/15 flex justify-between">
                    <span>🌲 Training Maps</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20">3</span>
                  </button>
                  <button onClick=${() => navTo(5)} className="w-full text-left px-4 py-2.5 rounded-2xl hover:bg-white/15 flex justify-between">
                    <span>🫁 Spirometry Logs</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20">4</span>
                  </button>
                  <button onClick=${() => navTo(8)} className="w-full text-left px-4 py-2.5 rounded-2xl hover:bg-white/15 flex justify-between">
                    <span>📅 Disinfection Calendar</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20">5</span>
                  </button>
                  <button onClick=${() => navTo(7)} className="w-full text-left px-4 py-2.5 rounded-2xl hover:bg-white/15 flex justify-between">
                    <span>🏆 Friends Ranking</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20">#1</span>
                  </button>
                </nav>
              </div>

              <!-- Decorative Vase & Botanical Leaves Illustration at Bottom Left (Matching Ref Image 2) -->
              <div className="pt-8 flex justify-center">
                <svg viewBox="0 0 140 160" className="w-32 h-36">
                  <path d="M70 95 Q45 55 35 25" stroke="#13A4A9" strokeWidth="2.5" fill="none"/>
                  <path d="M70 95 Q95 50 108 20" stroke="#F0A7AB" strokeWidth="2.5" fill="none"/>
                  <ellipse cx="35" cy="25" rx="10" ry="18" transform="rotate(-25 35 25)" fill="#13A4A9"/>
                  <ellipse cx="108" cy="20" rx="10" ry="18" transform="rotate(25 108 20)" fill="#F0A7AB"/>
                  <ellipse cx="70" cy="40" rx="11" ry="20" fill="#F0C754"/>
                  <path d="M48 95 L92 95 L100 148 C100 155 40 155 40 148 Z" fill="#FFFFFF" fillOpacity="0.9"/>
                </svg>
              </div>
            </aside>

            <!-- Right 9 Cols Main Profile Content -->
            <div className="lg:col-span-9 p-6 lg:p-8 space-y-6">
              
              <!-- Top Search & Title Bar -->
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800">My Profile & Progress</h2>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-full bg-white text-xs text-slate-500 border border-slate-200 flex items-center gap-2">
                    <span>🔍 Search records, badges...</span>
                  </div>
                  <button onClick=${() => navTo(1)} className="px-4 py-2 rounded-full bg-[#0F8387] text-white text-xs font-bold">
                    ← Welcome Page
                  </button>
                </div>
              </div>

              <!-- Profile Header Card (Avatar + Metadata + Social/Hospital Badges) -->
              <div className="rounded-3xl bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                <div className="w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-md" style=${{ background: 'linear-gradient(135deg, #13A4A9, #8E90C6)' }}>
                  XM
                </div>
                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <h3 className="text-2xl font-bold text-slate-900">${state.userName}</h3>
                    <span className="px-3 py-0.5 rounded-full bg-[#13A4A9]/15 text-[#0B7377] text-xs font-bold">Activity Log: 4.3083</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                    <div>📅 Enrolled: ${state.enrolledDate}</div>
                    <div>🏥 Hospital: ${state.hospital}</div>
                    <div>🎂 Birth Date: ${state.birthDate}</div>
                    <div>✉️ E-mail: ${state.email}</div>
                  </div>
                  <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                    ${['BLE 5.0', 'FVC 3.89L', '200 Min', 'Lv.1 Crown', 'Lv.2 Medal'].map(tag => html`
                      <span key=${tag} className="px-3 py-1 rounded-full bg-[#8E90C6]/15 text-[#5D5FA0] text-[11px] font-bold">
                        ${tag}
                      </span>
                    `)}
                  </div>
                </div>
              </div>

              <!-- Middle Grid: Training Modules Timeline (Left) + Rental Payment & Plan (Right) -->
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <!-- My Training Modules (Mes formations style) -->
                <div className="lg:col-span-7 rounded-3xl bg-white p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-base text-slate-800">My Breathing Modules</h4>
                    <span className="text-xs font-mono text-[#0B7377]">Total: 200 min</span>
                  </div>

                  <div className="space-y-3 relative before:content-[''] before:w-0.5 before:bg-[#8E90C6]/40 before:top-4 before:bottom-4 before:left-3" style=${{ position: 'relative' }}>
                    ${[
                      { title: 'Forest · Level 1 (Inspiratory Basics)', sub: '1.5 kPa valve • 6 modules completed', status: 'Completed', statusColor: '#13A4A9', mapId: 'MAP-FOREST-01' },
                      { title: 'Sunlit Canyon · Level 2 (Dual Mode)', sub: '2.5 kPa valve • 8 modules completed', status: 'Completed', statusColor: '#13A4A9', mapId: 'MAP-CANYON-02' },
                      { title: 'Glacier Ridge · Level 3 (Deep Alveoli)', sub: '3.5 kPa valve • 5 modules in progress', status: 'In Progress', statusColor: '#8E90C6', mapId: 'MAP-GLACIER-03' }
                    ].map(mod => html`
                      <div key=${mod.title} onClick=${() => navTo(4)} className="p-4 rounded-2xl bg-[#F4F6FA] hover:bg-[#8E90C6]/15 transition-colors cursor-pointer flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-slate-800">${mod.title}</div>
                          <div className="text-xs text-slate-600">${mod.sub}</div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-white text-[10px] font-bold" style=${{ backgroundColor: mod.statusColor }}>
                          ${mod.status}
                        </span>
                      </div>
                    `)}
                  </div>
                </div>

                <!-- Right Column: Rental Payment Info & Premium Hospital Care Card -->
                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
                    <h4 className="font-bold text-sm text-slate-800">Device Rental & Deposit</h4>
                    <div className="p-3.5 rounded-2xl bg-slate-50 font-mono text-xs text-slate-600">
                      Hospital Lease Card •••• 9942 (Deposit ¥228)
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Day ${state.leaseUsedDays} / ${state.leaseQuotaDays}</span>
                      <button onClick=${() => navTo(9)} className="font-bold text-[#0B7377]">Manage Lease →</button>
                    </div>
                  </div>

                  <div className="rounded-3xl p-6 text-white space-y-3 shadow-sm" style=${{ backgroundColor: PDF_COLORS.tealDeep }}>
                    <h4 className="font-bold text-base">Hospital Telehealth Plan</h4>
                    <ul className="text-xs space-y-1.5 opacity-95">
                      <li>✓ Real-time 1,000Hz spirometry cloud sync</li>
                      <li>✓ Weekly thoracic surgeon prescription review</li>
                      <li>✓ Free hospital UV-C mouthpiece sterilization</li>
                    </ul>
                    <button
                      onClick=${() => navTo(8)}
                      className="w-full py-2.5 rounded-2xl bg-[#F0A7AB] text-slate-900 font-bold text-xs mt-2"
                    >
                      Book Sterilization Slot
                    </button>
                  </div>
                </div>
              </div>

              <!-- Bottom Recent Activity Card -->
              <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
                <h4 className="font-bold text-base text-slate-800">Recent Recovery Activity</h4>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <span>🫁 <strong>Spirometry FVC 3.89L</strong> recorded in Digital Lab</span>
                    <span className="text-slate-500">Today • &gt;</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span>🌲 <strong>Forest Level 1</strong> breath runner session completed (+320 coins)</span>
                    <span className="text-slate-500">Yesterday • &gt;</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span>🏅 <strong>Lv.2 Endurance Medal</strong> unlocked (200 total training minutes)</span>
                    <span className="text-slate-500">2 days ago • &gt;</span>
                  </div>
                </div>
              </div>

            </div>
          </section>
        `}

      </main>
    </div>
  `;
}

createRoot(document.getElementById('root')).render(React.createElement(AeroCareClientApp));
