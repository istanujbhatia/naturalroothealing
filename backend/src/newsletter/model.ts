import { Schema, model, type InferSchemaType } from 'mongoose';

const newsletterSubscriberSchema = new Schema({
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true, index: true },
}, { timestamps: true, versionKey: false });

newsletterSubscriberSchema.index({ createdAt: -1 });

export type NewsletterSubscriber = InferSchemaType<typeof newsletterSubscriberSchema>;
export const NewsletterSubscriberModel = model('NewsletterSubscriber', newsletterSubscriberSchema);
