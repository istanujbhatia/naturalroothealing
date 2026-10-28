import { describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
import { assertAdminPhaseTransition, assertAdminStatusChange, assertAdminWorkflowTransition, assertApprovedTrackingUrl, assertCancellationEligibility, assertShipmentEligibility, nextAdminOrderStatus } from './admin-service.js';
import { adminOrderStatusSchema } from './admin-schemas.js';

describe('admin order operations', () => {
  it('allows only sequential preparation and delivery transitions', () => {
    expect(() => assertAdminPhaseTransition('preparation', 'pending', 'being_prepared')).not.toThrow();
    expect(() => assertAdminPhaseTransition('preparation', 'pending', 'prepared')).toThrow(AppError);
    expect(() => assertAdminPhaseTransition('delivery', 'processing', 'shipped')).not.toThrow();
  });

  it('requires verified payment and preparation before shipment', () => {
    expect(() => assertShipmentEligibility({ paymentStatus: 'pending', payment: { status: 'awaiting_payment' }, preparation: { status: 'prepared' }, delivery: { status: 'awaiting_handover' }, orderStatus: 'processing' })).toThrow(/required before DHL handover/);
    expect(() => assertShipmentEligibility({ paymentStatus: 'paid', payment: { status: 'confirmed' }, preparation: { status: 'prepared' }, delivery: { status: 'awaiting_handover' }, orderStatus: 'processing' })).not.toThrow();
  });

  it('accepts only DHL HTTPS tracking URLs', () => {
    expect(() => assertApprovedTrackingUrl('https://www.dhl.com/track?id=123')).not.toThrow();
    expect(() => assertApprovedTrackingUrl('http://www.dhl.com/track?id=123')).toThrow(/approved DHL/);
    expect(() => assertApprovedTrackingUrl('https://evil.example/redirect')).toThrow(/approved DHL/);
  });

  it('requires DHL shipment details when delivery moves to processing', () => {
    expect(adminOrderStatusSchema.safeParse({ phase: 'delivery', status: 'processing', reason: 'Handover confirmed' }).success).toBe(false);
    expect(adminOrderStatusSchema.safeParse({ phase: 'delivery', status: 'processing', reason: 'Handover confirmed', shipment: { carrier: 'DHL', trackingId: 'DHL-123', trackingUrl: 'https://www.dhl.com/track?id=123', shippedAt: '2026-10-28' } }).success).toBe(true);
    expect(adminOrderStatusSchema.safeParse({ phase: 'preparation', status: 'being_prepared', reason: 'Packing started' }).success).toBe(true);
  });

  it('requires payment but lets an admin update delivery directly', () => {
    const order = { paymentStatus: 'pending', payment: { status: 'awaiting_payment' }, preparation: { status: 'pending' }, delivery: { status: 'awaiting_handover' }, orderStatus: 'pending-payment' };
    expect(() => assertAdminWorkflowTransition(order, 'preparation', 'being_prepared')).toThrow(/Payment must be confirmed/);
    order.paymentStatus = 'paid'; order.payment.status = 'confirmed';
    expect(() => assertAdminWorkflowTransition(order, 'preparation', 'being_prepared')).not.toThrow();
    expect(() => assertAdminWorkflowTransition(order, 'delivery', 'processing')).not.toThrow();
  });

  it('does not allow cancellation after shipment', () => {
    expect(() => assertCancellationEligibility({ paymentStatus: 'paid', preparation: { status: 'prepared' }, delivery: { status: 'shipped' }, orderStatus: 'shipped' })).toThrow(/no longer be cancelled/);
    expect(() => assertCancellationEligibility({ paymentStatus: 'pending', preparation: { status: 'pending' }, delivery: { status: 'awaiting_handover' }, orderStatus: 'pending-payment' })).not.toThrow();
  });

  it('auto-completes preparation when delivery moves beyond pending', () => {
    const current = { payment: 'confirmed', prep: 'pending', delivery: 'pending', tracking: { carrier: null, tracking_id: null, tracking_url: null, handover_at: null, shipped_at: null } } as const;
    expect(nextAdminOrderStatus(current, 'delivery', 'processing')).toMatchObject({ prep: 'prepared', delivery: 'processing' });
  });

  it('rejects a preparation reset while delivery is already complete', () => {
    const current = { payment: 'confirmed', prep: 'prepared', delivery: 'delivered', tracking: { carrier: null, tracking_id: null, tracking_url: null, handover_at: null, shipped_at: null } } as const;
    const next = nextAdminOrderStatus(current, 'preparation', 'pending');
    expect(() => assertAdminStatusChange(current, next, 'preparation', 'pending')).toThrow(/Set Delivery to pending/);
  });
});
