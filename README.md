# AeroCare SimInfra — Trace-Driven Power/Thermal Simulation & Pulmonary Telemetry Platform

An end-to-end **Simulation Infrastructure, Automated Regression Pipeline, and 12-Page Interactive Web Telemetry Platform** engineered with **React 18 (ES Modules)**, **Node.js / Express REST API**, **C++20 Reduced-Order Thermal Solver**, and **Python/Bash Automation Workflows**.

---

## 🎯 Architectural Highlights (Aligned with Simulation Infrastructure & Trace-Driven Simulator Roles)

1. **Simulation Infrastructure & Automated Regression Tooling (`scripts/automation/`, `server/`, Pages 08 & 10)**
   - **Linux Compute Cluster & Environment Management**: `scripts/automation/cluster_env_setup.sh` provisions deterministic multi-core simulation environments (`OMP_NUM_THREADS`, `SIM_DETERMINISTIC_SEED`) across x86_64 Ubuntu and ARM64 Neoverse nodes.
   - **Automated Regression & Reproducibility Pipeline**: `scripts/automation/run_regression.py` and `.github/workflows/sim_regression_and_deploy.yml` execute continuous trace-driven regression suites across RTL SoC power macromodels and CFD airflow meshes, verifying bit-exact SHA-256 reproducibility and `<0.02%` thermal drift.
2. **Trace-Driven Power/Thermal & CFD Solver Engine (`engine/cpp_solver/thermal_rom_solver.hpp`, Pages 02, 04, 09)**
   - **Time-Indexed Multi-Domain Simulation**: Couples respiratory airflow workload traces (`Q(t)`), IP-level power macromodels (`BLE SoC`, `Piezo MEMS ADC`, `Proportional Valve Actuator`), and a 16-node reduced-order thermal network (`dt = 1.0ms`).
   - **Spatiotemporal Hotspot Analysis**: Generates transient `4x4` die and actuator thermal maps alongside multi-ring component wear and calibration schedules.
3. **12-Page Modular React 18 Frontend + Express Backend (`src/`, `server/`, `index.html`)**
   - Designed with an **Editorial Minimalist + Reality-by-Design HUD Callout + Co-Design 20-Tile Grid** aesthetic.
   - Works **out-of-the-box on GitHub Pages** via native browser ES Modules (`./src/app.js`, `./src/data/simStore.js`, `./src/services/apiClient.js`) while seamlessly connecting to the local Express REST backend (`http://localhost:4000/api/v1/sim`) when running full-stack locally.

---

## 📂 Multi-File Project Structure

```text
aerocare-sim-infra-platform/
├── .github/workflows/
│   └── sim_regression_and_deploy.yml  # CI pipeline: runs Python regression & deploys to GitHub Pages
├── engine/cpp_solver/
│   └── thermal_rom_solver.hpp         # C++20 Time-Stepped Power & CFD Reduced-Order Thermal Solver
├── scripts/automation/
│   ├── run_regression.py              # Python automated trace regression & SHA-256 verification
│   └── cluster_env_setup.sh           # Bash Linux compute server provisioning script
├── server/
│   ├── server.js                      # Node.js + Express REST API server
│   ├── models/SimDatabase.js          # Cluster node, trace, and regression data models
│   └── routes/sim_infra.routes.js     # REST endpoints for trace execution & regression dispatch
├── src/
│   ├── app.js                         # 12-Page Modular React 18 Application
│   ├── data/simStore.js               # Time-indexed trace store & cluster state
│   └── services/apiClient.js          # Hybrid REST API client with Edge Sim fallback
├── index.html                         # Entry HTML loading ./src/app.js via ES Modules
└── package.json                       # Full-stack scripts & dependencies
```

---

## 🚀 Quick Start (GitHub Pages & Local Full-Stack)

### 1. Zero-Config GitHub Pages Deployment
Push all files in this folder to your GitHub repository root. GitHub Pages will serve `index.html` and automatically load the multi-file React modules (`./src/app.js`, `./src/data/simStore.js`, `./src/services/apiClient.js`) directly in any visitor's browser.

### 2. Run Full-Stack Locally (Express API + Python Regression)
```bash
# Run Python automated trace-driven regression suite
npm run regression

# Start Express REST Backend on port 4000
npm run server
```
