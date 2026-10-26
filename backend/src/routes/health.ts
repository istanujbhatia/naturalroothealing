import { Router } from 'express';
import { databaseStatus } from '../db.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const database = databaseStatus();
  const healthy = database === 'connected';
  res.status(healthy ? 200 : 503).json({
    data: {
      status: healthy ? 'ok' : 'degraded',
      database,
      timestamp: new Date().toISOString(),
    },
  });
});
