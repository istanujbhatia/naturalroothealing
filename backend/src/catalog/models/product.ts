import { Schema, model, type InferSchemaType } from 'mongoose';
import { calculateFinalPriceMinor } from '../price.js';

const imageSchema = new Schema({
  reference: {
    type: String,
    required: true,
    trim: true,
    match: /^(\/assets\/|https:\/\/)[^\s]+$/,
  },
  altText: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 240,
  },
}, { _id: false });

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 200,
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    unique: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2000,
  },
  details: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 3000,
  },
  ingredients: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 3000,
  },
  size: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 120,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },
  images: {
    type: [imageSchema],
    required: true,
    validate: {
      validator: (images: unknown[]) => images.length > 0,
      message: 'at least one product image is required',
    },
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['USD'],
  },
  listPriceMinor: {
    type: Number,
    required: true,
    min: 100,
    validate: {
      validator: Number.isSafeInteger,
      message: 'listPriceMinor must be a non-negative integer',
    },
  },
  discount: {
    type: {
      type: String,
      enum: ['percentage'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      validate: {
        validator: Number.isInteger,
        message: 'percentage discount must be an integer from 0 to 100',
      },
    },
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    required: true,
    default: 'draft',
    index: true,
  },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

productSchema.virtual('finalPriceMinor').get(function () {
  if (!this.discount) {
    throw new Error('discount is required to calculate final price');
  }
  return calculateFinalPriceMinor(this.listPriceMinor, this.discount);
});

productSchema.index({ status: 1, category: 1 });
productSchema.index({ name: 'text', description: 'text' });

export type Product = InferSchemaType<typeof productSchema>;
export const ProductModel = model('Product', productSchema);
