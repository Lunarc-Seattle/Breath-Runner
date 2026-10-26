/**
 * Breath Trainer server: serves the web app and the session REST API.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createApp } from './app.js';
import { createSessionRepository } from './models/sessionRepository.js';

const PORT = Number(process.env.PORT) || 4000;
const DATA_FILE = process.env.DATA_FILE || resolve(dirname(fileURLToPath(import.meta.url)), 'data', 'sessions.json');

const repository = await createSessionRepository({ filePath: DATA_FILE });
const app = createApp({ repository });

app.listen(PORT, () => {
  console.log(`[Breath Trainer] http://localhost:${PORT}  (data: ${DATA_FILE})`);
});
