import { Schema, model, type InferSchemaType } from 'mongoose';

const storeSettingsSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'default',
  },
  storeName: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 160,
  },
  catalogCurrency: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['USD'],
  },
  shippingMinor: { type: Number, required: true, min: 0, default: 0 },
  taxRatePercentage: { type: Number, required: true, min: 0, max: 100, default: 0 },
}, {
  timestamps: true,
  versionKey: false,
});

export type StoreSettings = InferSchemaType<typeof storeSettingsSchema>;
export const StoreSettingsModel = model('StoreSettings', storeSettingsSchema);
