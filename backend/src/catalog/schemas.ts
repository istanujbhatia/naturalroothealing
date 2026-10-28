import { z } from 'zod';
import { SITE_IMAGE_KEYS } from './site-images.js';

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const image = z.object({
  reference: z.string().trim().regex(/^(\/assets\/|https:\/\/)[^\s]+$/),
  altText: z.string().trim().min(1).max(240),
});
export const imageUploadSchema = z.object({
  filename: z.string().trim().min(1).max(160),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  data: z.string().regex(/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/).max(8000000),
});
export const siteImageUpdateSchema = z.object({
  key: z.enum(SITE_IMAGE_KEYS as [string, ...string[]]),
  reference: z.string().trim().regex(/^(\/assets\/|https:\/\/)[^\s]+$/),
});
const discount = z.object({ type: z.literal('percentage'), value: z.number().int().min(0).max(100) });

export const productSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: slug.optional(),
  description: z.string().trim().min(1).max(2000),
  details: z.string().trim().min(1).max(3000),
  ingredients: z.string().trim().min(1).max(3000),
  size: z.string().trim().min(1).max(120),
  categoryId: z.string().trim().min(1),
  images: z.array(image).min(1).max(12),
  currency: z.literal('USD'),
  listPriceMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  discount,
  status: z.enum(['draft', 'active', 'archived']),
});

export const productUpdateSchema = productSchema.partial();
export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug,
  description: z.string().trim().max(1000).default(''),
  status: z.enum(['active', 'archived']).default('active'),
  sortOrder: z.number().int().nonnegative(),
});
export const categoryUpdateSchema = categorySchema.partial();
export const inventoryAdjustmentSchema = z.object({
  delta: z.number().int().min(-100000).max(100000).refine((value) => value !== 0, 'delta cannot be zero'),
  reason: z.string().trim().min(3).max(240),
  lowStockThreshold: z.number().int().nonnegative().max(100000).optional(),
});
