import { AppError } from '../errors.js';
import { toSafeAddress, type SafeAddress } from './safe-address.js';
import type { AddressInput } from './schemas.js';

export type AddressRecord = AddressInput & {
  _id: { toString(): string };
  userId: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

export type AddressRepository = {
  find(query: Record<string, unknown>, sort?: Record<string, number>): Promise<AddressRecord[]>;
  findOne(query: Record<string, unknown>): Promise<AddressRecord | null>;
  create(document: Record<string, unknown>): Promise<AddressRecord>;
  updateOne(query: Record<string, unknown>, update: Record<string, unknown>): Promise<unknown>;
  findOneAndUpdate(query: Record<string, unknown>, update: Record<string, unknown>): Promise<AddressRecord | null>;
  deleteOne(query: Record<string, unknown>): Promise<{ deletedCount: number }>;
};

export async function listAddresses(userId: string, addresses: AddressRepository): Promise<SafeAddress[]> {
  const records = await addresses.find({ userId }, { createdAt: 1 });
  return records.map(toSafeAddress);
}

export async function createAddress(
  userId: string,
  input: AddressInput,
  addresses: AddressRepository,
): Promise<SafeAddress> {
  const hasAddress = Boolean(await addresses.findOne({ userId }));
  const isDefault = input.isDefault || !hasAddress;
  if (isDefault) await addresses.updateOne({ userId, isDefault: true }, { $set: { isDefault: false } });
  const created = await addresses.create({ ...input, userId, isDefault });
  return toSafeAddress(created);
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: AddressInput,
  addresses: AddressRepository,
): Promise<SafeAddress> {
  const existing = await addresses.findOne({ _id: addressId, userId });
  if (!existing) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  if (input.isDefault) await addresses.updateOne({ userId, isDefault: true }, { $set: { isDefault: false } });
  const updated = await addresses.findOneAndUpdate(
    { _id: addressId, userId },
    { $set: { ...input, isDefault: input.isDefault } },
  );
  if (!updated) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  return toSafeAddress(updated);
}

export async function deleteAddress(
  userId: string,
  addressId: string,
  addresses: AddressRepository,
): Promise<void> {
  const existing = await addresses.findOne({ _id: addressId, userId });
  if (!existing) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  const result = await addresses.deleteOne({ _id: addressId, userId });
  if (result.deletedCount !== 1) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  if (existing.isDefault) {
    const next = await addresses.find({ userId }, { createdAt: 1 });
    if (next[0]) await addresses.updateOne({ _id: next[0]._id, userId }, { $set: { isDefault: true } });
  }
}

export async function setDefaultAddress(
  userId: string,
  addressId: string,
  addresses: AddressRepository,
): Promise<SafeAddress> {
  const existing = await addresses.findOne({ _id: addressId, userId });
  if (!existing) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  await addresses.updateOne({ userId, isDefault: true }, { $set: { isDefault: false } });
  const updated = await addresses.findOneAndUpdate(
    { _id: addressId, userId },
    { $set: { isDefault: true } },
  );
  if (!updated) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  return toSafeAddress(updated);
}
