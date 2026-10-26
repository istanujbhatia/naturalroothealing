import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth, requireCsrf } from '../auth/request.js';
import { validateBody } from '../validation.js';
import { addCartItemSchema, mergeCartSchema, updateCartItemSchema } from '../cart/schemas.js';
import { addCartItem, clearCart, getCart, mergeCart, removeCartItem, updateCartItem } from '../cart/service.js';
import { cartRepository, productRepository } from '../cart/repositories.js';

export function createCartRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAuth(config));

  router.get('/', async (req, res, next) => {
    try { res.json({ data: { cart: await getCart(req.auth!.userId, cartRepository, productRepository) } }); }
    catch (error) { next(error); }
  });
  router.post('/items', requireCsrf, validateBody(addCartItemSchema), async (req, res, next) => {
    try { res.status(201).json({ data: { cart: await addCartItem(req.auth!.userId, req.body, cartRepository, productRepository) } }); }
    catch (error) { next(error); }
  });
  router.patch('/items/:productId', requireCsrf, validateBody(updateCartItemSchema), async (req, res, next) => {
    try { res.json({ data: { cart: await updateCartItem(req.auth!.userId, routeParam(req.params.productId), req.body.quantity, cartRepository, productRepository) } }); }
    catch (error) { next(error); }
  });
  router.delete('/items/:productId', requireCsrf, async (req, res, next) => {
    try { res.json({ data: { cart: await removeCartItem(req.auth!.userId, routeParam(req.params.productId), cartRepository, productRepository) } }); }
    catch (error) { next(error); }
  });
  router.delete('/', requireCsrf, async (req, res, next) => {
    try { res.json({ data: { cart: await clearCart(req.auth!.userId, cartRepository, productRepository) } }); }
    catch (error) { next(error); }
  });
  router.post('/merge', requireCsrf, validateBody(mergeCartSchema), async (req, res, next) => {
    try { res.json({ data: { cart: await mergeCart(req.auth!.userId, req.body.items, cartRepository, productRepository) } }); }
    catch (error) { next(error); }
  });
  return router;
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}
