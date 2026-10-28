import { loadConfig } from '../config.js';
import { connectDatabase, disconnectDatabase } from '../db.js';
import { createLogger } from '../logger.js';
import { ReviewModel } from '../review/model.js';

async function migrateReviewIndex() {
  const config = loadConfig(); const logger = createLogger(config.logLevel); await connectDatabase(config.mongodbUri, logger);
  try {
    const indexes = await ReviewModel.collection.indexes();
    if (indexes.some((index) => index.name === 'productId_1_userId_1')) await ReviewModel.collection.dropIndex('productId_1_userId_1');
    await ReviewModel.collection.createIndex({ productId: 1, userId: 1 }, { name: 'customer_review_per_product', unique: true, partialFilterExpression: { userId: { $exists: true } } });
    logger.info('Customer-review uniqueness index migrated');
  } finally { await disconnectDatabase(logger); }
}

migrateReviewIndex().catch((error: unknown) => { const message = error instanceof Error ? error.message : 'Unknown review index migration failure'; process.stderr.write(`Review index migration failed: ${message}\n`); process.exitCode = 1; });
