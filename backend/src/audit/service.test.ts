import { describe, expect, it } from 'vitest';
import { sanitizeAuditChanges } from './service.js';

describe('audit logging', () => {
  it('redacts secrets from before and after changes', () => {
    expect(sanitizeAuditChanges({
      before: { status: 'active', passwordHash: 'hash', nested: { token: 'secret' } },
      after: { status: 'suspended', paymentSecret: 'secret' },
    })).toEqual({
      before: { status: 'active', passwordHash: '[REDACTED]', nested: { token: '[REDACTED]' } },
      after: { status: 'suspended', paymentSecret: '[REDACTED]' },
    });
  });
});
