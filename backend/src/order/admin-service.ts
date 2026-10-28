import { AppError } from '../errors.js';
import type { CanonicalOrderStatus } from './status.js';

export type OrderPhase = 'payment' | 'preparation' | 'delivery';
type WorkflowOrder = { order_status?: CanonicalOrderStatus; cancellation?: { status?: string }; paymentStatus: string; payment?: { status?: string }; preparation?: { status?: string }; delivery?: { status?: string }; orderStatus: string };

const paymentTransitions: Record<string, string[]> = { pending: ['paid', 'failed'], paid: [], failed: [] };
const preparationTransitions: Record<string, string[]> = { pending: ['being_prepared'], being_prepared: ['prepared'], prepared: [] };
const deliveryTransitions: Record<string, string[]> = { awaiting_handover: ['processing'], processing: ['shipped'], shipped: [], delivered: [] };

export function assertAdminPhaseTransition(phase: OrderPhase, current: string, next: string): void {
  const transitions = phase === 'payment' ? paymentTransitions : phase === 'preparation' ? preparationTransitions : deliveryTransitions;
  if (!transitions[current]?.includes(next)) throw new AppError(409, 'INVALID_ORDER_STATUS_TRANSITION', 'Order status transition is not allowed');
}

export function assertAdminWorkflowTransition(order: WorkflowOrder, phase: OrderPhase, next: string): void {
  if (order.cancellation?.status === 'cancelled' || order.orderStatus === 'cancelled') throw new AppError(409, 'ORDER_CANCELLED', 'Cancelled orders cannot continue through the normal workflow');
  const status = order.order_status;
  const payment = status?.payment || (order.payment?.status === 'confirmed' || order.paymentStatus === 'paid' ? 'confirmed' : 'awaiting_payment');
  const valid = phase === 'preparation' ? ['pending', 'being_prepared', 'prepared'] : ['pending', 'processing', 'delivered'];
  if (!valid.includes(next)) throw new AppError(400, 'INVALID_ORDER_STATUS', 'Status is not valid for this phase');
  if (next !== 'pending' && payment !== 'confirmed') throw new AppError(409, 'PAYMENT_NOT_CONFIRMED', 'Payment must be confirmed before updating this phase');
}

export function nextAdminOrderStatus(current: CanonicalOrderStatus, phase: 'preparation' | 'delivery', next: string): CanonicalOrderStatus {
  const delivery = phase === 'delivery' ? next as CanonicalOrderStatus['delivery'] : current.delivery;
  return { ...current, prep: delivery !== 'pending' ? 'prepared' : phase === 'preparation' ? next as CanonicalOrderStatus['prep'] : current.prep, delivery };
}

export function assertAdminStatusChange(current: CanonicalOrderStatus, next: CanonicalOrderStatus, phase: 'preparation' | 'delivery', requested: string): void {
  if (current.prep !== next.prep || current.delivery !== next.delivery) return;
  if (phase === 'preparation' && requested !== next.prep) throw new AppError(409, 'ORDER_STATUS_UNCHANGED', 'Delivery is already beyond pending, so preparation must remain prepared. Set Delivery to pending before changing Order back to pending.');
  throw new AppError(409, 'ORDER_STATUS_UNCHANGED', 'That phase is already set to the selected status.');
}

export function assertShipmentEligibility(order: WorkflowOrder): void {
  const status = order.order_status;
  if (order.cancellation?.status === 'cancelled' || order.orderStatus === 'cancelled' || (status?.payment || order.payment?.status) !== 'confirmed' || (status?.prep || order.preparation?.status) !== 'prepared' || (status?.delivery || 'pending') !== 'pending') {
    throw new AppError(409, 'SHIPMENT_NOT_ELIGIBLE', 'Confirmed payment, prepared order, and pending delivery are required before DHL handover');
  }
}

export function assertCancellationEligibility(order: WorkflowOrder): void {
  if (order.cancellation?.status === 'cancelled' || order.orderStatus === 'cancelled' || order.order_status?.delivery === 'processing' || order.order_status?.delivery === 'delivered' || ['shipped', 'delivered'].includes(order.delivery?.status || '')) {
    throw new AppError(409, 'ORDER_NOT_CANCELLABLE', 'This order can no longer be cancelled');
  }
}

export function assertApprovedTrackingUrl(value: string): void {
  let url: URL;
  try { url = new URL(value); } catch { throw new AppError(400, 'INVALID_TRACKING_URL', 'Tracking URL is invalid'); }
  const host = url.hostname.toLowerCase();
  const approved = host === 'dhl.com' || host.endsWith('.dhl.com') || host === 'dhl.de' || host.endsWith('.dhl.de') || host === 'dhlparcel.com' || host.endsWith('.dhlparcel.com');
  if (url.protocol !== 'https:' || !approved) throw new AppError(400, 'INVALID_TRACKING_URL', 'Tracking URL must be an approved DHL HTTPS URL');
}
