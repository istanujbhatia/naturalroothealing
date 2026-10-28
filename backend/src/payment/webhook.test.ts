import { describe, expect, it } from 'vitest';
import { getWebhookPaymentId, isFullRefundForPayment } from './service.js';

describe('Razorpay webhook associations', () => {
  const payment = { providerPaymentId: 'pay_test_123', amountMinor: 9900, currency: 'USD' };

  it('uses refund.payment_id instead of the refund id', () => {
    expect(getWebhookPaymentId('refund.processed', { id: 'rfnd_test_1', payment_id: 'pay_test_123' })).toBe('pay_test_123');
    expect(getWebhookPaymentId('payment.captured', { id: 'pay_test_123' })).toBe('pay_test_123');
  });

  it('accepts only a complete refund matching the stored payment', () => {
    expect(isFullRefundForPayment({ payment_id: 'pay_test_123', amount: 9900, currency: 'USD' }, payment)).toBe(true);
    expect(isFullRefundForPayment({ payment_id: 'pay_other', amount: 9900, currency: 'USD' }, payment)).toBe(false);
    expect(isFullRefundForPayment({ payment_id: 'pay_test_123', amount: 100, currency: 'USD' }, payment)).toBe(false);
  });
});
