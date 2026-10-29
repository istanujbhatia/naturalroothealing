import { loadConfig } from '../config.js';
import { connectDatabase, disconnectDatabase } from '../db.js';
import { createLogger } from '../logger.js';
import { PaymentModel } from '../payment/model.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);

async function migrate() {
  await connectDatabase(config.mongodbUri, logger);
  const collection = PaymentModel.collection;

  for (const name of ['provider_1_providerPaymentId_1', 'provider_1_providerOrderId_1']) {
    const exists = (await collection.indexes()).some((index) => index.name === name);
    if (exists) await collection.dropIndex(name);
  }

  await collection.createIndex({ provider: 1, providerPaymentId: 1 }, {
    name: 'provider_1_providerPaymentId_1',
    unique: true,
    partialFilterExpression: { providerPaymentId: { $exists: true } },
  });
  await collection.createIndex({ provider: 1, providerOrderId: 1 }, {
    name: 'provider_1_providerOrderId_1',
    unique: true,
    partialFilterExpression: { providerOrderId: { $exists: true } },
  });
  logger.info('Payment provider indexes migrated');
}

migrate().catch((error: unknown) => {
  logger.error({ err: error }, 'Payment index migration failed');
  process.exitCode = 1;
}).finally(async () => {
  await disconnectDatabase(logger);
});
