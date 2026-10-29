import { z } from 'zod';

export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().email().max(254),
});
