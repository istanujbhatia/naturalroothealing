import { Schema, model, type InferSchemaType } from 'mongoose';

const contactMessageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  topic: { type: String, required: true, enum: ['product_question', 'order_support', 'something_else'] },
  message: { type: String, required: true, trim: true, minlength: 1, maxlength: 4000 },
}, { timestamps: true, versionKey: false });

contactMessageSchema.index({ createdAt: -1 });

export type ContactMessage = InferSchemaType<typeof contactMessageSchema>;
export const ContactMessageModel = model('ContactMessage', contactMessageSchema);
