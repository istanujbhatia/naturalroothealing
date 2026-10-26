import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { addCartItem, getCart, mergeCart, updateCartItem, type ProductRecord } from './service.js';

const product = (slug: string, price = 22111): ProductRecord => ({
  _id: new Types.ObjectId(),
  slug,
  name: 'Test product',
  size: '60 capsules',
  category: { name: 'Daily vitality' },
  images: [{ reference: '/assets/testo-boost-capsules.jpg' }],
  currency: 'USD',
  listPriceMinor: price,
  discount: { type: 'percentage', value: 10 },
});

function repositories(products: ProductRecord[]) {
  let cart: { userId: string; items: { productId: Types.ObjectId; quantity: number }[] } | null = null;
  const productByIdentifier = async (identifier: string) => products.find((item) => item.slug === identifier || item._id.toString() === identifier) || null;
  const carts = {
    findOne: async () => cart,
    create: async (document: Record<string, unknown>) => document as typeof cart,
    findOneAndUpdate: async (_query: Record<string, unknown>, update: Record<string, unknown>) => {
      const items = (update.$set as { items: typeof cart.items }).items;
      cart = { userId: 'user-a', items };
      return cart;
    },
    deleteOne: async () => { cart = null; },
  };
  const productRepository = {
    findByIdentifier: productByIdentifier,
    findByIds: async (ids: unknown[]) => products.filter((item) => ids.some((id) => item._id.toString() === String(id))),
  };
  return { carts, productRepository };
}

describe('persistent carts', () => {
  it('merges quantities and calculates totals from product data', async () => {
    const item = product('testo-boost-capsules');
    const repos = repositories([item]);

    await addCartItem('user-a', { productId: item.slug, quantity: 2 }, repos.carts, repos.productRepository);
    const result = await mergeCart('user-a', [{ productId: item.slug, quantity: 3 }], repos.carts, repos.productRepository);

    expect(result.items[0]).toMatchObject({ id: item.slug, quantity: 5, price: 199 });
    expect(result.subtotalMinor).toBe(99500);
  });

  it('ignores unavailable guest products during merge', async () => {
    const repos = repositories([]);
    const result = await mergeCart('user-a', [{ productId: 'archived-product', quantity: 1 }], repos.carts, repos.productRepository);

    expect(result.items).toEqual([]);
    expect(result.ignoredProductIds).toEqual(['archived-product']);
  });

  it('removes unavailable products from an existing cart response', async () => {
    const item = product('testo-boost-capsules');
    const repos = repositories([item]);
    await addCartItem('user-a', { productId: item.slug, quantity: 1 }, repos.carts, repos.productRepository);
    repos.productRepository.findByIds = async () => [];

    const result = await getCart('user-a', repos.carts, repos.productRepository);

    expect(result.items).toEqual([]);
    expect(result.removedProductIds).toEqual([item._id.toString()]);
  });

  it('keeps cart items in added order when a quantity changes', async () => {
    const first = product('first');
    const second = product('second');
    const repos = repositories([first, second]);
    await addCartItem('user-a', { productId: first.slug, quantity: 1 }, repos.carts, repos.productRepository);
    await addCartItem('user-a', { productId: second.slug, quantity: 1 }, repos.carts, repos.productRepository);

    const result = await updateCartItem('user-a', first.slug, 4, repos.carts, repos.productRepository);

    expect(result.items.map((item) => item.id)).toEqual([first.slug, second.slug]);
    expect(result.items[0].quantity).toBe(4);
  });
});
