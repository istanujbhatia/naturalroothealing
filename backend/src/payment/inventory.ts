import { InventoryModel } from '../catalog/models/inventory.js';
import { AppError } from '../errors.js';
import type { ClientSession } from 'mongoose';

type Line = { productId: unknown; quantity: number };

export async function reserveInventory(lines: Line[]): Promise<void> {
  const reserved: Line[] = [];
  try {
    for (const line of lines) {
      const updated = await InventoryModel.findOneAndUpdate(
        { productId: line.productId, $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, line.quantity] } },
        { $inc: { reserved: line.quantity } },
        { new: true },
      ).lean();
      if (!updated) throw new AppError(409, 'INSUFFICIENT_INVENTORY', 'One or more products do not have enough available stock');
      reserved.push(line);
    }
  } catch (error) {
    await releaseInventory(reserved);
    throw error;
  }
}

export async function releaseInventory(lines: Line[]): Promise<void> {
  for (const line of lines) {
    await InventoryModel.updateOne({ productId: line.productId, reserved: { $gte: line.quantity } }, { $inc: { reserved: -line.quantity } }).exec();
  }
}

export async function settleInventory(lines: Line[], action: 'release' | 'consume', session: ClientSession): Promise<void> {
  for (const line of lines) {
    const filter = action === 'consume'
      ? { productId: line.productId, onHand: { $gte: line.quantity }, reserved: { $gte: line.quantity } }
      : { productId: line.productId, reserved: { $gte: line.quantity } };
    const update = action === 'consume'
      ? { $inc: { onHand: -line.quantity, reserved: -line.quantity } }
      : { $inc: { reserved: -line.quantity } };
    const result = await InventoryModel.updateOne(filter, update, { session }).exec();
    if (result.modifiedCount !== 1) throw new AppError(409, 'INVENTORY_SETTLEMENT_FAILED', 'Inventory could not be settled safely');
  }
}
