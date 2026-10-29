import { Router } from 'express';
import { Types } from 'mongoose';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../config.js';
import { AppError } from '../errors.js';
import { requireAdmin, requireCsrf } from '../auth/request.js';
import { validateBody } from '../validation.js';
import { recordAudit } from '../audit/service.js';
import { ProductModel } from '../catalog/models/product.js';
import { CategoryModel } from '../catalog/models/category.js';
import { InventoryModel } from '../catalog/models/inventory.js';
import { calculateFinalPriceMinor } from '../catalog/price.js';
import { adjustInventory } from '../catalog/inventory-service.js';
import { parsePagination } from '../catalog/query.js';
import { categorySchema, categoryUpdateSchema, imageUploadSchema, inventoryAdjustmentSchema, productSchema, productUpdateSchema, siteImageUpdateSchema } from '../catalog/schemas.js';
import { slugifyProductName } from '../catalog/slug.js';
import { StoreSettingsModel } from '../catalog/models/store-settings.js';
import { resolvedSiteImages } from '../catalog/site-images.js';

export function createAdminCatalogRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAdmin(config));

  router.get('/products', async (req, res, next) => {
    try {
      const { page, limit } = parsePagination(req.query.page, req.query.limit, 100);
      const search = String(req.query.search ?? '').trim();
      const status = ['draft', 'active', 'archived'].includes(String(req.query.status)) ? String(req.query.status) : undefined;
      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      if (search) filter.$or = [{ name: { $regex: escapeRegex(search), $options: 'i' } }, { slug: { $regex: escapeRegex(search), $options: 'i' } }];
      const [products, total] = await Promise.all([
        ProductModel.find(filter).populate('category', 'name slug').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        ProductModel.countDocuments(filter),
      ]);
      const inventory = await InventoryModel.find({ productId: { $in: products.map((product) => product._id) } }).lean();
      const inventoryByProduct = new Map(inventory.map((item) => [String(item.productId), item]));
      res.json({ data: { products: products.map((product) => toAdminProduct(product, inventoryByProduct.get(String(product._id)))), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
    } catch (error) { next(error); }
  });

  router.post('/assets/upload', requireCsrf, validateBody(imageUploadSchema), async (req, res, next) => {
    try {
      const mimeType = req.body.mimeType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
      const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[mimeType];
      const buffer = Buffer.from(req.body.data.split(',')[1], 'base64');
      if (buffer.byteLength > 5 * 1024 * 1024 || !isSupportedImage(buffer, mimeType)) throw new AppError(400, 'INVALID_IMAGE_FILE', 'Upload a valid PNG, JPEG, WebP, or GIF image up to 5 MB');
      const root = path.resolve(process.cwd(), config.assetUploadDir || '../frontend/public/assets');
      await mkdir(root, { recursive: true });
      const stem = path.parse(req.body.filename).name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product-image';
      const filename = `${stem}-${randomUUID().slice(0, 8)}.${extension}`;
      await writeFile(path.join(root, filename), buffer, { flag: 'wx' });
      const assetPath = `/assets/${filename}`;
      await recordAudit({ actorUserId: req.auth!.userId, action: 'asset.uploaded', entityType: 'ProductAsset', entityId: filename, requestId: String(req.id), changes: { after: { path: assetPath, mimeType, size: buffer.byteLength } } });
      res.status(201).json({ data: { asset: { path: assetPath, filename, mimeType, size: buffer.byteLength } } });
    } catch (error) { next(error); }
  });

  router.get('/assets', async (_req, res, next) => {
    try {
      const root = path.resolve(process.cwd(), config.assetUploadDir || '../frontend/public/assets');
      let entries;
      try { entries = await readdir(root, { withFileTypes: true }); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') { res.json({ data: { assets: [] } }); return; } throw error; }
      const assets = (await Promise.all(entries.filter((entry) => entry.isFile() && /\.(png|jpe?g|webp|gif)$/i.test(entry.name)).map(async (entry) => ({ filename: entry.name, path: `/assets/${entry.name}`, size: (await stat(path.join(root, entry.name))).size })))).sort((first, second) => first.filename.localeCompare(second.filename));
      res.json({ data: { assets } });
    } catch (error) { next(error); }
  });

  router.get('/site-images', async (_req, res, next) => {
    try {
      const settings = await StoreSettingsModel.findOne({ key: 'default' }).lean();
      res.json({ data: { images: resolvedSiteImages(settings?.siteImages || []) } });
    } catch (error) { next(error); }
  });

  router.patch('/site-images', requireCsrf, validateBody(siteImageUpdateSchema), async (req, res, next) => {
    try {
      const current = await StoreSettingsModel.findOne({ key: 'default' }).lean();
      const before = resolvedSiteImages(current?.siteImages || []);
      const nextImages = before.map((image) => image.key === req.body.key ? { key: image.key, reference: req.body.reference } : { key: image.key, reference: image.reference });
      const updated = await StoreSettingsModel.findOneAndUpdate(
        { key: 'default' },
        { $set: { siteImages: nextImages }, $setOnInsert: { storeName: 'Natural Root Healing', catalogCurrency: 'USD', shippingMinor: 0, taxRatePercentage: 0 } },
        { new: true, upsert: true, runValidators: true },
      ).lean();
      await recordAudit({ actorUserId: req.auth!.userId, action: 'site_image.updated', entityType: 'StoreSettings', entityId: 'default', requestId: String(req.id), changes: { before: { key: req.body.key, reference: before.find((image) => image.key === req.body.key)?.reference }, after: { key: req.body.key, reference: req.body.reference } } });
      res.json({ data: { images: resolvedSiteImages(updated?.siteImages || []) } });
    } catch (error) { next(error); }
  });

  router.post('/products', requireCsrf, validateBody(productSchema), async (req, res, next) => {
    try {
      const input = req.body;
      const category = await requireCategory(input.categoryId, input.status === 'active');
      const product = await ProductModel.create({ ...input, slug: await uniqueProductSlug(input.name), category: category._id });
      const hydrated = await ProductModel.findById(product._id).populate('category', 'name slug').lean();
      const safe = toAdminProduct(hydrated);
      await recordAudit({ actorUserId: req.auth!.userId, action: 'product.created', entityType: 'Product', entityId: String(product._id), requestId: String(req.id), changes: { after: { name: product.name, slug: product.slug, status: product.status, categoryId: String(category._id), listPriceMinor: product.listPriceMinor, discount: product.discount } } });
      res.status(201).json({ data: { product: safe } });
    } catch (error) { next(normalizeDuplicateError(error)); }
  });

  router.patch('/products/:productId', requireCsrf, validateBody(productUpdateSchema), async (req, res, next) => {
    try {
      const existing = await requireProduct(String(req.params.productId ?? ''));
      const input = req.body;
      const category = input.categoryId ? await requireCategory(input.categoryId, input.status === 'active' || (input.status === undefined && existing.status === 'active')) : null;
      const update = { ...input, ...(category ? { category: category._id } : {}) };
      if (update.status === 'active' && !category) await requireCategory(String(existing.category), true);
      const updated = await ProductModel.findByIdAndUpdate(existing._id, { $set: update }, { new: true, runValidators: true }).populate('category', 'name slug').lean();
      if (!updated) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
      const safe = toAdminProduct(updated);
      await recordAudit({ actorUserId: req.auth!.userId, action: 'product.updated', entityType: 'Product', entityId: String(existing._id), requestId: String(req.id), changes: { before: { name: existing.name, slug: existing.slug, status: existing.status, listPriceMinor: existing.listPriceMinor, discount: existing.discount }, after: { name: updated.name, slug: updated.slug, status: updated.status, listPriceMinor: updated.listPriceMinor, discount: updated.discount } } });
      res.json({ data: { product: safe } });
    } catch (error) { next(normalizeDuplicateError(error)); }
  });

  router.get('/categories', async (_req, res, next) => {
    try { res.json({ data: { categories: await CategoryModel.find().sort({ sortOrder: 1, name: 1 }).lean() } }); } catch (error) { next(error); }
  });

  router.post('/categories', requireCsrf, validateBody(categorySchema), async (req, res, next) => {
    try {
      const category = await CategoryModel.create({ ...req.body, slug: await uniqueCategorySlug(req.body.name) });
      await recordAudit({ actorUserId: req.auth!.userId, action: 'category.created', entityType: 'Category', entityId: String(category._id), requestId: String(req.id), changes: { after: { name: category.name, slug: category.slug, status: category.status, sortOrder: category.sortOrder } } });
      res.status(201).json({ data: { category: category.toObject() } });
    } catch (error) { next(normalizeDuplicateError(error)); }
  });

  router.patch('/categories/:categoryId', requireCsrf, validateBody(categoryUpdateSchema), async (req, res, next) => {
    try {
      const category = await requireCategoryById(String(req.params.categoryId ?? ''));
      const update = { ...req.body };
      if (update.name) update.slug = await uniqueCategorySlug(update.name, category._id);
      else delete update.slug;
      const updated = await CategoryModel.findByIdAndUpdate(category._id, { $set: update }, { new: true, runValidators: true }).lean();
      await recordAudit({ actorUserId: req.auth!.userId, action: 'category.updated', entityType: 'Category', entityId: String(category._id), requestId: String(req.id), changes: { before: { name: category.name, slug: category.slug, status: category.status, sortOrder: category.sortOrder }, after: { name: updated!.name, slug: updated!.slug, status: updated!.status, sortOrder: updated!.sortOrder } } });
      res.json({ data: { category: updated } });
    } catch (error) { next(normalizeDuplicateError(error)); }
  });

  router.get('/inventory', async (_req, res, next) => {
    try {
      const products = await ProductModel.find().select('name slug status').sort({ name: 1 }).lean();
      const inventory = await InventoryModel.find({ productId: { $in: products.map((product) => product._id) } }).lean();
      const byProduct = new Map(inventory.map((item) => [String(item.productId), item]));
      res.json({ data: { inventory: products.map((product) => inventoryView(product, byProduct.get(String(product._id)))) } });
    } catch (error) { next(error); }
  });

  router.patch('/inventory/:productId/adjust', requireCsrf, validateBody(inventoryAdjustmentSchema), async (req, res, next) => {
    try {
      const product = await requireProduct(String(req.params.productId ?? ''));
      const input = req.body;
      const updated = await adjustInventory(product._id, input, {
        ensure: async (productId) => { await InventoryModel.findOneAndUpdate({ productId }, { $setOnInsert: { onHand: 0, reserved: 0, lowStockThreshold: 5 } }, { upsert: true, new: true }); },
        adjust: (productId, adjustment) => InventoryModel.findOneAndUpdate(
          { productId, $expr: { $gte: [{ $add: ['$onHand', adjustment.delta] }, '$reserved'] } },
          { $inc: { onHand: adjustment.delta }, ...(adjustment.lowStockThreshold === undefined ? {} : { $set: { lowStockThreshold: adjustment.lowStockThreshold } }) },
          { new: true },
        ).lean() as unknown as Promise<any>,
      });
      await recordAudit({ actorUserId: req.auth!.userId, action: 'inventory.adjusted', entityType: 'Inventory', entityId: String(updated._id), requestId: String(req.id), changes: { after: { productId: String(product._id), delta: input.delta, reason: input.reason, onHand: updated.onHand, reserved: updated.reserved, available: updated.onHand - updated.reserved, lowStockThreshold: updated.lowStockThreshold } } });
      res.json({ data: { inventory: inventoryView(product, updated) } });
    } catch (error) { next(error); }
  });

  return router;
}

async function requireProduct(identifier: string) {
  if (!Types.ObjectId.isValid(identifier)) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  const product = await ProductModel.findById(identifier).lean();
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  return product;
}

async function requireCategory(identifier: string, mustBeActive: boolean) {
  if (!Types.ObjectId.isValid(identifier)) throw new AppError(400, 'INVALID_CATEGORY_ID', 'Category identifier is invalid');
  const category = await CategoryModel.findById(identifier).lean();
  if (!category || (mustBeActive && category.status !== 'active')) throw new AppError(409, 'CATEGORY_UNAVAILABLE', 'Category is unavailable');
  return category;
}

async function requireCategoryById(identifier: string) {
  if (!Types.ObjectId.isValid(identifier)) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
  const category = await CategoryModel.findById(identifier).lean();
  if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
  return category;
}

function toAdminProduct(product: any, inventory?: any) {
  return { id: String(product._id), name: product.name, slug: product.slug, description: product.description, details: product.details, ingredients: product.ingredients, size: product.size, category: product.category ? { id: String(product.category._id), name: product.category.name, slug: product.category.slug } : { id: String(product.category), name: '', slug: '' }, images: product.images, currency: product.currency, listPriceMinor: product.listPriceMinor, discount: product.discount, finalPriceMinor: calculateFinalPriceMinor(product.listPriceMinor, product.discount), status: product.status, inventory: inventory ? { onHand: inventory.onHand, reserved: inventory.reserved, available: inventory.onHand - inventory.reserved, lowStockThreshold: inventory.lowStockThreshold, lowStock: inventory.onHand - inventory.reserved <= inventory.lowStockThreshold } : null, createdAt: product.createdAt, updatedAt: product.updatedAt };
}

function inventoryView(product: any, inventory?: any) {
  return { productId: String(product._id), slug: product.slug, name: product.name, status: product.status, onHand: inventory?.onHand ?? 0, reserved: inventory?.reserved ?? 0, available: inventory ? inventory.onHand - inventory.reserved : 0, lowStockThreshold: inventory?.lowStockThreshold ?? 5, lowStock: inventory ? inventory.onHand - inventory.reserved <= inventory.lowStockThreshold : true };
}

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function uniqueProductSlug(name: string): Promise<string> {
  const base = slugifyProductName(name);
  let candidate = base;
  let suffix = 2;
  while (await ProductModel.exists({ slug: candidate })) candidate = `${base}-${suffix++}`;
  return candidate;
}
async function uniqueCategorySlug(name: string, currentId?: unknown): Promise<string> {
  const base = slugifyProductName(name);
  let candidate = base;
  let suffix = 2;
  while (await CategoryModel.exists({ slug: candidate, ...(currentId ? { _id: { $ne: currentId } } : {}) })) candidate = `${base}-${suffix++}`;
  return candidate;
}
function normalizeDuplicateError(error: unknown): unknown { return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000 ? new AppError(409, 'DUPLICATE_CATALOG_VALUE', 'A catalog value already exists') : error; }
function isSupportedImage(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === 'image/gif') return buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a';
  return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
}
