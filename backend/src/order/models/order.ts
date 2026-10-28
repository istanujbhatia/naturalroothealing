import { Schema, model, type InferSchemaType } from 'mongoose';

const shippingAddressSchema = new Schema({
  recipientName: { type: String, required: true },
  phone: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String, required: true },
  city: { type: String, required: true },
  region: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
}, { _id: false });

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
  slug: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPriceMinor: { type: Number, required: true, min: 0 },
  lineTotalMinor: { type: Number, required: true, min: 0 },
}, { _id: false });

const paymentSchema = new Schema({
  status: { type: String, enum: ['awaiting_payment', 'confirmed', 'failed', 'refunded'], required: true },
  verifiedAt: { type: Date },
  verifiedBy: { type: String, trim: true, maxlength: 120 },
}, { _id: false });

const preparationSchema = new Schema({
  status: { type: String, enum: ['pending', 'being_prepared', 'prepared'], required: true },
  preparedAt: { type: Date },
  preparedBy: { type: String, trim: true, maxlength: 120 },
}, { _id: false });

const deliverySchema = new Schema({
  status: { type: String, enum: ['awaiting_handover', 'processing', 'shipped', 'delivered'], required: true },
  carrier: { type: String, trim: true, maxlength: 50 },
  trackingId: { type: String, trim: true, maxlength: 100 },
  trackingUrl: { type: String, trim: true, maxlength: 500 },
  handoverAt: { type: Date },
  handoverBy: { type: String, trim: true, maxlength: 120 },
  shippedBy: { type: String, trim: true, maxlength: 120 },
  shippedAt: { type: Date },
}, { _id: false });

const statusHistorySchema = new Schema({
  phase: { type: String, enum: ['order', 'payment', 'preparation', 'delivery', 'cancellation'], required: true },
  status: { type: String, required: true },
  changedAt: { type: Date, required: true },
  changedBy: { type: String, required: true, maxlength: 120 },
  reason: { type: String, trim: true, maxlength: 240 },
}, { _id: false });

const canonicalTrackingSchema = new Schema({
  carrier: { type: String, trim: true, maxlength: 50, default: null },
  tracking_id: { type: String, trim: true, maxlength: 100, default: null },
  tracking_url: { type: String, trim: true, maxlength: 500, default: null },
  handover_at: { type: Date, default: null },
  shipped_at: { type: Date, default: null },
}, { _id: false });

const canonicalOrderStatusSchema = new Schema({
  payment: { type: String, enum: ['awaiting_payment', 'confirmed', 'failed', 'refunded'], required: true },
  prep: { type: String, enum: ['pending', 'being_prepared', 'prepared'], required: true },
  delivery: { type: String, enum: ['pending', 'processing', 'delivered'], required: true },
  tracking: { type: canonicalTrackingSchema, required: true },
}, { _id: false });

const cancellationSchema = new Schema({
  status: { type: String, enum: ['cancelled'], required: true },
  reason: { type: String, required: true, maxlength: 240 },
  cancelled_at: { type: Date, required: true },
  cancelled_by: { type: String, required: true, maxlength: 120 },
}, { _id: false });

const stockReservationSchema = new Schema({
  status: { type: String, enum: ['reserved', 'consumed', 'released'], required: true },
  reservedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  releasedAt: { type: Date },
}, { _id: false });

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  idempotencyKey: { type: String, required: true },
  items: { type: [orderItemSchema], required: true, validate: (items: unknown[]) => items.length > 0 },
  currency: { type: String, required: true, enum: ['USD'] },
  subtotalMinor: { type: Number, required: true, min: 0 },
  discountMinor: { type: Number, required: true, min: 0 },
  shippingMinor: { type: Number, required: true, min: 0 },
  taxMinor: { type: Number, required: true, min: 0 },
  totalMinor: { type: Number, required: true, min: 0 },
  shippingAddress: { type: shippingAddressSchema, required: true },
  orderStatus: { type: String, enum: ['pending-payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], required: true },
  fulfillmentStatus: { type: String, enum: ['unfulfilled', 'processing', 'shipped', 'delivered', 'returned'], required: true },
  payment: { type: paymentSchema },
  preparation: { type: preparationSchema },
  delivery: { type: deliverySchema },
  statusHistory: { type: [statusHistorySchema], default: [] },
  order_status: { type: canonicalOrderStatusSchema },
  cancellation: { type: cancellationSchema },
  stockReservation: { type: stockReservationSchema },
  statusMigration: { version: { type: Number }, needsReview: { type: Boolean }, reasons: { type: [String] } },
  trackingCarrier: { type: String, trim: true, maxlength: 50 },
  trackingId: { type: String, trim: true, maxlength: 100 },
  trackingUrl: { type: String, trim: true, maxlength: 500 },
  fulfilledAt: { type: Date },
}, { timestamps: true, optimisticConcurrency: true });

orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ userId: 1, createdAt: -1 });

export type Order = InferSchemaType<typeof orderSchema>;
export const OrderModel = model('Order', orderSchema);
