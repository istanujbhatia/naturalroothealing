import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { validateBody } from '../validation.js';
import { newsletterSubscribeSchema } from '../newsletter/schemas.js';
import { NewsletterSubscriberModel } from '../newsletter/model.js';

export function createNewsletterRouter(_config: AppConfig): Router {
  const router = Router();

  router.post('/', validateBody(newsletterSubscribeSchema), async (req, res, next) => {
    try {
      const email = String(req.body.email).trim().toLowerCase();
      await NewsletterSubscriberModel.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
      res.status(200).json({ data: { subscribed: true } });
    } catch (error) { next(error); }
  });

  return router;
}
