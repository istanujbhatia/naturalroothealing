import { Types } from 'mongoose';
import { calculateFinalPriceMinor } from '../catalog/price.js';
import { canonicalOrderStatus, defaultOrderStatus } from './status.js';
import { AppError } from '../errors.js';

type CartItem = { productId: { toString(): string }; quantity: number };
export type Product = { _id: { toString(): string }; slug: string; name: string; currency: string; listPriceMinor: number; discount: { type: 'percentage'; value: number } };
type Address = { _id: { toString(): string }; recipientName: string; phone: string; addressLine1: string; addressLine2?: string | null; city: string; region: string; postalCode: string; country: string };
export type OrderRecord = { orderNumber: string; userId: unknown; idempotencyKey: string; items: unknown[]; totalMinor: number; [key: string]: unknown };

export type OrderRepository = {
  findOne(query: Record<string, unknown>): Promise<OrderRecord | null>;
  create(document: Record<string, unknown>): Promise<OrderRecord>;
  findByUser(userId: string): Promise<OrderRecord[]>;
};
export type OrderCartRepository = { findOne(query: Record<string, unknown>): Promise<{ items: CartItem[] } | null>; deleteOne(query: Record<string, unknown>): Promise<unknown> };
export type OrderInventoryRepository = { reserve(lines: CartItem[]): Promise<void>; release(lines: CartItem[]): Promise<void> };
export type OrderProductRepository = { findByIds(ids: unknown[]): Promise<Product[]> };
export type OrderAddressRepository = { findOne(query: Record<string, unknown>): Promise<Address | null> };
export type StoreSettingsRepository = { findOne(query: Record<string, unknown>): Promise<{ catalogCurrency: string; shippingMinor?: number; taxRatePercentage?: number } | null> };

const allowedOrderStatusTransitions: Record<string, string[]> = {
  'pending-payment': ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function assertOrderStatusTransition(current: string, next: string): void {
  if (!allowedOrderStatusTransitions[current]?.includes(next)) throw new AppError(409, 'INVALID_ORDER_STATUS_TRANSITION', 'Order status transition is not allowed');
}

export function toSafeOrder(order: OrderRecord) {
  const { userId: _userId, idempotencyKey: _idempotencyKey, ...safeOrder } = order;
  return { ...safeOrder, order_status: canonicalOrderStatus(order), id: String(order._id || '') };
}

export async function createOrder(userId: string, addressId: string, idempotencyKey: string, orders: OrderRepository, carts: OrderCartRepository, products: OrderProductRepository, addresses: OrderAddressRepository, settings: StoreSettingsRepository, inventory?: OrderInventoryRepository, reservationTtlMinutes = 30): Promise<OrderRecord> {
  if (!Types.ObjectId.isValid(addressId)) throw new AppError(400, 'INVALID_ADDRESS_ID', 'Address identifier is invalid');
  const existing = await orders.findOne({ userId, idempotencyKey });
  if (existing) return existing;
  const [cart, address, store] = await Promise.all([
    carts.findOne({ userId }),
    addresses.findOne({ _id: addressId, userId }),
    settings.findOne({ key: 'default' }),
  ]);
  if (!cart || cart.items.length === 0) throw new AppError(409, 'CART_EMPTY', 'Your cart is empty');
  if (!address) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  if (!store || store.catalogCurrency !== 'USD') throw new AppError(503, 'STORE_NOT_CONFIGURED', 'Store pricing is not configured');
  const catalogProducts = await products.findByIds(cart.items.map((item) => item.productId));
  const byId = new Map(catalogProducts.map((product) => [product._id.toString(), product]));
  if (byId.size !== cart.items.length) throw new AppError(409, 'CART_REQUIRES_REFRESH', 'One or more cart products are unavailable');
  let subtotalMinor = 0;
  const items = cart.items.map((item) => {
    const product = byId.get(item.productId.toString())!;
    if (product.currency !== store.catalogCurrency) throw new AppError(409, 'CURRENCY_MISMATCH', 'Cart currency does not match store currency');
    const unitPriceMinor = calculateFinalPriceMinor(product.listPriceMinor, product.discount);
    const lineTotalMinor = unitPriceMinor * item.quantity;
    subtotalMinor += lineTotalMinor;
    return { productId: product._id, slug: product.slug, name: product.name, quantity: item.quantity, unitPriceMinor, lineTotalMinor };
  });
  const shippingMinor = store.shippingMinor ?? 0;
  const taxMinor = Math.round(subtotalMinor * ((store.taxRatePercentage ?? 0) / 100));
  const totalMinor = subtotalMinor + shippingMinor + taxMinor;
  if (store.catalogCurrency === 'USD' && totalMinor < 100) {
    throw new AppError(409, 'ORDER_TOTAL_TOO_LOW_FOR_PAYMENT', 'The order total must be at least $1.00 for online payment');
  }
  if (inventory) await inventory.reserve(cart.items);
  const expiresAt = new Date(Date.now() + reservationTtlMinutes * 60 * 1000);
  let order: OrderRecord;
  try {
    order = await orders.create({
    orderNumber: `NRH-${Date.now().toString(36).toUpperCase()}-${new Types.ObjectId().toString().slice(-6).toUpperCase()}`,
    userId,
    idempotencyKey,
    items,
    currency: store.catalogCurrency,
    subtotalMinor,
    discountMinor: items.reduce((total, item) => total + (byId.get(item.productId.toString())!.listPriceMinor * item.quantity) - item.lineTotalMinor, 0),
    shippingMinor,
    taxMinor,
    totalMinor,
    shippingAddress: {
      recipientName: address.recipientName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? '',
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
    },
    orderStatus: 'pending-payment',
    paymentStatus: 'pending',
    fulfillmentStatus: 'unfulfilled',
    payment: { status: 'awaiting_payment' },
    preparation: { status: 'pending' },
    delivery: { status: 'awaiting_handover' },
    order_status: defaultOrderStatus(),
    stockReservation: { status: 'reserved', reservedAt: new Date(), expiresAt },
    statusHistory: [
      { phase: 'order', status: 'pending-payment', changedAt: new Date(), changedBy: 'system', reason: 'Order created' },
      { phase: 'payment', status: 'awaiting_payment', changedAt: new Date(), changedBy: 'system', reason: 'Awaiting trusted payment verification' },
      { phase: 'preparation', status: 'pending', changedAt: new Date(), changedBy: 'system' },
      { phase: 'delivery', status: 'awaiting_handover', changedAt: new Date(), changedBy: 'system' },
    ],
    });
  } catch (error) {
    if (inventory) await inventory.release(cart.items);
    throw error;
  }
  await carts.deleteOne({ userId });
  return order;
}

export async function listCustomerOrders(userId: string, orders: OrderRepository): Promise<OrderRecord[]> {
  return orders.findByUser(userId);
}

export async function getCustomerOrder(userId: string, orderId: string, orders: OrderRepository): Promise<OrderRecord> {
  if (!Types.ObjectId.isValid(orderId)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  const order = await orders.findOne({ _id: orderId, userId });
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  return order;
}
