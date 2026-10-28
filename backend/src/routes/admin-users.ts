import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import type { AppConfig } from '../config.js';
import { AppError } from '../errors.js';
import { requireAdmin, requireCsrf } from '../auth/request.js';
import { UserModel } from '../auth/models/user.js';
import { AddressModel } from '../account/models/address.js';
import { CartModel } from '../cart/models/cart.js';
import { ProductModel } from '../catalog/models/product.js';
import { calculateFinalPriceMinor } from '../catalog/price.js';
import { parsePagination } from '../catalog/query.js';
import { validateBody } from '../validation.js';
import { recordAudit } from '../audit/service.js';

const adminUserUpdateSchema = z.object({ name: z.string().trim().min(1).max(120), phone: z.string().trim().max(40).nullable(), status: z.enum(['active', 'suspended']) });

export function createAdminUsersRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAdmin(config));
  router.get('/', async (req, res, next) => {
    try {
      const { page, limit } = parsePagination(req.query.page, req.query.limit, 10);
      const filter: Record<string, unknown> = { role: 'customer' };
      const search = String(req.query.search ?? '').trim();
      if (search) { const expression = { $regex: escapeRegex(search), $options: 'i' }; filter.$or = [{ name: expression }, { email: expression }, { phone: expression }]; }
      const [users, total] = await Promise.all([
        UserModel.find(filter).select('name email phone role status emailVerifiedAt createdAt updatedAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        UserModel.countDocuments(filter),
      ]);
      res.json({ data: { users: users.map(toSafeAdminUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
    } catch (error) { next(error); }
  });
  router.get('/:userId', async (req, res, next) => {
    try { res.json({ data: { user: await getUserDetails(req.params.userId) } }); } catch (error) { next(error); }
  });
  router.patch('/:userId', requireCsrf, validateBody(adminUserUpdateSchema), async (req, res, next) => {
    try {
      const userId = assertUserId(req.params.userId);
      const existing = await UserModel.findOne({ _id: userId, role: 'customer' }).select('name email phone role status emailVerifiedAt createdAt updatedAt').lean();
      if (!existing) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      const updated = await UserModel.findOneAndUpdate({ _id: userId, role: 'customer' }, { $set: req.body }, { new: true, runValidators: true }).select('name email phone role status emailVerifiedAt createdAt updatedAt').lean();
      if (!updated) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      await recordAudit({ actorUserId: req.auth!.userId, action: 'customer.updated_by_admin', entityType: 'User', entityId: userId, requestId: String(req.id), changes: { before: { name: existing.name, phone: existing.phone ?? null, status: existing.status }, after: { name: updated.name, phone: updated.phone ?? null, status: updated.status } } });
      res.json({ data: { user: toSafeAdminUser(updated) } });
    } catch (error) { next(error); }
  });
  return router;
}

async function getUserDetails(identifier: string | string[]) {
  const userId = assertUserId(identifier);
  const user = await UserModel.findOne({ _id: userId, role: 'customer' }).select('name email phone role status emailVerifiedAt createdAt updatedAt').lean();
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  const [addresses, cart] = await Promise.all([AddressModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean(), CartModel.findOne({ userId }).lean()]);
  const productIds = (cart?.items || []).map((item) => item.productId);
  const products = productIds.length ? await ProductModel.find({ _id: { $in: productIds } }).populate('category', 'name').lean() : [];
  const productsById = new Map(products.map((product) => [String(product._id), product]));
  return {
    ...toSafeAdminUser(user),
    addresses: addresses.map(({ _id, recipientName, phone, addressLine1, addressLine2, city, region, postalCode, country, isDefault, createdAt, updatedAt }) => ({ id: String(_id), recipientName, phone, addressLine1, addressLine2, city, region, postalCode, country, isDefault, createdAt, updatedAt })),
    cart: { updatedAt: cart?.updatedAt ?? null, items: (cart?.items || []).map((item) => { const product = productsById.get(String(item.productId)); const category = product?.category as any; const discount = product?.discount as unknown as { type: 'percentage'; value: number }; return { productId: String(item.productId), quantity: item.quantity, product: product ? { name: product.name, slug: product.slug, status: product.status, category: category && typeof category === 'object' ? category.name : '', currency: product.currency, listPriceMinor: product.listPriceMinor, discount, finalPriceMinor: calculateFinalPriceMinor(product.listPriceMinor, discount) } : null }; }) },
  };
}

function toSafeAdminUser(user: any) { return { id: String(user._id), name: user.name, email: user.email, phone: user.phone ?? null, role: user.role, status: user.status, emailVerified: Boolean(user.emailVerifiedAt), emailVerifiedAt: user.emailVerifiedAt ?? null, createdAt: user.createdAt, updatedAt: user.updatedAt }; }
function assertUserId(identifier: string | string[] | undefined): string { const value = String(identifier ?? ''); if (!Types.ObjectId.isValid(value)) throw new AppError(400, 'INVALID_USER_ID', 'User identifier is invalid'); return value; }
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
