import { z } from 'zod';

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  topic: z.enum(['product_question', 'order_support', 'something_else']),
  message: z.string().trim().min(1).max(4000),
});
