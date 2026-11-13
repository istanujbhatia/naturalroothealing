import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { requireAdmin, requireCsrf } from '../auth/request.js';
import { validateBody } from '../validation.js';
import { AppError } from '../errors.js';
import { ArticleModel } from '../content/model.js';
import { articleSchema } from '../content/schemas.js';
import { recordAudit } from '../audit/service.js';

export function createAdminArticlesRouter(config: AppConfig): Router {
  const router = Router(); router.use(requireAdmin(config));
  router.get('/', async (_req, res, next) => { try { res.json({ data: { articles: await ArticleModel.find().sort({ updatedAt: -1 }).lean() } }); } catch (error) { next(error); } });
  router.post('/', requireCsrf, validateBody(articleSchema), async (req, res, next) => { try { const article = await ArticleModel.create(req.body); await recordAudit({ actorUserId: req.auth!.userId, action: 'article.created', entityType: 'Article', entityId: String(article._id), requestId: String(req.id), changes: { after: { slug: article.slug, status: article.status } } }); res.status(201).json({ data: { article } }); } catch (error: any) { if (error?.code === 11000) return next(new AppError(409, 'ARTICLE_SLUG_EXISTS', 'An article with this slug already exists')); next(error); } });
  router.patch('/:id', requireCsrf, validateBody(articleSchema.partial()), async (req, res, next) => { try { const before = await ArticleModel.findById(req.params.id).lean(); if (!before) throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found'); const article = await ArticleModel.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).lean(); await recordAudit({ actorUserId: req.auth!.userId, action: 'article.updated', entityType: 'Article', entityId: String(req.params.id), requestId: String(req.id), changes: { before: { slug: before.slug, status: before.status }, after: { slug: article?.slug, status: article?.status } } }); res.json({ data: { article } }); } catch (error: any) { if (error?.code === 11000) return next(new AppError(409, 'ARTICLE_SLUG_EXISTS', 'An article with this slug already exists')); next(error); } });
  router.delete('/:id', requireCsrf, async (req, res, next) => { try { const article = await ArticleModel.findByIdAndUpdate(req.params.id, { status: 'archived' }, { new: true }).lean(); if (!article) throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found'); await recordAudit({ actorUserId: req.auth!.userId, action: 'article.archived', entityType: 'Article', entityId: String(req.params.id), requestId: String(req.id), changes: { after: { status: 'archived' } } }); res.status(204).send(); } catch (error) { next(error); } });
  return router;
}
