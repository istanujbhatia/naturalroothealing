import { describe, expect, it } from 'vitest';
import { PaymentModel } from './model.js';

describe('Payment indexes', () => {
  it('does not enforce provider uniqueness until provider IDs exist', () => {
    const indexes = PaymentModel.schema.indexes();
    expect(indexes.find(([keys]) => JSON.stringify(keys) === JSON.stringify({ provider: 1, providerPaymentId: 1 }))).toEqual([
      { provider: 1, providerPaymentId: 1 },
      expect.objectContaining({ unique: true, partialFilterExpression: { providerPaymentId: { $exists: true } } }),
    ]);
    expect(indexes.find(([keys]) => JSON.stringify(keys) === JSON.stringify({ provider: 1, providerOrderId: 1 }))).toEqual([
      { provider: 1, providerOrderId: 1 },
      expect.objectContaining({ unique: true, partialFilterExpression: { providerOrderId: { $exists: true } } }),
    ]);
  });
});
