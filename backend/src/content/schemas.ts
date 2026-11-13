import { z } from 'zod';

const section = z.object({ kind: z.enum(['paragraph', 'heading', 'quote']), text: z.string().trim().min(1).max(5000) });
export const articleSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), type: z.string().trim().min(1).max(60), title: z.string().trim().min(1).max(180), excerpt: z.string().trim().min(1).max(300), image: z.string().trim().min(1).max(500), publishedAt: z.coerce.date(), readMinutes: z.coerce.number().int().min(1).max(60), lead: z.string().trim().min(1).max(2000), sections: z.array(section).max(50), status: z.enum(['draft', 'published', 'archived']),
});
