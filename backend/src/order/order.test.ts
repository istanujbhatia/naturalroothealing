import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { assertOrderStatusTransition, createOrder } from './service.js';

const userId = new Types.ObjectId().toString();
const addressId = new Types.ObjectId();
const productId = new Types.ObjectId();

function repositories() {
  let cart: { items: { productId: Types.ObjectId; quantity: number }[] } | null = { items: [{ productId, quantity: 2 }] };
  const existingAddress = {
    _id: addressId,
    recipientName: 'Tanuj Bhatia', phone: '+1 555 0100', addressLine1: '1 Root Lane', addressLine2: '', city: 'Austin', region: 'Texas', postalCode: '78701', country: 'US',
  };
  const product = {
    _id: productId, slug: 'testo-boost-capsules', name: 'Testo Boost Capsules', currency: 'USD', listPriceMinor: 22111, discount: { type: 'percentage' as const, value: 10 },
  };
  const orders: Record<string, unknown>[] = [];
  const orderRepository = {
    findOne: async (query: Record<string, unknown>) => orders.find((order) => order.userId === query.userId && order.idempotencyKey === query.idempotencyKey) || null,
    create: async (document: Record<string, unknown>) => { orders.push(document); return document; },
    findByUser: async () => orders,
  };
  const carts = { findOne: async () => cart, deleteOne: async () => { cart = null; } };
  const products = { findByIds: async () => [product] };
  const addresses = { findOne: async (query: Record<string, unknown>) => query.userId === userId ? existingAddress : null };
  const settings = { findOne: async () => ({ catalogCurrency: 'USD', shippingMinor: 0, taxRatePercentage: 0 }) };
  return { orderRepository, carts, products, addresses, settings, orders, existingAddress };
}

describe('order creation', () => {
  it('recalculates totals, snapshots the address, and clears the cart', async () => {
    const repos = repositories();
    const order = await createOrder(userId, addressId.toString(), 'checkout-1', repos.orderRepository, repos.carts, repos.products, repos.addresses, repos.settings);

    expect(order).toMatchObject({ currency: 'USD', subtotalMinor: 39800, shippingMinor: 0, taxMinor: 0, totalMinor: 39800, orderStatus: 'processing', paymentStatus: 'pending', payment: { status: 'awaiting_payment' }, preparation: { status: 'pending' }, delivery: { status: 'awaiting_handover' } });
    expect(order.statusHistory).toHaveLength(4);
    expect(order.items).toEqual([{ productId, slug: 'testo-boost-capsules', name: 'Testo Boost Capsules', quantity: 2, unitPriceMinor: 19900, lineTotalMinor: 39800 }]);
    expect(order.shippingAddress).toMatchObject({ recipientName: repos.existingAddress.recipientName, addressLine1: repos.existingAddress.addressLine1, country: repos.existingAddress.country });
    await expect(repos.carts.findOne()).resolves.toBeNull();
  });

  it('returns the existing order for a repeated idempotency key', async () => {
    const repos = repositories();
    const first = await createOrder(userId, addressId.toString(), 'checkout-2', repos.orderRepository, repos.carts, repos.products, repos.addresses, repos.settings);
    const second = await createOrder(userId, addressId.toString(), 'checkout-2', repos.orderRepository, repos.carts, repos.products, repos.addresses, repos.settings);

    expect(second).toBe(first);
    expect(repos.orders).toHaveLength(1);
  });

  it('rejects a foreign address before creating an order', async () => {
    const repos = repositories();
    await expect(createOrder('another-user', addressId.toString(), 'checkout-3', repos.orderRepository, repos.carts, repos.products, repos.addresses, repos.settings))
      .rejects.toMatchObject({ code: 'ADDRESS_NOT_FOUND' });
    expect(repos.orders).toHaveLength(0);
  });
});

describe('order status transitions', () => {
  it('allows the documented forward flow and rejects invalid jumps', () => {
    expect(() => assertOrderStatusTransition('pending-payment', 'confirmed')).not.toThrow();
    expect(() => assertOrderStatusTransition('pending-payment', 'delivered')).toThrowError(/not allowed/);
  });
});
