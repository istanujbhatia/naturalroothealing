import { CartModel } from './models/cart.js';
import { ProductModel } from '../catalog/models/product.js';
import type { ProductRecord } from './service.js';

export const cartRepository = {
  findOne(query: Record<string, unknown>) {
    return CartModel.findOne(query).lean();
  },
  async create(document: Record<string, unknown>) {
    const created = await CartModel.create(document);
    return created.toObject();
  },
  findOneAndUpdate(query: Record<string, unknown>, update: Record<string, unknown>) {
    return CartModel.findOneAndUpdate(query, update, { new: true, upsert: true }).lean();
  },
  deleteOne(query: Record<string, unknown>) {
    return CartModel.deleteOne(query).exec();
  },
};

export const productRepository = {
  async findByIdentifier(identifier: string) {
    const query = /^[a-f\d]{24}$/i.test(identifier) ? { _id: identifier, status: 'active' } : { slug: identifier, status: 'active' };
    return ProductModel.findOne(query).populate('category', 'name').lean() as unknown as Promise<ProductRecord | null>;
  },
  async findByIds(ids: unknown[]) {
    return ProductModel.find({ _id: { $in: ids }, status: 'active' }).populate('category', 'name').lean() as unknown as Promise<ProductRecord[]>;
  },
};
