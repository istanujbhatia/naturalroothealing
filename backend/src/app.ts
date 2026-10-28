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
import { createAdminRouter } from './routes/admin.js';
import { catalogRouter } from './routes/catalog.js';
import { createAdminCatalogRouter } from './routes/admin-catalog.js';
import { createAdminOrdersRouter } from './routes/admin-orders.js';
import { createAdminUsersRouter } from './routes/admin-users.js';
import { createContactRouter } from './routes/contact.js';
import { createAdminContactRouter } from './routes/admin-contact.js';
import { createReviewsRouter } from './routes/reviews.js';
import { createAdminReviewsRouter } from './routes/admin-reviews.js';
import { createPaymentsRouter } from './routes/payments.js';
import { createPaymentWebhooksRouter } from './routes/payment-webhooks.js';

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
  app.use('/api/v1/admin/catalog/assets', express.json({ limit: '8mb' }));
  app.use(express.json({ limit: config.jsonBodyLimit, verify: (req, _res, buffer) => { (req as any).rawBody = Buffer.from(buffer); } }));
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
  app.use('/api/v1/payments', createPaymentsRouter(config));
  app.use('/api/v1/webhooks', createPaymentWebhooksRouter(config));
  app.use('/api/v1/contact', createContactRouter(config));
  app.use('/api/v1/admin', createAdminRouter(config));
  app.use('/api/v1/admin/catalog', createAdminCatalogRouter(config));
  app.use('/api/v1/admin/orders', createAdminOrdersRouter(config));
  app.use('/api/v1/admin/users', createAdminUsersRouter(config));
  app.use('/api/v1/admin/contact', createAdminContactRouter(config));
  app.use('/api/v1/catalog/products', createReviewsRouter(config));
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/admin/reviews', createAdminReviewsRouter(config));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
