import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth, requireCsrf } from '../auth/request.js';
import { validateBody } from '../validation.js';
import { createOrderSchema } from '../order/schemas.js';
import { createOrder, getCustomerOrder, listCustomerOrders, toSafeOrder } from '../order/service.js';
import { orderAddressRepository, orderCartRepository, orderInventoryRepository, orderProductRepository, orderRepository, settingsRepository } from '../order/repositories.js';

export function createOrdersRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAuth(config));
  router.get('/', async (req, res, next) => {
    try { res.json({ data: { orders: (await listCustomerOrders(req.auth!.userId, orderRepository)).map(toSafeOrder) } }); } catch (error) { next(error); }
  });
  router.get('/:orderId', async (req, res, next) => {
    try { res.json({ data: { order: toSafeOrder(await getCustomerOrder(req.auth!.userId, String(req.params.orderId), orderRepository)) } }); } catch (error) { next(error); }
  });
  router.post('/', requireCsrf, validateBody(createOrderSchema), async (req, res, next) => {
    try {
      const key = req.header('idempotency-key')?.trim();
      if (!key || key.length > 200) { res.status(400).json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key header required' } }); return; }
      res.status(201).json({ data: { order: toSafeOrder(await createOrder(req.auth!.userId, req.body.addressId, key, orderRepository, orderCartRepository, orderProductRepository, orderAddressRepository, settingsRepository, orderInventoryRepository, config.paymentReservationTtlMinutes)) } });
    } catch (error) { next(error); }
  });
  return router;
}
