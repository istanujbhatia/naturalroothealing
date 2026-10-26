import { Schema, model, type InferSchemaType } from 'mongoose';

const cartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, max: 99, validate: Number.isInteger },
}, { _id: false });

const cartSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  items: { type: [cartItemSchema], default: [] },
}, { timestamps: true, versionKey: false });

export type Cart = InferSchemaType<typeof cartSchema>;
export const CartModel = model('Cart', cartSchema);
