import { Schema, model, type InferSchemaType } from 'mongoose';

const inventorySchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
  onHand: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger } },
  reserved: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger } },
  lowStockThreshold: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger } },
}, { timestamps: true, versionKey: false });

export type Inventory = InferSchemaType<typeof inventorySchema>;
export const InventoryModel = model('Inventory', inventorySchema);
