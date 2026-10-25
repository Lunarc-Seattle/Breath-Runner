/**
 * AeroCare Simulation Infrastructure & Pulmonary Telemetry Data Model
 * Stores Linux Cluster Node States, Regression Runs, Time-Indexed Power/Thermal Traces, and Patient Rehab State
 */
export const SimDatabase = {
  clusterNodes: [
    { nodeId: "sim-node-usw-01", arch: "x86_64 Ubuntu 22.04 LTS", cores: 64, loadPct: 74, activeSolver: "C++20 Thermal-ROM v3.2", status: "ONLINE", tempC: 54.2 },
    { nodeId: "sim-node-usw-02", arch: "x86_64 Ubuntu 22.04 LTS", cores: 64, loadPct: 61, activeSolver: "CFD Airflow Mesh Calibrator", status: "ONLINE", tempC: 49.8 },
    { nodeId: "sim-node-rtl-03", arch: "ARM64 Neoverse-N2 Linux", cores: 128, loadPct: 88, activeSolver: "Verilator RTL SoC Power Trace", status: "BUSY_REGRESSION", tempC: 62.1 },
    { nodeId: "sim-node-eda-04", arch: "x86_64 RHEL 9.2", cores: 32, loadPct: 29, activeSolver: "Transient Hotspot Map Generator", status: "ONLINE", tempC: 42.0 }
  ],
  regressionSuites: [
    { runId: "REG-2026-8841", suite: "BLE_SoC_GATT_Macromodel", domain: "RTL + Power Domain", samples: "125k steps", duration: "1.42s", drift: "0.008%", seed: "0x8F4A92C1", status: "PASS", gitSha: "a94f21c" },
    { runId: "REG-2026-8842", suite: "Venturi_Airflow_Mesh_ROM", domain: "CFD + Thermal Solver", samples: "250k steps", duration: "2.85s", drift: "0.012%", seed: "0x3C91E04B", status: "PASS", gitSha: "a94f21c" },
    { runId: "REG-2026-8843", suite: "Piezo_ADC_TimeStepped_Flow", domain: "Mixed-Signal Trace", samples: "95k steps", duration: "0.94s", drift: "0.004%", seed: "0x7E12D55A", status: "PASS", gitSha: "a94f21c" },
    { runId: "REG-2026-8844", suite: "Spatiotemporal_Hotspot_4x4", domain: "Transient Thermal", samples: "500k steps", duration: "4.10s", drift: "0.019%", seed: "0x1B08F33E", status: "PASS", gitSha: "a94f21c" }
  ],
  spirometryTraces: [
    { id: "TRC-101", timestamp: "2026-10-19 09:15", fvc: 3.18, fev1: 2.61, pef: 402, peakPowerMw: 42.8, peakDieTempC: 37.4, seed: "sha256:9f82a1" },
    { id: "TRC-102", timestamp: "2026-10-21 10:30", fvc: 3.42, fev1: 2.84, pef: 428, peakPowerMw: 44.1, peakDieTempC: 37.9, seed: "sha256:4c71b8" },
    { id: "TRC-103", timestamp: "2026-10-23 14:20", fvc: 3.66, fev1: 3.09, pef: 451, peakPowerMw: 45.6, peakDieTempC: 38.2, seed: "sha256:2e90f4" },
    { id: "TRC-104", timestamp: "2026-10-25 11:05", fvc: 3.89, fev1: 3.31, pef: 474, peakPowerMw: 46.9, peakDieTempC: 38.6, seed: "sha256:7a15d3" }
  ],
  bookedMaintenanceDays: [10, 19, 21, 24, 30],
  hardwareLease: {
    leaseId: "HW-POOL-2026-09",
    unitModel: "AeroCare TracePro DevKit v3 (RTL/CFD Instrumented)",
    allocatedDays: 18,
    quotaDays: 30,
    dailyCostUsd: 15,
    collateralUsd: 450
  }
};
