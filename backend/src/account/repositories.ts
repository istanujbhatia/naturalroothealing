import { AddressModel } from './models/address.js';
import type { AddressRecord, AddressRepository } from './service.js';

export const addressRepository: AddressRepository = {
  async find(query, sort) {
    return AddressModel.find(query).sort(sort as Record<string, 1 | -1> ?? {}).lean() as unknown as Promise<AddressRecord[]>;
  },
  async findOne(query) {
    return AddressModel.findOne(query).lean() as unknown as Promise<AddressRecord | null>;
  },
  async create(document) {
    return AddressModel.create(document) as unknown as Promise<AddressRecord>;
  },
  updateOne(query, update) {
    return AddressModel.updateOne(query, update).exec();
  },
  async findOneAndUpdate(query, update) {
    return AddressModel.findOneAndUpdate(query, update, { new: true }).lean() as unknown as Promise<AddressRecord | null>;
  },
  deleteOne(query) {
    return AddressModel.deleteOne(query).exec();
  },
};
