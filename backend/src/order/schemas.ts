import { z } from 'zod';

export const createOrderSchema = z.object({ addressId: z.string().trim().min(1).max(100) }).strict();
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
