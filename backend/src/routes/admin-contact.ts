import { Router } from 'express';
import { Types } from 'mongoose';
import type { AppConfig } from '../config.js';
import { requireAdmin, requireCsrf } from '../auth/request.js';
import { AppError } from '../errors.js';
import { ContactMessageModel } from '../contact/model.js';
import { recordAudit } from '../audit/service.js';
import { parsePagination } from '../catalog/query.js';
import { NewsletterSubscriberModel } from '../newsletter/model.js';

export function createAdminContactRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAdmin(config));

  router.get('/', async (req, res, next) => {
    try {
      const { page, limit } = parsePagination(req.query.page, req.query.limit, 50);
      const search = String(req.query.search ?? '').trim();
      const filter = search ? { $or: [{ name: { $regex: escapeRegex(search), $options: 'i' } }, { email: { $regex: escapeRegex(search), $options: 'i' } }, { message: { $regex: escapeRegex(search), $options: 'i' } }] } : {};
      const [messages, total] = await Promise.all([
        ContactMessageModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        ContactMessageModel.countDocuments(filter),
      ]);
      res.json({ data: { messages: messages.map(safeMessage), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
    } catch (error) { next(error); }
  });

  router.get('/newsletter', async (req, res, next) => {
    try {
      const { page, limit } = parsePagination(req.query.page, req.query.limit, 10);
      const search = String(req.query.search ?? '').trim();
      const filter = search ? { email: { $regex: escapeRegex(search), $options: 'i' } } : {};
      const [subscribers, total] = await Promise.all([
        NewsletterSubscriberModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        NewsletterSubscriberModel.countDocuments(filter),
      ]);
      res.json({ data: { subscribers: subscribers.map((subscriber) => ({ id: String(subscriber._id), email: subscriber.email, createdAt: subscriber.createdAt })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
    } catch (error) { next(error); }
  });

  router.delete('/newsletter/:subscriberId', requireCsrf, async (req, res, next) => {
    try {
      const subscriberId = String(req.params.subscriberId ?? '');
      if (!Types.ObjectId.isValid(subscriberId)) throw new AppError(400, 'INVALID_NEWSLETTER_SUBSCRIBER_ID', 'Subscriber identifier is invalid');
      const subscriber = await NewsletterSubscriberModel.findByIdAndDelete(subscriberId).lean();
      if (!subscriber) throw new AppError(404, 'NEWSLETTER_SUBSCRIBER_NOT_FOUND', 'Subscriber not found');
      await recordAudit({ actorUserId: req.auth!.userId, action: 'newsletter_subscriber.deleted', entityType: 'NewsletterSubscriber', entityId: String(subscriber._id), requestId: String(req.id), changes: { before: { email: subscriber.email } } });
      res.status(204).send();
    } catch (error) { next(error); }
  });

  router.delete('/:messageId', requireCsrf, async (req, res, next) => {
    try {
      const messageId = String(req.params.messageId ?? '');
      if (!Types.ObjectId.isValid(messageId)) throw new AppError(400, 'INVALID_CONTACT_MESSAGE_ID', 'Contact message identifier is invalid');
      const message = await ContactMessageModel.findById(messageId).lean();
      if (!message) throw new AppError(404, 'CONTACT_MESSAGE_NOT_FOUND', 'Contact message not found');
      await ContactMessageModel.deleteOne({ _id: message._id });
      await recordAudit({ actorUserId: req.auth!.userId, action: 'contact_message.deleted', entityType: 'ContactMessage', entityId: String(message._id), requestId: String(req.id), changes: { before: { name: message.name, email: message.email, topic: message.topic } } });
      res.status(204).send();
    } catch (error) { next(error); }
  });

  return router;
}

function safeMessage(message: any) { return { id: String(message._id), name: message.name, email: message.email, topic: message.topic, message: message.message, createdAt: message.createdAt }; }
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
