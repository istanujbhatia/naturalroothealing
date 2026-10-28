import { Router } from 'express';
import { Types } from 'mongoose';
import type { AppConfig } from '../config.js';
import { AppError } from '../errors.js';
import { requireAdmin, requireCsrf } from '../auth/request.js';
import { validateBody } from '../validation.js';
import { recordAudit } from '../audit/service.js';
import { OrderModel } from '../order/models/order.js';
import { UserModel } from '../auth/models/user.js';
import { adminOrderStatusSchema, cancellationSchema, shipmentSchema } from '../order/admin-schemas.js';
import { assertAdminStatusChange, assertAdminWorkflowTransition, assertApprovedTrackingUrl, assertCancellationEligibility, assertShipmentEligibility, nextAdminOrderStatus } from '../order/admin-service.js';
import { canonicalOrderStatus, legacyOrderFields } from '../order/status.js';
import { parsePagination } from '../catalog/query.js';
import { PaymentModel } from '../payment/model.js';
import { releaseOrderReservation } from '../payment/service.js';

export function createAdminOrdersRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAdmin(config));

  router.get('/', async (req, res, next) => {
    try {
      const { page, limit } = parsePagination(req.query.page, req.query.limit, 10);
      const filter: Record<string, unknown> = {};
      for (const key of ['orderStatus', 'paymentStatus', 'fulfillmentStatus']) {
        const value = String(req.query[key] ?? '').trim();
        if (value) filter[key] = value;
      }
      for (const [queryKey, field] of [['payment', 'order_status.payment'], ['prep', 'order_status.prep'], ['delivery', 'order_status.delivery']] as const) {
        const value = String(req.query[queryKey] ?? '').trim();
        if (value) filter[field] = value;
      }
      const search = String(req.query.search ?? '').trim();
      if (search) {
        const expression = { $regex: escapeRegex(search), $options: 'i' };
        const matchingUsers = await UserModel.find({ $or: [{ name: expression }, { email: expression }, { phone: expression }] }).select('_id').lean();
        filter.$or = [{ orderNumber: expression }, { userId: { $in: matchingUsers.map((user) => user._id) } }];
      }
      if (req.query.from || req.query.to) filter.createdAt = dateRange(req.query.from, req.query.to);
      const [orders, total] = await Promise.all([
        OrderModel.find(filter).populate('userId', 'name email phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        OrderModel.countDocuments(filter),
      ]);
      res.json({ data: { orders: await Promise.all(orders.map(toAdminOrder)), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
    } catch (error) { next(error); }
  });

  router.get('/:orderId', async (req, res, next) => {
    try { res.json({ data: { order: await toAdminOrder(await findOrder(req.params.orderId)) } }); } catch (error) { next(error); }
  });

  router.patch('/:orderId/status', requireCsrf, validateBody(adminOrderStatusSchema), async (req, res, next) => {
    try {
      let order = await findOrder(req.params.orderId);
      const { phase, status, reason, shipment } = req.body;
      assertAdminWorkflowTransition(order, phase, status);
      if (phase === 'delivery' && status === 'processing') assertApprovedTrackingUrl(shipment.trackingUrl);
      const before = { order_status: canonicalOrderStatus(order) };
      const current = canonicalOrderStatus(order);
      const next = nextAdminOrderStatus(current, phase, status);
      assertAdminStatusChange(current, next, phase, status);
      const now = new Date();
      order.order_status = next;
      Object.assign(order, legacyOrderFields(next));
      order.payment = { ...(order.payment || { status: next.payment }), status: next.payment };
      order.preparation = { ...(order.preparation || { status: 'pending' }), status: next.prep, ...(next.prep === 'prepared' ? { preparedAt: order.preparation?.preparedAt || now, preparedBy: order.preparation?.preparedBy || req.auth!.userId } : {}) };
      order.delivery = { ...(order.delivery || { status: 'awaiting_handover' }), status: next.delivery === 'pending' ? 'awaiting_handover' : next.delivery, ...(phase === 'delivery' && status === 'processing' ? { carrier: shipment.carrier, trackingId: shipment.trackingId, trackingUrl: shipment.trackingUrl, handoverAt: new Date(), shippedAt: shipment.shippedAt, handoverBy: req.auth!.userId } : {}) };
      if (phase === 'delivery' && status === 'processing') {
        const handoverAt = order.delivery.handoverAt;
        order.order_status = { ...next, tracking: { carrier: shipment.carrier, tracking_id: shipment.trackingId, tracking_url: shipment.trackingUrl, handover_at: handoverAt, shipped_at: shipment.shippedAt } };
        order.fulfillmentStatus = 'processing';
        order.orderStatus = 'processing';
        order.trackingCarrier = shipment.carrier;
        order.trackingId = shipment.trackingId;
        order.trackingUrl = shipment.trackingUrl;
      }
      order.statusHistory.push({ phase, status: phase === 'preparation' ? next.prep : next.delivery, changedAt: new Date(), changedBy: req.auth!.userId, reason });
      await order.save();
      await recordAudit({ actorUserId: req.auth!.userId, action: 'order.status_updated', entityType: 'Order', entityId: String(order._id), requestId: String(req.id), changes: { before, after: { order_status: canonicalOrderStatus(order), reason } } });
      res.json({ data: { order: toAdminOrder(order.toObject()) } });
    } catch (error) { next(error); }
  });

  router.patch('/:orderId/shipment', requireCsrf, validateBody(shipmentSchema), async (req, res, next) => {
    try {
      const order = await findOrder(req.params.orderId);
      assertApprovedTrackingUrl(req.body.trackingUrl);
      assertShipmentEligibility(order);
      const before = { order_status: canonicalOrderStatus(order) };
      const handoverAt = new Date();
      order.order_status = { ...canonicalOrderStatus(order), delivery: 'processing', tracking: { carrier: req.body.carrier, tracking_id: req.body.trackingId, tracking_url: req.body.trackingUrl, handover_at: handoverAt, shipped_at: req.body.shippedAt } };
      order.delivery = { ...(order.delivery || { status: 'awaiting_handover' }), status: 'processing', carrier: req.body.carrier, trackingId: req.body.trackingId, trackingUrl: req.body.trackingUrl, handoverAt, shippedAt: req.body.shippedAt, handoverBy: req.auth!.userId };
      order.fulfillmentStatus = 'processing';
      order.orderStatus = 'processing';
      order.trackingCarrier = req.body.carrier;
      order.trackingId = req.body.trackingId;
      order.trackingUrl = req.body.trackingUrl;
      order.statusHistory.push({ phase: 'delivery', status: 'processing', changedAt: new Date(), changedBy: req.auth!.userId, reason: req.body.reason });
      await order.save();
      await recordAudit({ actorUserId: req.auth!.userId, action: 'shipment.handover_recorded', entityType: 'Order', entityId: String(order._id), requestId: String(req.id), changes: { before, after: { order_status: canonicalOrderStatus(order), reason: req.body.reason } } });
      res.json({ data: { order: toAdminOrder(order.toObject()) } });
    } catch (error) { next(error); }
  });

  router.patch('/:orderId/cancel', requireCsrf, validateBody(cancellationSchema), async (req, res, next) => {
    try {
      let order = await findOrder(req.params.orderId);
      assertCancellationEligibility(order);
      const before = { order_status: canonicalOrderStatus(order) };
      await releaseOrderReservation(String(order._id));
      order = await findOrder(req.params.orderId);
      order.orderStatus = 'cancelled';
      order.cancellation = { status: 'cancelled', reason: req.body.reason, cancelled_at: new Date(), cancelled_by: req.auth!.userId };
      order.statusHistory.push({ phase: 'cancellation', status: 'cancelled', changedAt: new Date(), changedBy: req.auth!.userId, reason: req.body.reason });
      await order.save();
      await recordAudit({ actorUserId: req.auth!.userId, action: 'order.cancelled', entityType: 'Order', entityId: String(order._id), requestId: String(req.id), changes: { before, after: { cancellation: order.cancellation, reason: req.body.reason } } });
      res.json({ data: { order: toAdminOrder(order.toObject()) } });
    } catch (error) { next(error); }
  });

  return router;
}

async function findOrder(identifier: string | string[] | undefined) {
  const id = String(identifier ?? '');
  if (!Types.ObjectId.isValid(id)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  const order = await OrderModel.findById(id).populate('userId', 'name email phone').exec();
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  return order as any;
}

async function toAdminOrder(order: any) {
  const source = typeof order.toObject === 'function' ? order.toObject() : order;
  const { _id, idempotencyKey: _idempotencyKey, ...safe } = source;
  const paymentAttempts = await PaymentModel.find({ orderId: _id }).select('provider mode providerOrderId providerPaymentId amountMinor currency status signatureVerified createdAt paidAt expiresAt').sort({ createdAt: -1 }).lean();
  return { ...safe, order_status: canonicalOrderStatus(source), id: String(_id), userId: source.userId && typeof source.userId === 'object' ? { id: String(source.userId._id), name: source.userId.name, email: source.userId.email, phone: source.userId.phone } : String(source.userId), paymentAttempts: paymentAttempts.map((payment) => ({ id: String(payment._id), provider: payment.provider, mode: payment.mode, providerOrderId: payment.providerOrderId, providerPaymentId: payment.providerPaymentId || null, amountMinor: payment.amountMinor, currency: payment.currency, status: payment.status, signatureVerified: payment.signatureVerified, createdAt: payment.createdAt, paidAt: payment.paidAt || null, expiresAt: payment.expiresAt })) };
}

function dateRange(from: unknown, to: unknown) {
  const range: Record<string, Date> = {};
  if (from) { const date = new Date(String(from)); if (Number.isNaN(date.getTime())) throw new AppError(400, 'INVALID_DATE_FILTER', 'Date filter is invalid'); range.$gte = date; }
  if (to) { const date = new Date(String(to)); if (Number.isNaN(date.getTime())) throw new AppError(400, 'INVALID_DATE_FILTER', 'Date filter is invalid'); range.$lte = date; }
  return range;
}

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
