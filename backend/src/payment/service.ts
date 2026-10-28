import { createHmac, timingSafeEqual } from 'node:crypto';
import mongoose, { Types, type ClientSession } from 'mongoose';
import type { AppConfig } from '../config.js';
import { AppError } from '../errors.js';
import { OrderModel } from '../order/models/order.js';
import { canonicalOrderStatus } from '../order/status.js';
import { PaymentModel } from './model.js';
import { settleInventory } from './inventory.js';
import { recordAudit } from '../audit/service.js';

type ProviderPayment = { id?: string; order_id?: string; amount?: number; currency?: string; status?: string };

function requireConfig(config: AppConfig): { keyId: string; secret: string } {
  if (config.razorpayMode !== 'test' || !config.razorpayKeyId || !config.razorpayKeySecret) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Test payment processing is not configured');
  return { keyId: config.razorpayKeyId, secret: config.razorpayKeySecret };
}

async function razorpayRequest<T>(config: AppConfig, path: string, init: RequestInit = {}): Promise<T> {
  const { keyId, secret } = requireConfig(config);
  const response = await fetch(`https://api.razorpay.com/v1${path}`, { ...init, headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment provider could not process the request');
  return payload as T;
}

export async function startRazorpayPayment(userId: string, orderId: string, idempotencyKey: string, config: AppConfig) {
  if (!Types.ObjectId.isValid(orderId)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  const existing = await PaymentModel.findOne({ userId, idempotencyKey }).lean();
  if (existing) {
    if (existing.providerOrderId) return paymentResponse(existing, config);
    throw new AppError(409, 'PAYMENT_ATTEMPT_IN_PROGRESS', 'A payment attempt is already being prepared. Please retry after checking its status');
  }
  const order = await OrderModel.findOne({ _id: orderId, userId }).lean();
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  const status = canonicalOrderStatus(order);
  if (status.payment !== 'awaiting_payment') throw new AppError(409, 'PAYMENT_NOT_ELIGIBLE', 'This order is not awaiting payment');
  if (order.stockReservation?.status !== 'reserved' || new Date(order.stockReservation.expiresAt).getTime() <= Date.now()) {
    await expireOrderReservation(order._id, 'Payment reservation expired');
    throw new AppError(409, 'PAYMENT_RESERVATION_EXPIRED', 'This order reservation has expired. Please create a new order');
  }
  let attempt;
  try {
    attempt = await PaymentModel.create({ orderId: order._id, userId, provider: 'razorpay', mode: 'test', amountMinor: order.totalMinor, currency: order.currency, status: 'created', signatureVerified: false, idempotencyKey, expiresAt: order.stockReservation.expiresAt, initiationClaimedAt: new Date(), safeMetadata: { orderNumber: order.orderNumber } });
  } catch (error) {
    if ((error as any)?.code === 11000) throw new AppError(409, 'PAYMENT_ATTEMPT_IN_PROGRESS', 'A payment attempt is already being prepared. Please retry after checking its status');
    throw error;
  }
  const providerOrder = await razorpayRequest<{ id: string; amount: number; currency: string }>(config, '/orders', { method: 'POST', body: JSON.stringify({ amount: order.totalMinor, currency: order.currency, receipt: order.orderNumber, notes: { internal_order_id: String(order._id) } }) });
  if (providerOrder.amount !== order.totalMinor || providerOrder.currency !== order.currency) throw new AppError(502, 'PAYMENT_AMOUNT_MISMATCH', 'The payment provider returned an unexpected amount or currency');
  const payment = await PaymentModel.findOneAndUpdate({ _id: attempt._id, providerOrderId: { $exists: false } }, { $set: { providerOrderId: providerOrder.id }, $unset: { initiationClaimedAt: 1 } }, { new: true }).lean();
  if (!payment) throw new AppError(503, 'PAYMENT_PERSISTENCE_UNCERTAIN', 'Payment setup could not be saved safely. Contact support before retrying');
  return paymentResponse(payment, config);
}

export async function verifyRazorpayPayment(userId: string, input: { orderId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }, config: AppConfig, actor = 'razorpay') {
  const { secret } = requireConfig(config);
  const payment = await PaymentModel.findOne({ orderId: input.orderId, userId, providerOrderId: input.razorpayOrderId });
  if (!payment) throw new AppError(404, 'PAYMENT_ATTEMPT_NOT_FOUND', 'Payment attempt not found');
  if (!verifyRazorpaySignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature, secret)) throw new AppError(400, 'INVALID_PAYMENT_SIGNATURE', 'Payment verification failed');
  const providerPayment = await razorpayRequest<ProviderPayment>(config, `/payments/${encodeURIComponent(input.razorpayPaymentId)}`);
  validateProviderPayment(payment, providerPayment, input.razorpayOrderId, input.razorpayPaymentId);
  payment.providerPaymentId = input.razorpayPaymentId;
  payment.signatureVerified = true;
  if (providerPayment.status === 'captured') {
    const confirmed = await confirmPayment(payment, actor);
    if (!confirmed) { payment.status = 'captured'; await payment.save(); return { status: 'captured_needs_reconciliation', orderId: input.orderId }; }
    return { status: 'confirmed', orderId: input.orderId };
  }
  if (providerPayment.status === 'failed') await failPayment(payment, 'Payment failed');
  else { payment.status = providerPayment.status === 'authorized' ? 'authorized' : 'pending'; await payment.save(); }
  return { status: payment.status, orderId: input.orderId };
}

export async function processRazorpayWebhook(rawBody: Buffer, signature: string | undefined, eventId: string | undefined, config: AppConfig) {
  if (!config.razorpayWebhookSecret || !signature) throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook verification failed');
  const expected = createHmac('sha256', config.razorpayWebhookSecret).update(rawBody).digest('hex');
  if (!safeEqual(expected, signature)) throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook verification failed');
  const payload = JSON.parse(rawBody.toString('utf8')) as any;
  const event = String(payload?.event || '');
  const entity = payload?.payload?.payment?.entity || payload?.payload?.refund?.entity || payload?.payload?.order?.entity;
  const providerPaymentId = getWebhookPaymentId(event, entity);
  const providerOrderId = (entity?.order_id || entity?.id) as string | undefined;
  const identifiers = [providerPaymentId ? { providerPaymentId } : null, providerOrderId ? { providerOrderId } : null].filter(Boolean) as Record<string, string>[];
  if (!identifiers.length) return { status: 'ignored' };
  const payment = await PaymentModel.findOne({ $or: identifiers });
  if (!payment) return { status: 'ignored' };
  if (eventId && payment.webhookEventIds.includes(eventId)) return { status: 'duplicate' };
  if (eventId) payment.webhookEventIds.push(eventId);
  if (entity?.amount !== undefined && entity.amount !== payment.amountMinor) throw new AppError(400, 'PAYMENT_DETAILS_MISMATCH', 'Payment details do not match the order');
  if (entity?.currency && entity.currency !== payment.currency) throw new AppError(400, 'PAYMENT_DETAILS_MISMATCH', 'Payment details do not match the order');
  if (event === 'payment.captured' || event === 'order.paid') {
    const confirmed = await confirmPayment(payment, 'razorpay-webhook');
    if (!confirmed) { payment.status = 'captured'; await payment.save(); }
  }
  else if (event === 'payment.failed') await failPayment(payment, 'Payment failed through provider');
  else if (event === 'refund.processed') await refundPayment(payment, entity);
  else await payment.save();
  return { status: 'processed' };
}

export async function expirePendingReservations(): Promise<void> {
  for (let batch = 0; batch < 10; batch += 1) {
    const orders = await OrderModel.find({ 'stockReservation.status': 'reserved', 'stockReservation.expiresAt': { $lte: new Date() }, 'order_status.payment': 'awaiting_payment' }).select('_id').limit(100).lean();
    if (!orders.length) return;
    for (const order of orders) await expireOrderReservation(order._id, 'Payment reservation expired');
  }
}

async function confirmPayment(payment: any, actor: string) {
  let confirmed = false;
  let orderId = String(payment.orderId);
  await runTransaction(async (session) => {
    const order = await OrderModel.findOne({ _id: payment.orderId }).session(session);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    const current = canonicalOrderStatus(order);
    if (['failed', 'refunded'].includes(current.payment)) return;
    if (current.payment !== 'confirmed') {
      if (order.stockReservation?.status !== 'reserved') throw new AppError(409, 'PAYMENT_RESERVATION_NOT_ACTIVE', 'This payment cannot be confirmed because its stock reservation is no longer active');
      await settleInventory(order.items.map((item: any) => ({ productId: item.productId, quantity: item.quantity })), 'consume', session);
      order.order_status = { ...current, payment: 'confirmed' };
      order.payment = { ...(order.payment || {}), status: 'confirmed', verifiedAt: payment.paidAt || new Date(), verifiedBy: actor } as any;
      order.paymentStatus = 'paid'; order.orderStatus = 'confirmed';
      order.stockReservation = { ...order.stockReservation, status: 'consumed' } as any;
      order.statusHistory.push({ phase: 'payment', status: 'confirmed', changedAt: new Date(), changedBy: actor, reason: 'Trusted Razorpay payment confirmation' });
      await order.save({ session });
      confirmed = true;
    }
    payment.status = 'captured'; payment.paidAt = payment.paidAt || new Date(); payment.signatureVerified = true; await payment.save({ session });
  });
  if (confirmed) await recordAudit({ actorUserId: String(payment.userId), action: 'payment.confirmed', entityType: 'Payment', entityId: String(payment._id), requestId: actor, changes: { after: { orderId, provider: 'razorpay', status: 'captured', amountMinor: payment.amountMinor, currency: payment.currency } } });
  return confirmed;
}

async function failPayment(payment: any, reason: string) {
  if (['captured', 'refunded'].includes(payment.status)) return;
  await runTransaction(async (session) => {
    const order = await OrderModel.findOne({ _id: payment.orderId }).session(session);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    const current = canonicalOrderStatus(order);
    if (['confirmed', 'refunded'].includes(current.payment)) return;
    payment.status = 'failed'; await payment.save({ session });
    if (order.stockReservation?.status !== 'reserved') return;
    await settleInventory(order.items.map((item: any) => ({ productId: item.productId, quantity: item.quantity })), 'release', session);
    order.stockReservation = { ...order.stockReservation, status: 'released', releasedAt: new Date() } as any;
    order.order_status = { ...current, payment: 'failed' };
    order.payment = { ...(order.payment || {}), status: 'failed' } as any;
    order.paymentStatus = 'failed';
    order.statusHistory.push({ phase: 'payment', status: 'failed', changedAt: new Date(), changedBy: 'system', reason });
    await order.save({ session });
    await PaymentModel.updateMany({ orderId: payment.orderId, status: { $in: ['created', 'pending', 'authorized'] }, _id: { $ne: payment._id } }, { $set: { status: 'expired' } }, { session }).exec();
  });
}
async function refundPayment(payment: any, refund: any) {
  if (payment.status !== 'captured') return;
  if (!isFullRefundForPayment(refund, payment)) throw new AppError(400, 'PAYMENT_DETAILS_MISMATCH', 'Refund details do not match the payment');
  let refunded = false;
  await runTransaction(async (session) => {
    const order = await OrderModel.findById(payment.orderId).session(session);
    if (!order || canonicalOrderStatus(order).payment === 'refunded') return;
    payment.status = 'refunded'; await payment.save({ session });
    const current = canonicalOrderStatus(order);
    order.order_status = { ...current, payment: 'refunded' }; order.payment = { ...(order.payment || {}), status: 'refunded' } as any; order.paymentStatus = 'refunded'; order.statusHistory.push({ phase: 'payment', status: 'refunded', changedAt: new Date(), changedBy: 'razorpay-webhook', reason: 'Refund confirmed by provider' }); await order.save({ session });
    refunded = true;
  });
  if (refunded) await recordAudit({ actorUserId: String(payment.userId), action: 'payment.refunded', entityType: 'Payment', entityId: String(payment._id), requestId: 'razorpay-webhook', changes: { after: { orderId: String(payment.orderId), status: 'refunded', amountMinor: payment.amountMinor, currency: payment.currency } } });
}

async function expireOrderReservation(orderId: unknown, reason: string) {
  await runTransaction(async (session) => {
    const order = await OrderModel.findOne({ _id: orderId, 'stockReservation.status': 'reserved', 'stockReservation.expiresAt': { $lte: new Date() }, 'order_status.payment': 'awaiting_payment' }).session(session);
    if (!order) return;
    await settleInventory(order.items.map((item: any) => ({ productId: item.productId, quantity: item.quantity })), 'release', session);
    order.stockReservation = { ...order.stockReservation, status: 'released', releasedAt: new Date() } as any;
    order.order_status = { ...canonicalOrderStatus(order), payment: 'failed' };
    order.payment = { ...(order.payment || {}), status: 'failed' } as any;
    order.paymentStatus = 'failed';
    order.statusHistory.push({ phase: 'payment', status: 'failed', changedAt: new Date(), changedBy: 'system', reason });
    await order.save({ session });
    await PaymentModel.updateMany({ orderId, status: { $in: ['created', 'pending', 'authorized'] } }, { $set: { status: 'expired' } }, { session }).exec();
  });
}

export async function releaseOrderReservation(orderId: string): Promise<void> {
  await runTransaction(async (session) => {
    const order = await OrderModel.findOne({ _id: orderId, 'stockReservation.status': 'reserved' }).session(session);
    if (!order) return;
    await settleInventory(order.items.map((item: any) => ({ productId: item.productId, quantity: item.quantity })), 'release', session);
    order.stockReservation = { ...order.stockReservation, status: 'released', releasedAt: new Date() } as any;
    await order.save({ session });
  });
}

async function runTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => { result = await work(session); });
    return result;
  } finally {
    await session.endSession();
  }
}

