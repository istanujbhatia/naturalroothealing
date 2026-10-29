import { z } from 'zod';

const password = z.string().min(12).max(128);
const email = z.string().trim().email().max(254);

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email,
  password,
  phone: z.preprocess((value) => value === '' ? undefined : value, z.string().trim().min(3).max(40).optional()),
}).strict();

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
