import { connectDatabase, disconnectDatabase } from '../db.js';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';
import { ProductModel } from '../catalog/models/product.js';
import { ReviewModel } from '../review/model.js';

async function seedReviewStrip() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  await connectDatabase(config.mongodbUri, logger);
  try {
    const activeProducts = await ProductModel.find({ status: 'active' }).select('_id').lean();
    await ReviewModel.updateMany({}, { $set: { isStrip: false } });
    const reviews = await ReviewModel.find({ status: 'published', productId: { $in: activeProducts.map((product) => product._id) } }).sort({ createdAt: -1 }).limit(3).select('_id title').lean();
    for (const review of reviews) await ReviewModel.updateOne({ _id: review._id }, { $set: { isStrip: true } });
    logger.info({ reviews }, 'Review strip sample selection completed');
  } finally {
    await disconnectDatabase(logger);
  }
}

seedReviewStrip().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown review strip seed failure';
  process.stderr.write("Review strip seed failed: " + message + "\n");
  process.exitCode = 1;
});
