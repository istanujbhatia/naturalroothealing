import { calculateFinalPriceMinor, type PercentageDiscount } from './price.js';

type CategoryRecord = {
  _id: unknown;
  slug: string;
};

type CategoryRepository = {
  findOne(query: { slug: string }): { lean(): Promise<CategoryRecord | null> };
  create(document: Record<string, unknown>): Promise<CategoryRecord>;
};

type ProductRepository = {
  findOne(query: { slug: string }): { lean(): Promise<Record<string, unknown> | null> };
  create(document: Record<string, unknown>): Promise<Record<string, unknown>>;
};

type SettingsRepository = {
  findOne(query: { key: string }): { lean(): Promise<Record<string, unknown> | null> };
  create(document: Record<string, unknown>): Promise<Record<string, unknown>>;
};

export type SeedSummary = {
  categoriesCreated: number;
  categoriesExisting: number;
  productsCreated: number;
  productsExisting: number;
  settingsCreated: number;
};

export async function seedCatalog(
  categories: readonly Record<string, unknown>[],
  products: readonly (Record<string, unknown> & {
    categorySlug: string;
    expectedFinalPriceMinor: number;
    discount: PercentageDiscount;
  })[],
  categoryRepository: CategoryRepository,
  productRepository: ProductRepository,
  settingsRepository: SettingsRepository,
): Promise<SeedSummary> {
  const summary: SeedSummary = {
    categoriesCreated: 0,
    categoriesExisting: 0,
    productsCreated: 0,
    productsExisting: 0,
    settingsCreated: 0,
  };
  const categoryIds = new Map<string, unknown>();

  for (const category of categories) {
    const slug = String(category.slug);
    const existing = await categoryRepository.findOne({ slug }).lean();
    const record = existing ?? await categoryRepository.create(category);
    categoryIds.set(slug, record._id);
    if (existing) summary.categoriesExisting += 1;
    else summary.categoriesCreated += 1;
  }

  for (const product of products) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Seed category not found: ${product.categorySlug}`);
    }

    const finalPriceMinor = calculateFinalPriceMinor(
      Number(product.listPriceMinor),
      product.discount,
    );
    if (finalPriceMinor !== product.expectedFinalPriceMinor) {
      throw new Error(`Seed price mismatch for product: ${String(product.slug)}`);
    }

    const { categorySlug: _categorySlug, expectedFinalPriceMinor: _expected, ...document } = product;
    const existing = await productRepository.findOne({ slug: String(product.slug) }).lean();
    if (existing) {
      summary.productsExisting += 1;
      continue;
    }
    await productRepository.create({ ...document, category: categoryId });
    summary.productsCreated += 1;
  }

  const settings = await settingsRepository.findOne({ key: 'default' }).lean();
  if (!settings) {
    await settingsRepository.create({
      key: 'default',
      storeName: 'Natural Root Healing',
      catalogCurrency: 'USD',
      shippingMinor: 0,
      taxRatePercentage: 0,
    });
    summary.settingsCreated = 1;
  }

  return summary;
}
