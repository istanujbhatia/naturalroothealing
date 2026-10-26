import { z } from 'zod';

export const productQuantitySchema = z.object({
  productId: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(1).max(99),
}).strict();

export const addCartItemSchema = productQuantitySchema;
export const updateCartItemSchema = z.object({ quantity: z.number().int().min(0).max(99) }).strict();
export const mergeCartSchema = z.object({ items: z.array(productQuantitySchema).max(100) }).strict();

export type ProductQuantity = z.infer<typeof productQuantitySchema>;
