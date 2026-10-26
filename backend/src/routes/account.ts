import { Router } from 'express';
import { Types } from 'mongoose';
import type { AppConfig } from '../config.js';
import { AppError } from '../errors.js';
import { requireAuth, requireCsrf } from '../auth/request.js';
import { UserModel } from '../auth/models/user.js';
import { validateBody } from '../validation.js';
import { addressRepository } from '../account/repositories.js';
import { addressSchema, profileUpdateSchema } from '../account/schemas.js';
import { createAddress, deleteAddress, listAddresses, setDefaultAddress, updateAddress } from '../account/service.js';
import { updateCustomerProfile } from '../account/profile-service.js';
import type { ProfileRecord } from '../account/profile-service.js';

export function createAccountRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAuth(config));

  router.patch('/profile', requireCsrf, validateBody(profileUpdateSchema), async (req, res, next) => {
    try {
      const user = await updateCustomerProfile(req.auth!.userId, req.body, {
        findOneAndUpdate: async (query, update) => {
          const document = await UserModel.findOneAndUpdate(
            query,
            update,
            { new: true, runValidators: true },
          ).lean();
          if (!document) return null;
          return {
            _id: document._id,
            name: document.name,
            email: document.email,
            phone: document.phone,
            role: document.role,
            status: document.status,
            emailVerifiedAt: document.emailVerifiedAt,
            createdAt: document.createdAt,
          } as ProfileRecord;
        },
      });
      res.json({ data: { user } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/addresses', async (req, res, next) => {
    try {
      res.json({ data: { addresses: await listAddresses(req.auth!.userId, addressRepository) } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/addresses', requireCsrf, validateBody(addressSchema), async (req, res, next) => {
    try {
      const address = await createAddress(req.auth!.userId, req.body, addressRepository);
      res.status(201).json({ data: { address } });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/addresses/:addressId', requireCsrf, validateBody(addressSchema), async (req, res, next) => {
    try {
      assertObjectId(req.params.addressId);
      const address = await updateAddress(req.auth!.userId, req.params.addressId, req.body, addressRepository);
      res.json({ data: { address } });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/addresses/:addressId', requireCsrf, async (req, res, next) => {
    try {
      assertObjectId(req.params.addressId);
      await deleteAddress(req.auth!.userId, req.params.addressId, addressRepository);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/addresses/:addressId/default', requireCsrf, async (req, res, next) => {
    try {
      assertObjectId(req.params.addressId);
      const address = await setDefaultAddress(req.auth!.userId, req.params.addressId, addressRepository);
      res.json({ data: { address } });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function assertObjectId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
    throw new AppError(400, 'INVALID_ADDRESS_ID', 'Address identifier is invalid');
  }
}
