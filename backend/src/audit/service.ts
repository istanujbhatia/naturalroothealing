import { AuditLogModel } from './model.js';

const SENSITIVE_KEY = /password|token|cookie|secret|hash|authorization|payment/i;

export type AuditInput = {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  requestId: string;
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
};

export async function recordAudit(input: AuditInput): Promise<void> {
  await AuditLogModel.create({
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    requestId: input.requestId,
    ...(input.changes ? { changes: sanitizeAuditChanges(input.changes) } : {}),
  });
}

export function sanitizeAuditChanges(changes: AuditInput['changes']) {
  return {
    ...(changes?.before ? { before: sanitizeObject(changes.before) } : {}),
    ...(changes?.after ? { after: sanitizeObject(changes.after) } : {}),
  };
}

function sanitizeObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    SENSITIVE_KEY.test(key)
      ? '[REDACTED]'
      : entry && typeof entry === 'object' && !Array.isArray(entry)
        ? sanitizeObject(entry as Record<string, unknown>)
        : entry,
  ]));
}
