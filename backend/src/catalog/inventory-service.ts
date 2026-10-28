import { AppError } from '../errors.js';

export type InventoryAdjustment = {
  delta: number;
  reason: string;
  lowStockThreshold?: number;
};

export type InventoryRecord = {
  _id: { toString(): string };
  productId: { toString(): string };
  onHand: number;
  reserved: number;
  lowStockThreshold: number;
};

export type InventoryRepository = {
  ensure(productId: unknown): Promise<void>;
  adjust(productId: unknown, input: InventoryAdjustment): Promise<InventoryRecord | null>;
};

export async function adjustInventory(productId: unknown, input: InventoryAdjustment, repository: InventoryRepository): Promise<InventoryRecord> {
  await repository.ensure(productId);
  const updated = await repository.adjust(productId, input);
  if (!updated) throw new AppError(409, 'INSUFFICIENT_INVENTORY', 'Inventory adjustment would create negative available stock');
  return updated;
}
