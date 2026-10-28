import { z } from 'zod';

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
});

export const reviewAdminUpdateSchema = z.object({
  isFeatured: z.boolean(),
});

export const reviewAdminCreateSchema = z.object({
  productId: z.string().regex(/^[a-f\d]{24}$/i),
  authorName: z.string().trim().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  status: z.enum(['pending', 'published', 'rejected']).default('published'),
  isFeatured: z.boolean().default(true),
});
