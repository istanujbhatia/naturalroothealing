import { Schema, model, type InferSchemaType } from 'mongoose';

const paymentSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['razorpay'], required: true },
  mode: { type: String, enum: ['test'], required: true },
  providerOrderId: { type: String, trim: true, index: true, sparse: true },
  providerPaymentId: { type: String, trim: true, index: true, sparse: true },
  amountMinor: { type: Number, required: true, min: 1 },
  currency: { type: String, required: true, uppercase: true, maxlength: 3 },
  status: { type: String, enum: ['created', 'pending', 'authorized', 'captured', 'failed', 'expired', 'refunded'], required: true, index: true },
  signatureVerified: { type: Boolean, default: false },
  idempotencyKey: { type: String, required: true, maxlength: 200 },
  webhookEventIds: { type: [String], default: [] },
  safeMetadata: { type: Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, required: true, index: true },
  initiationClaimedAt: { type: Date },
  paidAt: { type: Date },
}, { timestamps: true, versionKey: false });

paymentSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
paymentSchema.index({ provider: 1, providerPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ provider: 1, providerOrderId: 1 }, { unique: true, sparse: true });

export type Payment = InferSchemaType<typeof paymentSchema>;
export const PaymentModel = model('Payment', paymentSchema);
