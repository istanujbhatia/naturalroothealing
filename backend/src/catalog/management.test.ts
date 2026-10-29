import { describe, expect, it } from 'vitest';
import { InventoryModel } from './models/inventory.js';
import { categorySchema, inventoryAdjustmentSchema, productSchema, productUpdateSchema } from './schemas.js';
import { adjustInventory, type InventoryRecord } from './inventory-service.js';
import { parsePagination } from './query.js';
import { slugifyProductName } from './slug.js';

describe('catalog management validation', () => {
  it('rejects negative prices, invalid discounts, and unapproved image references', () => {
    const result = productSchema.safeParse({
      name: 'Example', slug: 'example-product', description: 'Description', details: 'Details', ingredients: 'Label', size: '60 capsules', categoryId: 'category-id',
      images: [{ reference: 'javascript:bad', altText: '' }], currency: 'USD', listPriceMinor: -1, discount: { type: 'percentage', value: 101 }, status: 'active',
    });
    expect(result.success).toBe(false);
    expect(productSchema.safeParse({
      name: 'Too cheap', slug: 'too-cheap', description: 'Description', details: 'Details', ingredients: 'Label', size: '1 pack', categoryId: 'category-id',
      images: [{ reference: '/assets/product.jpg', altText: 'Too cheap' }], currency: 'USD', listPriceMinor: 99, discount: { type: 'percentage', value: 0 }, status: 'draft',
    }).success).toBe(false);
  });

  it('requires a reason and non-zero integer for inventory adjustments', () => {
    expect(inventoryAdjustmentSchema.safeParse({ delta: 0, reason: '' }).success).toBe(false);
    expect(inventoryAdjustmentSchema.safeParse({ delta: -2, reason: 'Damaged stock' }).success).toBe(true);
  });

  it('accepts only slug-safe categories and non-negative sort order', () => {
    expect(categorySchema.safeParse({ name: 'Daily vitality', slug: 'daily-vitality', sortOrder: 0 }).success).toBe(true);
    expect(categorySchema.safeParse({ name: 'Bad', slug: 'not valid', sortOrder: -1 }).success).toBe(false);
  });

  it('generates URL-safe product slugs from names', () => {
    expect(slugifyProductName('Dr. Sébi Herbal Kit')).toBe('dr-sebi-herbal-kit');
    expect(slugifyProductName('!!!')).toBe('product');
  });

  it('allows an admin to override a generated product slug when editing', () => {
    expect(productUpdateSchema.safeParse({ slug: 'seasonal-herbal-kit' }).success).toBe(true);
  });

  it('normalizes pagination boundaries', () => {
    expect(parsePagination('0', '999', 100)).toEqual({ page: 1, limit: 100 });
    expect(parsePagination('3', '10', 50)).toEqual({ page: 3, limit: 10 });
    expect(parsePagination(['bad'], ['bad'], 50)).toEqual({ page: 1, limit: 20 });
  });

  it('keeps one inventory document per product with non-negative counters', async () => {
    expect(InventoryModel.schema.indexes()).toContainEqual([{ productId: 1 }, { unique: true, background: true }]);
    const inventory = new InventoryModel({ onHand: -1, reserved: 0, lowStockThreshold: 5 });
    await expect(inventory.validate()).rejects.toThrow();
  });

  it('serializes concurrent adjustments and never crosses below available stock', async () => {
    let stock = 3;
    let queue = Promise.resolve();
    const record = (): InventoryRecord => ({
      _id: { toString: () => 'inventory-1' }, productId: { toString: () => 'product-1' }, onHand: stock, reserved: 0, lowStockThreshold: 1,
    });
    const repository = {
      ensure: async () => undefined,
      adjust: async (_productId: unknown, input: { delta: number }) => {
        let result: InventoryRecord | null = null;
        queue = queue.then(async () => {
          if (stock + input.delta >= 0) { stock += input.delta; result = record(); }
        });
        await queue;
        return result;
      },
    };
    const results = await Promise.all([
      adjustInventory('product-1', { delta: -2, reason: 'Sale' }, repository),
      adjustInventory('product-1', { delta: -2, reason: 'Sale' }, repository),
    ].map((operation) => operation.catch(() => null)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(stock).toBe(1);
  });
});
