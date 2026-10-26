import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);

export const profileUpdateSchema = z.object({
  name: text(120).optional(),
  phone: z.string().trim().min(3).max(40).nullable().optional(),
}).strict();

export const addressSchema = z.object({
  recipientName: text(120),
  phone: z.string().trim().min(3).max(40),
  addressLine1: text(200),
  addressLine2: z.string().trim().max(200).default(''),
  city: text(100),
  region: text(100),
  postalCode: text(30),
  country: text(100),
  isDefault: z.boolean().default(false),
}).strict();

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
