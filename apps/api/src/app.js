import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import router from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { error } from './lib/response.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  // Default 100kb is too small for a base64-encoded logo upload
  // (settingsService.js caps the raw image at 2MB, ~2.7MB as base64) —
  // every other route's payloads are far smaller, so this ceiling is safe.
  app.use(express.json({ limit: '3mb' }));

  app.use('/api', router);

  app.use((req, res) => {
    res.status(404).json(error('NOT_FOUND', 'Not found.'));
  });

  app.use(errorHandler);

  return app;
}
