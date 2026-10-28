import { Schema, model, type InferSchemaType } from 'mongoose';

const auditChangeSchema = new Schema({
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
}, { _id: false });

const auditLogSchema = new Schema({
  actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, trim: true, maxlength: 120, index: true },
  entityType: { type: String, required: true, trim: true, maxlength: 80 },
  entityId: { type: String, required: true, trim: true, maxlength: 120 },
  requestId: { type: String, required: true, trim: true, maxlength: 100, index: true },
  changes: { type: auditChangeSchema },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
});

auditLogSchema.index({ createdAt: -1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel = model('AuditLog', auditLogSchema);
