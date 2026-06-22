import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import entityRoutes from './routes/entities.js';
import integrationRoutes, { uploadsDir } from './routes/integrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: config.app.name });
});

app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/integrations', integrationRoutes);

async function start() {
  await initDb();
  const { port, host } = config.server;
  app.listen(port, host, () => {
    console.log(`Sammy API running at http://${host}:${port}`);
    console.log(`Config loaded from ${path.join(__dirname, '..', 'config.json')}`);
    console.log(`Dev OTP code: ${config.auth.devOtp}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
