import { connectDatabase, disconnectDatabase } from '../db.js';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';
import { CategoryModel } from '../catalog/models/category.js';
import { ProductModel } from '../catalog/models/product.js';
import { StoreSettingsModel } from '../catalog/models/store-settings.js';
import { seedCategories, seedProducts } from '../catalog/seed-data.js';
import { seedCatalog } from '../catalog/seed-service.js';

async function seed() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  await connectDatabase(config.mongodbUri, logger);

  try {
    const summary = await seedCatalog(
      seedCategories,
      seedProducts,
      {
        findOne: (query) => CategoryModel.findOne(query),
        create: async (document) => {
          const created = await CategoryModel.create(document);
          return created.toObject();
        },
      },
      {
        findOne: (query) => ProductModel.findOne(query),
        create: async (document) => {
          const created = await ProductModel.create(document);
          return created.toObject();
        },
      },
      {
        findOne: (query) => StoreSettingsModel.findOne(query),
        create: async (document) => {
          const created = await StoreSettingsModel.create(document);
          return created.toObject();
        },
      },
    );
    logger.info({ summary }, 'Catalog seed completed');
  } finally {
    await disconnectDatabase(logger);
  }
}

seed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure';
  process.stderr.write(`Catalog seed failed: ${message}\n`);
  process.exitCode = 1;
});
