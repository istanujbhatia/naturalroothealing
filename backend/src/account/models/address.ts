import { Schema, model, type InferSchemaType } from 'mongoose';

const addressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recipientName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  phone: { type: String, required: true, trim: true, minlength: 3, maxlength: 40 },
  addressLine1: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  addressLine2: { type: String, trim: true, maxlength: 200, default: '' },
  city: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  region: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  postalCode: { type: String, required: true, trim: true, minlength: 1, maxlength: 30 },
  country: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  isDefault: { type: Boolean, required: true, default: false },
}, {
  timestamps: true,
  versionKey: false,
});

addressSchema.index({ userId: 1, createdAt: 1 });
addressSchema.index({ userId: 1, isDefault: 1 }, {
  unique: true,
  partialFilterExpression: { isDefault: true },
});

export type Address = InferSchemaType<typeof addressSchema>;
export const AddressModel = model('Address', addressSchema);
