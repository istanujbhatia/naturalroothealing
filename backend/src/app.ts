import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import type { AppConfig } from './config.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { createLogger } from './logger.js';
import { requestId } from './request-id.js';
import { healthRouter } from './routes/health.js';
import { createAuthRouter } from './routes/auth.js';
import { createAccountRouter } from './routes/account.js';
import { createCartRouter } from './routes/cart.js';
import { createOrdersRouter } from './routes/orders.js';

export function createApp(config: AppConfig) {
  const logger = createLogger(config.logLevel);
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.nodeEnv === 'production' ? 1 : false);
  app.use(requestId);
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(cors({
    origin: config.frontendOrigins.includes('*') ? true : config.frontendOrigins,
    credentials: true,
  }));
  app.use(express.json({ limit: config.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: config.jsonBodyLimit }));
  app.use(rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    skip: () => config.nodeEnv === 'development',
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      });
    },
  }));
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', createAuthRouter(config));
  app.use('/api/v1/account', createAccountRouter(config));
  app.use('/api/v1/cart', createCartRouter(config));
  app.use('/api/v1/orders', createOrdersRouter(config));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
