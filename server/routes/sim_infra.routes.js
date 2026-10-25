import express from 'express';
import { SimDatabase } from '../models/SimDatabase.js';

export const simInfraRouter = express.Router();

// GET full simulation infrastructure & telemetry snapshot
simInfraRouter.get('/snapshot', (req, res) => {
  res.json({
    status: "OK",
    engineVersion: "3.2.0-ROM-CFD",
    data: SimDatabase
  });
});

// POST trigger new automated regression suite run
simInfraRouter.post('/regression/trigger', (req, res) => {
  const { suiteName, domain } = req.body;
  const newRun = {
    runId: `REG-2026-${Math.floor(9000 + Math.random() * 999)}`,
    suite: suiteName || "Custom_TimeIndexed_PowerThermal_Sweep",
    domain: domain || "RTL + CFD Co-Sim",
    samples: "200k steps",
    duration: `${(1.1 + Math.random() * 1.5).toFixed(2)}s`,
    drift: `${(0.003 + Math.random() * 0.01).toFixed(3)}%`,
    seed: `0x${Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase()}`,
    status: "PASS",
    gitSha: "b48e19d"
  };
  SimDatabase.regressionSuites.unshift(newRun);
  res.status(201).json({ status: "OK", newRun, regressionSuites: SimDatabase.regressionSuites });
});

// POST append new trace-driven spirometry & power/thermal run
simInfraRouter.post('/trace/execute', (req, res) => {
  const { fvc, fev1, pef, peakPowerMw, peakDieTempC } = req.body;
  const newTrace = {
    id: `TRC-${Math.floor(105 + Math.random() * 890)}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    fvc: Number(fvc),
    fev1: Number(fev1),
    pef: Number(pef),
    peakPowerMw: Number(peakPowerMw),
    peakDieTempC: Number(peakDieTempC),
    seed: `sha256:${Math.floor(Math.random() * 0xffffff).toString(16)}`
  };
  SimDatabase.spirometryTraces.push(newTrace);
  res.status(201).json({ status: "OK", newTrace });
});
