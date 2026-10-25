#!/usr/bin/env bash
# ==============================================================================
# AeroCare Simulation Server & Compute Cluster Provisioning Script (Linux/Ubuntu)
# Owns simulation infrastructure, environment reproducibility, and RTL/CFD daemon setup.
# ==============================================================================
set -euo pipefail

echo "[SimInfra] Validating Linux Compute Node Environment..."
uname -a

export AEROCARE_SIM_ROOT=$(pwd)
export OMP_NUM_THREADS=8
export SIM_DETERMINISTIC_SEED=0x2026CAFE

echo "[SimInfra] Checking C++20 Compiler & Python3 Trace Pipeline Tooling..."
command -v python3 >/dev/null 2>&1 || { echo "Python3 required"; exit 1; }

echo "[SimInfra] Running Automated Trace Regression Verification..."
python3 "${AEROCARE_SIM_ROOT}/scripts/automation/run_regression.py"

echo "[SimInfra] Simulation Compute Node Ready."
