import { connectDatabase, disconnectDatabase } from '../db.js';
import { loadConfig } from '../config.js';
import { createLogger } from '../logger.js';
import { ProductModel } from '../catalog/models/product.js';
import { ReviewModel } from '../review/model.js';

const samples: [string, string, string, number][] = [
  ['Asha Rao', 'A considered addition', 'The routine feels simple and easy to keep consistent.', 5],
  ['Nikhil Mehta', 'Fits my daily rhythm', 'A thoughtful product that has become part of my everyday ritual.', 5],
  ['Mira Shah', 'A lovely ritual', 'The presentation is beautiful and the experience feels intentional.', 5],
  ['Dev Kapoor', 'Easy to keep up with', 'It fits naturally into my routine and the product information is clear.', 4],
  ['Sana Iyer', 'Thoughtfully made', 'A well-presented product with a pleasant daily experience.', 5],
];

async function seedDemoReviews() {
  const config = loadConfig(); const logger = createLogger(config.logLevel); await connectDatabase(config.mongodbUri, logger);
  try {
    const products = await ProductModel.find({ status: 'active' }).select('_id name').sort({ createdAt: 1 }).lean();
    let created = 0;
    for (const [productIndex, product] of products.entries()) {
      const existingCount = await ReviewModel.countDocuments({ productId: product._id, source: 'customer_customer', userId: { $exists: false } });
      for (let reviewIndex = existingCount; reviewIndex < 5; reviewIndex += 1) {
        const [authorName, title, body, rating = 5] = samples[(productIndex + reviewIndex) % samples.length] ?? samples[0]!;
        await ReviewModel.create({ productId: product._id, authorName, source: 'customer_customer', rating, title, body, status: 'published', isFeatured: true });
        created += 1;
      }
    }
    logger.info({ products: products.length, created }, 'Demo review seed completed');
  } finally { await disconnectDatabase(logger); }
}

seedDemoReviews().catch((error: unknown) => { const message = error instanceof Error ? error.message : 'Unknown demo review seed failure'; process.stderr.write(`Demo review seed failed: ${message}\n`); process.exitCode = 1; });
