import { describe, expect, it } from 'vitest';
import { canonicalOrderStatus, defaultOrderStatus } from './status.js';

describe('canonical order status', () => {
  it('creates the required new-order defaults', () => {
    expect(defaultOrderStatus()).toEqual({
      payment: 'awaiting_payment', prep: 'pending', delivery: 'pending',
      tracking: { carrier: null, tracking_id: null, tracking_url: null, handover_at: null, shipped_at: null },
    });
  });

  it('prefers detailed payment state and preserves tracking evidence', () => {
    const shippedAt = new Date('2026-10-27T10:00:00.000Z');
    expect(canonicalOrderStatus({ payment: { status: 'confirmed' }, paymentStatus: 'pending', preparation: { status: 'prepared' }, delivery: { status: 'shipped', trackingId: 'DHL-1', shippedAt } })).toMatchObject({
      payment: 'confirmed', prep: 'prepared', delivery: 'processing',
      tracking: { tracking_id: 'DHL-1', shipped_at: shippedAt },
    });
  });

  it('does not infer carrier handover from fulfilledAt alone', () => {
    expect(canonicalOrderStatus({ paymentStatus: 'paid', preparation: { status: 'prepared' }, delivery: { status: 'shipped' }, fulfilledAt: new Date() })).toMatchObject({
      payment: 'confirmed', prep: 'prepared', delivery: 'pending',
      tracking: { shipped_at: null },
    });
  });

  it('recovers a persisted default placeholder when legacy fields contain real progress', () => {
    expect(canonicalOrderStatus({
      order_status: defaultOrderStatus(),
      orderStatus: 'cancelled', paymentStatus: 'paid', payment: { status: 'confirmed' },
      preparation: { status: 'being_prepared' }, cancellation: { status: 'cancelled' },
    })).toMatchObject({ payment: 'confirmed', prep: 'being_prepared' });
  });
});
