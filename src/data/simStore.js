/**
 * Initial State & Architectural Metadata for the 12-Page Simulation & Rehab Platform
 */
export const PAGES_META = [
  { id: 1, code: '01', name: 'Portal', title: 'Simulation & Rehab Portal', domain: 'Auth & Role Environment' },
  { id: 2, code: '02', name: 'HW Probe', title: 'RTL & Sensor HUD Probe', domain: 'BLE / JTAG Hardware Target' },
  { id: 3, code: '03', name: 'Overview', title: 'Sim & Telemetry Workspace', domain: 'System-Level Dashboard' },
  { id: 4, code: '04', name: 'Trace Solver', title: 'Time-Indexed Power/Thermal Lab', domain: 'CFD & Spirometry Solver' },
  { id: 5, code: '05', name: 'Scenarios', title: 'CFD Airflow & Terrain Profiles', domain: 'Boundary Condition Hub' },
  { id: 6, code: '06', name: 'Live Sim', title: 'Real-Time Trace-Driven Simulator', domain: 'Interactive Closed-Loop Engine' },
  { id: 7, code: '07', name: 'Co-Sim Sync', title: 'Multi-Node Lockstep Co-Sim', domain: 'Distributed Event Synchronization' },
  { id: 8, code: '08', name: 'Cluster Infra', title: 'Linux Compute & Hardware Pool', domain: 'Server & Asset Provisioning' },
  { id: 9, code: '09', name: 'Thermal & Wear', title: 'Spatiotemporal Hotspot & Lifespan', domain: 'Component Degradation & Calibration' },
  { id: 10, code: '10', name: 'CI/CD Triage', title: 'Regression Triage & Modeling Desk', domain: 'Collaborate with Modeling Engineers' },
  { id: 11, code: '11', name: 'Benchmarks', title: 'Cross-Project Throughput & Leaderboards', domain: 'Scalability & Performance Metrics' },
  { id: 12, code: '12', name: 'Artifact Vault', title: 'Experiment Versioning & Reproducibility', domain: '20-Tile Co-Design Matrix & SHA Vault' }
];

export const INITIAL_SIM_STATE = {
  environmentRole: 'Lead Simulation Infrastructure & Tooling Engineer',
  hardwareConnected: true,
  activeTarget: 'AeroCare-SoC-RevC (RTL + Piezo MEMS + Valve Actuator)',
  selectedScenario: {
    id: 'CFD-MIST-01',
    name: 'Misty Pine Valley (Laminar-to-Turbulent Flow)',
    resistanceKpa: 1.5,
    meshCells: '1.2M Polyhedral Cells',
    romOrder: '16-State Reduced-Order Thermal Model',
    ambientTempC: 24.5
  },
  clusterNodes: [
    { nodeId: 'sim-node-usw-01', os: 'Ubuntu 22.04 LTS (Kernel 6.5)', cpu: '64-Core AMD EPYC', load: 74, job: 'Time-Stepped Power/Thermal Engine', tempC: 54.2, status: 'ONLINE' },
    { nodeId: 'sim-node-usw-02', os: 'Ubuntu 22.04 LTS (Kernel 6.5)', cpu: '64-Core AMD EPYC', load: 61, job: 'CFD Airflow Reduced-Order Calibration', tempC: 49.8, status: 'ONLINE' },
    { nodeId: 'sim-node-rtl-03', os: 'RHEL 9.3 Enterprise', cpu: '128-Core ARM Neoverse', load: 88, job: 'Verilator RTL IP Power Macromodel', tempC: 62.1, status: 'REGRESSION' },
    { nodeId: 'sim-node-eda-04', os: 'Ubuntu 24.04 LTS', cpu: '32-Core Intel Xeon', load: 31, job: 'Artifact Archiver & Trace Indexer', tempC: 41.5, status: 'ONLINE' }
  ],
  regressionRuns: [
    { id: 'REG-8841', target: 'BLE_SoC_GATT_Macromodel', domain: 'IP Power Macromodel', steps: '125,000', runtime: '1.42s', drift: '0.008%', seed: '0x8F4A92C1', status: 'PASS' },
    { id: 'REG-8842', target: 'Venturi_Airflow_Mesh_ROM', domain: 'CFD Thermal Solver', steps: '250,000', runtime: '2.85s', drift: '0.012%', seed: '0x3C91E04B', status: 'PASS' },
    { id: 'REG-8843', target: 'Piezo_ADC_TimeStepped_Flow', domain: 'Discrete-Event Trace', steps: '95,000', runtime: '0.94s', drift: '0.004%', seed: '0x7E12D55A', status: 'PASS' },
    { id: 'REG-8844', target: 'Spatiotemporal_Hotspot_4x4', domain: 'Transient Power Map', steps: '500,000', runtime: '4.10s', drift: '0.019%', seed: '0x1B08F33E', status: 'PASS' }
  ],
  traceRuns: [
    { id: 'TRC-101', date: '2026-10-19', fvc: 3.18, fev1: 2.61, pef: 402, socPowerMw: 42.8, peakHotspotC: 37.4, hash: 'sha256:9f82a1' },
    { id: 'TRC-102', date: '2026-10-21', fvc: 3.42, fev1: 2.84, pef: 428, socPowerMw: 44.1, peakHotspotC: 37.9, hash: 'sha256:4c71b8' },
    { id: 'TRC-103', date: '2026-10-23', fvc: 3.66, fev1: 3.09, pef: 451, socPowerMw: 45.6, peakHotspotC: 38.2, hash: 'sha256:2e90f4' },
    { id: 'TRC-104', date: '2026-10-25', fvc: 3.89, fev1: 3.31, pef: 474, socPowerMw: 46.9, peakHotspotC: 38.6, hash: 'sha256:7a15d3' }
  ],
  calibrationDays: [10, 19, 21, 24, 30],
  leaseQuotaDays: 30,
  leaseUsedDays: 18
};
