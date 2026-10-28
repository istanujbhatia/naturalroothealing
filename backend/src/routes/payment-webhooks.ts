import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { processRazorpayWebhook } from '../payment/service.js';

export function createPaymentWebhooksRouter(config: AppConfig): Router {
  const router = Router();
  router.post('/razorpay', async (req, res, next) => { try { const rawBody = (req as any).rawBody as Buffer | undefined; if (!rawBody) { res.status(400).json({ error: { code: 'RAW_BODY_REQUIRED', message: 'Webhook payload could not be verified' } }); return; } res.json({ data: await processRazorpayWebhook(rawBody, req.header('x-razorpay-signature') || undefined, req.header('x-razorpay-event-id') || undefined, config) }); } catch (error) { next(error); } });
  return router;
}
