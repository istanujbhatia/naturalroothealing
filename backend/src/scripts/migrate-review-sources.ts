import { connectDatabase, disconnectDatabase } from '../db.js';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';
import { ReviewModel } from '../review/model.js';

async function migrateReviewSources() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  await connectDatabase(config.mongodbUri, logger);
  try {
    const legacyResult = await ReviewModel.updateMany({ source: 'admin_demo' }, { $set: { source: 'customer_customer' } });
    const adminCreatedResult = await ReviewModel.updateMany({ source: 'customer', userId: { $exists: false } }, { $set: { source: 'customer_customer' } });
    logger.info({ legacyModifiedCount: legacyResult.modifiedCount, adminCreatedModifiedCount: adminCreatedResult.modifiedCount }, 'Review source migration completed');
  } finally {
    await disconnectDatabase(logger);
  }
}

migrateReviewSources().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown review source migration failure';
  process.stderr.write(`Review source migration failed: ${message}\n`);
  process.exitCode = 1;
});