function validateProviderPayment(payment: any, provider: ProviderPayment, expectedOrderId: string, paymentId: string) { if (provider.id !== paymentId || provider.order_id !== expectedOrderId || provider.amount !== payment.amountMinor || provider.currency !== payment.currency) throw new AppError(400, 'PAYMENT_DETAILS_MISMATCH', 'Payment details do not match the order'); }
export function verifyRazorpaySignature(providerOrderId: string, providerPaymentId: string, signature: string, secret: string) { const expected = createHmac('sha256', secret).update(`${providerOrderId}|${providerPaymentId}`).digest('hex'); return safeEqual(expected, signature); }
export function getWebhookPaymentId(event: string, entity: any): string | undefined { return (event === 'refund.processed' ? entity?.payment_id : entity?.id) || undefined; }
export function isFullRefundForPayment(refund: any, payment: { providerPaymentId?: string; amountMinor: number; currency: string }): boolean { return refund?.payment_id === payment.providerPaymentId && refund?.amount === payment.amountMinor && refund?.currency === payment.currency; }
function safeEqual(first: string, second: string) { const a = Buffer.from(first); const b = Buffer.from(second); return a.length === b.length && timingSafeEqual(a, b); }
function paymentResponse(payment: any, config: AppConfig) { if (!config.razorpayKeyId) throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Test payment processing is not configured'); return { paymentId: String(payment._id), orderId: String(payment.orderId), providerOrderId: payment.providerOrderId, amount: payment.amountMinor, currency: payment.currency, keyId: config.razorpayKeyId, status: payment.status, expiresAt: payment.expiresAt }; }

export async function getRazorpayPaymentStatus(userId: string, orderId: string) {
  if (!Types.ObjectId.isValid(orderId)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  const order = await OrderModel.findOne({ _id: orderId, userId }).lean();
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  const attempts = await PaymentModel.find({ orderId, userId }).select('provider mode providerOrderId providerPaymentId amountMinor currency status signatureVerified createdAt paidAt expiresAt').sort({ createdAt: -1 }).lean();
  return { orderId, payment: canonicalOrderStatus(order).payment, attempts: attempts.map((attempt) => ({ id: String(attempt._id), provider: attempt.provider, mode: attempt.mode, providerOrderId: attempt.providerOrderId, providerPaymentId: attempt.providerPaymentId || null, amountMinor: attempt.amountMinor, currency: attempt.currency, status: attempt.status, signatureVerified: attempt.signatureVerified, createdAt: attempt.createdAt, paidAt: attempt.paidAt || null, expiresAt: attempt.expiresAt })) };
}
