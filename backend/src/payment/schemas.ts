import { z } from 'zod';

export const paymentStartSchema = z.object({ orderId: z.string().trim().min(1).max(100) }).strict();
export const paymentVerifySchema = z.object({
  orderId: z.string().trim().min(1).max(100),
  razorpayOrderId: z.string().trim().min(1).max(100),
  razorpayPaymentId: z.string().trim().min(1).max(100),
  razorpaySignature: z.string().trim().min(1).max(200),
}).strict();
