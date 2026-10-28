export type CanonicalPaymentStatus = 'awaiting_payment' | 'confirmed' | 'failed' | 'refunded';
export type CanonicalPrepStatus = 'pending' | 'being_prepared' | 'prepared';
export type CanonicalDeliveryStatus = 'pending' | 'processing' | 'delivered';

export type CanonicalOrderStatus = {
  payment: CanonicalPaymentStatus;
  prep: CanonicalPrepStatus;
  delivery: CanonicalDeliveryStatus;
  tracking: { carrier: string | null; tracking_id: string | null; tracking_url: string | null; handover_at: Date | null; shipped_at: Date | null };
};

export function defaultOrderStatus(): CanonicalOrderStatus {
  return { payment: 'awaiting_payment', prep: 'pending', delivery: 'pending', tracking: { carrier: null, tracking_id: null, tracking_url: null, handover_at: null, shipped_at: null } };
}

export function canonicalOrderStatus(source: any): CanonicalOrderStatus {
  const stored = source?.order_status;
  const hasStoredStatus = stored?.payment && stored?.prep && stored?.delivery && stored?.tracking;
  const legacyPayment = source?.payment?.status || ({ pending: 'awaiting_payment', paid: 'confirmed', failed: 'failed', refunded: 'refunded' } as Record<string, string>)[source?.paymentStatus];
  const legacyDelivery = source?.delivery?.status;
  const storedDefaultConflicts = hasStoredStatus && stored.payment === 'awaiting_payment' && stored.prep === 'pending' && stored.delivery === 'pending' && (
    Boolean(source?.cancellation) || (legacyPayment && legacyPayment !== 'awaiting_payment') || source?.preparation?.status && source.preparation.status !== 'pending' || ['processing', 'shipped', 'delivered'].includes(legacyDelivery)
  );
  if (hasStoredStatus && !storedDefaultConflicts) return {
    payment: stored.payment,
    prep: stored.prep,
    delivery: stored.delivery,
    tracking: {
      carrier: stored.tracking.carrier ?? null,
      tracking_id: stored.tracking.tracking_id ?? null,
      tracking_url: stored.tracking.tracking_url ?? null,
      handover_at: stored.tracking.handover_at ?? null,
      shipped_at: stored.tracking.shipped_at ?? null,
    },
  };
  const payment = ['awaiting_payment', 'confirmed', 'failed', 'refunded'].includes(source?.payment?.status) ? source.payment.status : ({ pending: 'awaiting_payment', paid: 'confirmed', failed: 'failed', refunded: 'refunded' } as Record<string, CanonicalPaymentStatus>)[source?.paymentStatus] || 'awaiting_payment';
  const prep = ['pending', 'being_prepared', 'prepared'].includes(source?.preparation?.status) ? source.preparation.status : 'pending';
  const deliverySource = source?.delivery?.status;
  const hasHandoverEvidence = Boolean(source?.delivery?.handoverAt || source?.delivery?.trackingId || source?.trackingId || source?.delivery?.shippedAt || source?.trackingUrl);
  const delivery = deliverySource === 'delivered' || source?.orderStatus === 'delivered' ? 'delivered' : deliverySource === 'processing' || (deliverySource === 'shipped' && hasHandoverEvidence) ? 'processing' : 'pending';
  return { payment, prep, delivery, tracking: { carrier: source?.delivery?.carrier || source?.trackingCarrier || null, tracking_id: source?.delivery?.trackingId || source?.trackingId || null, tracking_url: source?.delivery?.trackingUrl || source?.trackingUrl || null, handover_at: source?.delivery?.handoverAt || null, shipped_at: source?.delivery?.shippedAt || null } };
}

export function legacyOrderFields(status: CanonicalOrderStatus) {
  return { paymentStatus: status.payment === 'awaiting_payment' ? 'pending' : status.payment === 'confirmed' ? 'paid' : status.payment, fulfillmentStatus: status.delivery === 'delivered' ? 'delivered' : status.delivery === 'processing' ? 'processing' : 'unfulfilled', orderStatus: status.payment === 'awaiting_payment' ? 'pending-payment' : status.payment === 'failed' ? 'cancelled' : status.delivery === 'delivered' ? 'delivered' : status.delivery === 'processing' ? 'shipped' : status.prep === 'pending' ? 'confirmed' : 'processing' };
}
