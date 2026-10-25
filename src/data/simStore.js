export const PAGES_META = [
  { id: 1, code: '01', name: 'Welcome' },
  { id: 2, code: '02', name: 'Pair Device' },
  { id: 3, code: '03', name: 'Home' },
  { id: 4, code: '04', name: 'Spirometry' },
  { id: 5, code: '05', name: 'Choose Map' },
  { id: 6, code: '06', name: 'Training Game' },
  { id: 7, code: '07', name: 'Multiplayer' },
  { id: 8, code: '08', name: 'Device Rental' },
  { id: 9, code: '09', name: 'Hygiene' },
  { id: 10, code: '10', name: 'Telehealth & CI' },
  { id: 11, code: '11', name: 'Community' },
  { id: 12, code: '12', name: 'Profile' }
];

export const INITIAL_SIM_STATE = {
  designer: 'Jie (Fia) Yin',
  userName: 'Xiaoming',
  hospital: 'Peking Univ. Hospital',
  hardwareConnected: true,
  batteryPct: 70,
  totalMinutes: 200,
  selectedScenario: { id: 'MAP-01', name: 'Forest · Level 1', valveKpa: 1.5, targetVolumeL: 3.5 },
  serverNodes: [
    { nodeId: 'rehab-cloud-01', os: 'Ubuntu 22.04 LTS', spec: '64-Core Airflow Ingest', load: 64, job: '1000Hz Breath Stream Parser', status: 'ONLINE' },
    { nodeId: 'rehab-cloud-02', os: 'Ubuntu 22.04 LTS', spec: '64-Core Spirometry Worker', load: 52, job: 'FVC / FEV1 / PEF Integrator', status: 'ONLINE' },
    { nodeId: 'rehab-cloud-03', os: 'Debian 12 Linux',  spec: '32-Core WebSocket Sync', load: 78, job: 'Multiplayer Breath Game Sync', status: 'ACTIVE' }
  ],
  regressionRuns: [
    { id: 'REG-8841', target: 'Venturi_Flow_Sensor_Calibration', domain: 'Airflow DSP Pipeline', steps: '120,000', runtime: '1.18s', drift: '0.004L', seed: '0x8F4A92C1', status: 'PASS' },
    { id: 'REG-8842', target: 'Forest_Map_Physics_Sync_Engine', domain: 'Game Trajectory Engine', steps: '240,000', runtime: '2.10s', drift: '0.006L', seed: '0x3C91E04B', status: 'PASS' },
    { id: 'REG-8843', target: 'BLE_5_GATT_Packet_Stream_Pipe',  domain: 'Device Pairing Protocol', steps: '95,000', runtime: '0.84s', drift: '0.002L', seed: '0x7E12D55A', status: 'PASS' }
  ],
  traceRuns: [
    { id: 'TEST-101', date: '2026-10-19', fvc: 3.18, fev1: 2.61, pef: 402, ratio: '82.1%', impedance: '1.5 kPa' },
    { id: 'TEST-102', date: '2026-10-21', fvc: 3.42, fev1: 2.84, pef: 428, ratio: '83.0%', impedance: '1.5 kPa' },
    { id: 'TEST-103', date: '2026-10-23', fvc: 3.66, fev1: 3.09, pef: 451, ratio: '84.4%', impedance: '2.2 kPa' },
    { id: 'TEST-104', date: '2026-10-25', fvc: 3.89, fev1: 3.31, pef: 474, ratio: '85.1%', impedance: '2.5 kPa' }
  ],
  disinfectionParts: [
    { part: 'Mouthpiece', pct: 85, color: '#13A4A9', tip: 'Sterilize every 48h (Medical Silicone)' },
    { part: 'Filter',     pct: 68, color: '#8E90C6', tip: 'HEPA moisture trap cartridge' },
    { part: 'Core Valve', pct: 46, color: '#F0C754', tip: 'Adjustable resistance air valve' },
    { part: 'Main Body',  pct: 25, color: '#F0A7AB', tip: 'Ergonomic PP shell wipe-down' }
  ],
  bookedDays: [10, 19, 21, 24, 30],
  leaseQuotaDays: 30,
  leaseUsedDays: 18
};
