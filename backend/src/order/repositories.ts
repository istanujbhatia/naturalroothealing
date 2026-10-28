import { AddressModel } from '../account/models/address.js';
import { CartModel } from '../cart/models/cart.js';
import { ProductModel } from '../catalog/models/product.js';
import { StoreSettingsModel } from '../catalog/models/store-settings.js';
import { OrderModel } from './models/order.js';
import { reserveInventory, releaseInventory } from '../payment/inventory.js';
import type { Product } from './service.js';

export const orderRepository = {
  findOne(query: Record<string, unknown>) { return OrderModel.findOne(query).lean(); },
  async create(document: Record<string, unknown>) { return (await OrderModel.create(document)).toObject(); },
  findByUser(userId: string) { return OrderModel.find({ userId }).sort({ createdAt: -1 }).lean(); },
};

export const orderProductRepository = {
  findByIds(ids: unknown[]) { return ProductModel.find({ _id: { $in: ids }, status: 'active' }).lean() as unknown as Promise<Product[]>; },
};

export const orderCartRepository = {
  findOne(query: Record<string, unknown>) { return CartModel.findOne(query).lean(); },
  deleteOne(query: Record<string, unknown>) { return CartModel.deleteOne(query).exec(); },
};

export const orderAddressRepository = {
  findOne(query: Record<string, unknown>) { return AddressModel.findOne(query).lean(); },
};

export const settingsRepository = {
  findOne(query: Record<string, unknown>) { return StoreSettingsModel.findOne(query).lean(); },
};

export const orderInventoryRepository = { reserve: reserveInventory, release: releaseInventory };
