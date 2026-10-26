import { describe, expect, it } from 'vitest';
import { addressSchema } from './schemas.js';

const address = {
  recipientName: 'Tanuj Bhatia',
  phone: '123',
  addressLine1: '1 Root Lane',
  addressLine2: '',
  city: 'Austin',
  region: 'Texas',
  postalCode: '78701',
  country: 'US',
  isDefault: false,
};

describe('address request schema', () => {
  it('rejects phone numbers shorter than the database constraint', () => {
    const result = addressSchema.safeParse({ ...address, phone: 'qw' });

    expect(result.success).toBe(false);
  });
});
