import { Schema, model, type InferSchemaType } from 'mongoose';

const reviewSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: function (this: { source?: string }) { return this.source !== 'admin_demo'; }, index: true },
  authorName: { type: String, trim: true, maxlength: 120 },
  source: { type: String, enum: ['customer', 'admin_demo'], default: 'customer', index: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isInteger } },
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  body: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending', index: true },
  isFeatured: { type: Boolean, default: false, index: true },
}, { timestamps: true, versionKey: false });

reviewSchema.index({ productId: 1, userId: 1 }, { name: 'customer_review_per_product', unique: true, partialFilterExpression: { userId: { $exists: true } } });
reviewSchema.index({ productId: 1, status: 1, isFeatured: 1 });

export type Review = InferSchemaType<typeof reviewSchema>;
export const ReviewModel = model('Review', reviewSchema);
