import 'dotenv/config';
import mongoose from 'mongoose';
import { loadConfig } from '../config.js';
import { connectDatabase, disconnectDatabase } from '../db.js';
import { createLogger } from '../logger.js';
import { OrderModel } from '../order/models/order.js';
import { canonicalOrderStatus } from '../order/status.js';

const apply = process.argv.includes('--apply');
const config = loadConfig();
const logger = createLogger(config.logLevel);

async function run() {
  await connectDatabase(config.mongodbUri, logger);
  const orders = await OrderModel.find({}).lean();
  const report = { total: orders.length, alreadyCanonical: 0, migrated: 0, flagged: 0, skipped: 0, reasons: [] as string[] };
  for (const order of orders) {
    if (order.order_status?.payment && order.order_status?.prep && order.order_status?.delivery && order.order_status?.tracking) { report.alreadyCanonical += 1; continue; }
    const reasons: string[] = [];
    if (order.payment?.status && order.paymentStatus && ((order.payment.status === 'confirmed' && order.paymentStatus !== 'paid') || (order.payment.status === 'awaiting_payment' && order.paymentStatus === 'paid'))) reasons.push('payment fields conflict');
    if (order.delivery?.status === 'shipped' && !order.delivery?.handoverAt && !order.delivery?.trackingId && !order.trackingId && !order.delivery?.shippedAt && !order.trackingUrl) reasons.push('shipped state lacks handover evidence');
    if (order.orderStatus === 'cancelled') reasons.push('cancelled record needs cancellation reason and actor review');
    const canonical = canonicalOrderStatus(order);
    if (reasons.length) {
      report.flagged += 1;
      report.skipped += 1;
      report.reasons.push(`${String(order._id)}: ${reasons.join(', ')}`);
      continue;
    }
    if (!apply) { report.skipped += 1; continue; }
    const result = await OrderModel.updateOne({ _id: order._id, order_status: { $exists: false } }, { $set: { order_status: canonical, statusMigration: { version: 1, needsReview: false, reasons: [] } } }).exec();
    if (result.modifiedCount === 1) report.migrated += 1;
  }
  process.stdout.write(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', report }, null, 2) + '\n');
}

run().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }).finally(async () => { if (mongoose.connection.readyState) await disconnectDatabase(logger); });
