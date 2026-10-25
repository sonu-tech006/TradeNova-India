import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './server/routes/api.js';
import { connectToDatabase } from './server/db/connection.js';
import { DataRepository } from './server/db/store.js';

import { alertEngine } from './server/services/AlertEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Connect to Database and Seed Indian Stock Universe
  await connectToDatabase();
  await DataRepository.init();
  await alertEngine.init();

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'TradeNova Indian Stock Market Platform',
      version: '2.5.0',
    });
  });

  if (!isProd) {
    // Development mode: attach Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TradeNova Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[TradeNova Server] Startup failure:', err);
  process.exit(1);
});
