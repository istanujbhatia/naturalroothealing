import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isDuplicateKeyError, mergeRestoredCartItems, verifyRazorpaySignature } from './service.js';

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

  it('recognizes only Mongo duplicate-key errors as persistence conflicts', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(isDuplicateKeyError({ code: '11000' })).toBe(false);
    expect(isDuplicateKeyError(new Error('duplicate'))).toBe(false);
  });

  it('restores failed-payment items without overwriting the current cart', () => {
    expect(mergeRestoredCartItems([{ productId: 'product-1', quantity: 2 }], [{ productId: 'product-1', quantity: 3 }, { productId: 'product-2', quantity: 1 }]))
      .toEqual([{ productId: 'product-1', quantity: 5 }, { productId: 'product-2', quantity: 1 }]);
  });
});
