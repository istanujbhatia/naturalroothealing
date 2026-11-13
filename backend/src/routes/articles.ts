import { Router } from 'express';
import { ArticleModel } from '../content/model.js';

export function createArticlesRouter(): Router {
  const router = Router();
  router.get('/', async (_req, res, next) => { try { const articles = await ArticleModel.find({ status: 'published' }).sort({ publishedAt: -1 }).lean(); res.json({ data: { articles } }); } catch (error) { next(error); } });
  router.get('/:slug', async (req, res, next) => { try { const article = await ArticleModel.findOne({ slug: req.params.slug, status: 'published' }).lean(); if (!article) { res.status(404).json({ error: { code: 'ARTICLE_NOT_FOUND', message: 'Article not found', requestId: req.id } }); return; } res.json({ data: { article } }); } catch (error) { next(error); } });
  return router;
}
