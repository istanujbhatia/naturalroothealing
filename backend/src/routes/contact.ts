import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth, requireCsrf } from '../auth/request.js';
import { validateBody } from '../validation.js';
import { contactMessageSchema } from '../contact/schemas.js';
import { ContactMessageModel } from '../contact/model.js';

export function createContactRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAuth(config));

  router.post('/', requireCsrf, validateBody(contactMessageSchema), async (req, res, next) => {
    try {
      const message = await ContactMessageModel.create({ ...req.body, userId: req.auth!.userId });
      res.status(201).json({ data: { message: safeMessage(message) } });
    } catch (error) { next(error); }
  });

  return router;
}

function safeMessage(message: any) {
  return { id: String(message._id), name: message.name, email: message.email, topic: message.topic, message: message.message, createdAt: message.createdAt };
}
