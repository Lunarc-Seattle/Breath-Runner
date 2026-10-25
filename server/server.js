/**
 * AeroCare Trace-Driven Simulation & Infrastructure Express API Server
 */
import express from 'express';
import cors from 'cors';
import { simInfraRouter } from './routes/sim_infra.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/v1/sim', simInfraRouter);

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'aerocare-sim-infra-daemon',
    architecture: 'Time-Indexed Power/Thermal & CFD ROM Engine',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[AeroCare SimInfra Server] Listening on http://localhost:${PORT}`);
});
