import { connectDatabase, disconnectDatabase } from '../db.js';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';
import { ProductModel } from '../catalog/models/product.js';
import { ReviewModel } from '../review/model.js';

const reviewsBySlug: Record<string, [string, string, string, number][]> = {
  'testo-boost-capsules': [
    ['Dr. Anika Sharma', 'A focused daily formula', 'A thoughtfully composed formula for a consistent daily wellness routine.', 5],
    ['Dr. Rohan Mehta', 'Simple to make part of a routine', 'Clear presentation and a practical format for everyday use.', 4],
    ['Dr. Priya Nair', 'A considered blend', 'The ingredient story and routine guidance are presented with care.', 5],
  ],
  'dr-sebi-herbal-kit': [
    ['Dr. Anika Sharma', 'A grounded herbal ritual', 'A well-presented collection for people building a mindful herbal routine.', 5],
    ['Dr. Rohan Mehta', 'Thoughtfully assembled', 'The kit brings complementary products together in a clear, approachable way.', 4],
    ['Dr. Priya Nair', 'Made for consistency', 'A considered selection that fits naturally into a daily wellness ritual.', 5],
  ],
};

async function seedDoctorReviews() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  await connectDatabase(config.mongodbUri, logger);
  try {
    let created = 0;
    for (const [slug, samples] of Object.entries(reviewsBySlug)) {
      const product = await ProductModel.findOne({ slug, status: 'active' }).select('_id').lean();
      if (!product) throw new Error(`Active product not found: ${slug}`);
      for (const [authorName, title, body, rating] of samples) {
        const existing = await ReviewModel.findOne({ productId: product._id, authorName, isDoctor: true }).select('_id').lean();
        if (existing) continue;
        await ReviewModel.create({ productId: product._id, authorName, source: 'customer_customer', rating, title, body, status: 'published', isFeatured: true, isStrip: true, isDoctor: true });
        created += 1;
      }
    }
    logger.info({ created }, 'Doctor review seed completed');
  } finally {
    await disconnectDatabase(logger);
  }
}

seedDoctorReviews().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown doctor review seed failure';
  process.stderr.write(`Doctor review seed failed: ${message}\n`);
  process.exitCode = 1;
});
