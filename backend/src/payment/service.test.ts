import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyRazorpaySignature } from './service.js';

describe('Razorpay payment verification helpers', () => {
  it('accepts only the signature for the exact provider order and payment pair', () => {
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';
    const secret = 'test-secret';
    const signature = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    expect(verifyRazorpaySignature(orderId, paymentId, signature, secret)).toBe(true);
    expect(verifyRazorpaySignature(orderId, 'pay_other', signature, secret)).toBe(false);
    expect(verifyRazorpaySignature(orderId, paymentId, `${signature}0`, secret)).toBe(false);
  });
});
