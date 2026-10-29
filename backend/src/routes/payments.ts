import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth, requireCsrf } from '../auth/request.js';
import { validateBody } from '../validation.js';
import { paymentStartSchema, paymentVerifySchema } from '../payment/schemas.js';
import { abandonRazorpayPayment, getRazorpayPaymentStatus, startRazorpayPayment, verifyRazorpayPayment } from '../payment/service.js';

export function createPaymentsRouter(config: AppConfig): Router {
  const router = Router(); router.use(requireAuth(config));
  router.post('/razorpay/order', requireCsrf, validateBody(paymentStartSchema), async (req, res, next) => { try { const key = req.header('idempotency-key')?.trim(); if (!key) { res.status(400).json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key header required' } }); return; } res.status(201).json({ data: await startRazorpayPayment(req.auth!.userId, req.body.orderId, key, config) }); } catch (error) { next(error); } });
  router.post('/razorpay/verify', requireCsrf, validateBody(paymentVerifySchema), async (req, res, next) => { try { res.json({ data: await verifyRazorpayPayment(req.auth!.userId, req.body, config) }); } catch (error) { next(error); } });
  router.post('/razorpay/abandon', requireCsrf, validateBody(paymentStartSchema), async (req, res, next) => { try { await abandonRazorpayPayment(req.auth!.userId, req.body.orderId); res.json({ data: { status: 'failed' } }); } catch (error) { next(error); } });
  router.get('/razorpay/:orderId/status', async (req, res, next) => { try { res.json({ data: await getRazorpayPaymentStatus(req.auth!.userId, String(req.params.orderId)) }); } catch (error) { next(error); } });
  return router;
}
