import { describe, expect, it } from 'vitest';
import { ContactMessageModel } from './model.js';
import { contactMessageSchema } from './schemas.js';

describe('contact messages', () => {
  it('accepts the supported topics and validates message content', async () => {
    const input = contactMessageSchema.parse({ name: 'Tanuj Bhatia', email: 'tanuj@example.com', topic: 'order_support', message: 'Please help with my order.' });
    const message = new ContactMessageModel({ ...input, userId: '6adf679f72f2b58b861c40d5' });
    await expect(message.validate()).resolves.toBeUndefined();
  });

  it('rejects unsupported topics', () => {
    expect(() => contactMessageSchema.parse({ name: 'Tanuj', email: 'tanuj@example.com', topic: 'sales', message: 'Hello' })).toThrow();
  });
});
