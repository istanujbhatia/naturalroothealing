import { describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
import { createAddress, deleteAddress, listAddresses, setDefaultAddress, updateAddress } from './service.js';
import type { AddressInput } from './schemas.js';

const input = (isDefault = false): AddressInput => ({
  recipientName: 'Tanuj Bhatia',
  phone: '+1 555 0100',
  addressLine1: '1 Root Lane',
  addressLine2: '',
  city: 'Austin',
  region: 'Texas',
  postalCode: '78701',
  country: 'United States',
  isDefault,
});

function repository() {
  type StoredAddress = AddressInput & {
    _id: { toString(): string };
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  const records = new Map<string, StoredAddress>();
  let nextId = 1;
  const find = async (query: Record<string, unknown>, sort?: Record<string, number>) => {
    let values = [...records.values()].filter((record) =>
      Object.entries(query).every(([key, value]) =>
        key === '_id' ? record._id.toString() === String(value) : String(record[key]) === String(value)));
    if (sort?.createdAt) values = values.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return values;
  };
  return {
    records,
    find,
    findOne: async (query: Record<string, unknown>) => (await find(query))[0] ?? null,
    create: async (document: Record<string, unknown>) => {
      const now = new Date();
      const id = String(nextId++);
      const record: StoredAddress = {
        ...document,
        _id: { toString: () => id },
        createdAt: now,
        updatedAt: now,
      } as StoredAddress;
      records.set(record._id.toString(), record);
      return record;
    },
    updateOne: async (query: Record<string, unknown>, update: Record<string, unknown>) => {
      for (const record of await find(query)) Object.assign(record, (update.$set ?? {}), { updatedAt: new Date() });
    },
    findOneAndUpdate: async (query: Record<string, unknown>, update: Record<string, unknown>) => {
      const record = (await find(query))[0];
      if (!record) return null;
      Object.assign(record, (update.$set ?? {}), { updatedAt: new Date() });
      return record;
    },
    deleteOne: async (query: Record<string, unknown>) => {
      const record = (await find(query))[0];
      if (!record) return { deletedCount: 0 };
      records.delete(record._id.toString());
      return { deletedCount: 1 };
    },
  };
}

describe('customer addresses', () => {
  it('creates a first default, manages defaults, and promotes after deletion', async () => {
    const repo = repository();
    const first = await createAddress('user-a', input(), repo);
    const second = await createAddress('user-a', input(), repo);
    expect(first.isDefault).toBe(true);
    expect(second.isDefault).toBe(false);
    const selected = await setDefaultAddress('user-a', second.id, repo);
    expect(selected.isDefault).toBe(true);
    await deleteAddress('user-a', second.id, repo);
    const remaining = await listAddresses('user-a', repo);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].isDefault).toBe(true);
  });

  it('blocks cross-user reads and mutations', async () => {
    const repo = repository();
    const address = await createAddress('user-a', input(), repo);
    await expect(updateAddress('user-b', address.id, input(true), repo))
      .rejects.toMatchObject({ code: 'ADDRESS_NOT_FOUND' });
    await expect(deleteAddress('user-b', address.id, repo))
      .rejects.toMatchObject({ code: 'ADDRESS_NOT_FOUND' });
    expect(await listAddresses('user-b', repo)).toEqual([]);
  });

  it('rejects invalid address identifiers through the service contract', async () => {
    const repo = repository();
    await expect(setDefaultAddress('user-a', 'missing', repo))
      .rejects.toBeInstanceOf(AppError);
  });
});
