import { describe, expect, it } from 'vitest';
import { ProductModel } from './models/product.js';
import { CategoryModel } from './models/category.js';
import { calculateFinalPriceMinor } from './price.js';
import { seedCatalog } from './seed-service.js';

describe('catalog price rules', () => {
  it('calculates percentage discounts using integer minor units', () => {
    expect(calculateFinalPriceMinor(22111, { type: 'percentage', value: 10 })).toBe(19900);
    expect(calculateFinalPriceMinor(24875, { type: 'percentage', value: 20 })).toBe(19900);
  });

  it('rejects invalid discounts and negative prices', () => {
    expect(() => calculateFinalPriceMinor(-1, { type: 'percentage', value: 10 })).toThrow();
    expect(() => calculateFinalPriceMinor(1000, { type: 'percentage', value: 101 })).toThrow();
    expect(() => calculateFinalPriceMinor(1000, { type: 'percentage', value: 10.5 })).toThrow();
  });
});

describe('catalog schemas', () => {
  it('defines unique slug indexes for products and categories', () => {
    expect(ProductModel.schema.indexes()).toContainEqual([{ slug: 1 }, { unique: true, background: true }]);
    expect(CategoryModel.schema.indexes()).toContainEqual([{ slug: 1 }, { unique: true, background: true }]);
  });

  it('rejects malformed images and invalid slugs', async () => {
    const category = new CategoryModel({
      name: 'Daily vitality',
      slug: 'daily-vitality',
      sortOrder: 0,
    });
    const product = new ProductModel({
      name: 'Example',
      slug: 'not a slug',
      description: 'Description',
      details: 'Details',
      ingredients: 'Label',
      size: '60 capsules',
      category: category._id,
      images: [{ reference: 'javascript:bad', altText: '' }],
      currency: 'USD',
      listPriceMinor: -1,
      discount: { type: 'percentage', value: 10 },
      status: 'active',
    });
    await expect(product.validate()).rejects.toThrow();
  });
});

describe('catalog seeding', () => {
  it('rejects an invalid category reference and is idempotent on rerun', async () => {
    const categories = new Map<string, { _id: string; slug: string }>();
    const products = new Map<string, Record<string, unknown>>();
    const settings = new Map<string, Record<string, unknown>>();
    const categoryRepository = {
      findOne: ({ slug }: { slug: string }) => ({ lean: async () => categories.get(slug) ?? null }),
      create: async (document: Record<string, unknown>) => {
        const record = { ...document, _id: `${String(document.slug)}-id` } as { _id: string; slug: string };
        categories.set(record.slug, record);
        return record;
      },
    };
    const productRepository = {
      findOne: ({ slug }: { slug: string }) => ({ lean: async () => products.get(slug) ?? null }),
      create: async (document: Record<string, unknown>) => {
        products.set(String(document.slug), document);
        return document;
      },
    };
    const settingsRepository = {
      findOne: ({ key }: { key: string }) => ({ lean: async () => settings.get(key) ?? null }),
      create: async (document: Record<string, unknown>) => {
        settings.set(String(document.key), document);
        return document;
      },
    };
    const categoriesSeed = [{ name: 'Daily vitality', slug: 'daily-vitality', status: 'active', sortOrder: 0 }];
    const productsSeed = [{
      name: 'Testo Boost Capsules',
      slug: 'testo-boost-capsules',
      description: 'Description',
      details: 'Details',
      ingredients: 'Label',
      size: '60 capsules',
      categorySlug: 'daily-vitality',
      images: [{ reference: '/assets/testo-boost-capsules.jpg', altText: 'Product' }],
      currency: 'USD',
      listPriceMinor: 22111,
      discount: { type: 'percentage' as const, value: 10 },
      expectedFinalPriceMinor: 19900,
      status: 'active',
    }];

    const first = await seedCatalog(categoriesSeed, productsSeed, categoryRepository, productRepository, settingsRepository);
    const second = await seedCatalog(categoriesSeed, productsSeed, categoryRepository, productRepository, settingsRepository);

    expect(first).toMatchObject({ categoriesCreated: 1, productsCreated: 1, settingsCreated: 1 });
    expect(second).toMatchObject({ categoriesExisting: 1, productsExisting: 1, settingsCreated: 0 });
    expect(products.size).toBe(1);
    await expect(seedCatalog(
      [],
      [{ ...productsSeed[0], categorySlug: 'missing' }],
      categoryRepository,
      productRepository,
      settingsRepository,
    )).rejects.toThrow('Seed category not found');
  });
});
