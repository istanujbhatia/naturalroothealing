import { Router } from 'express';
import { Types } from 'mongoose';
import type { AppConfig } from '../config.js';
import { requireAuth, requireCsrf } from '../auth/request.js';
import { AppError } from '../errors.js';
import { validateBody } from '../validation.js';
import { ProductModel } from '../catalog/models/product.js';
import { ReviewModel } from '../review/model.js';
import { reviewCreateSchema } from '../review/schemas.js';

export function createReviewsRouter(config: AppConfig): Router {
  const router = Router();

  router.get('/:slug/reviews', async (req, res, next) => {
    try {
      const product = await ProductModel.findOne({ slug: req.params.slug, status: 'active' }).select('_id').lean();
      if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
      const reviews = await ReviewModel.find({ productId: product._id, status: 'published', isFeatured: true }).populate('userId', 'name').sort({ createdAt: -1 }).lean();
      res.json({ data: { reviews: reviews.map(toPublicReview) } });
    } catch (error) { next(error); }
  });

  router.post('/:slug/reviews', requireAuth(config), requireCsrf, validateBody(reviewCreateSchema), async (req, res, next) => {
    try {
      const product = await ProductModel.findOne({ slug: req.params.slug, status: 'active' }).select('_id').lean();
      if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
      const review = await ReviewModel.create({ ...req.body, productId: product._id, userId: req.auth!.userId });
      res.status(201).json({ data: { review: { id: String(review._id), status: review.status, isFeatured: review.isFeatured } } });
    } catch (error) {
      if (isDuplicate(error)) { next(new AppError(409, 'REVIEW_ALREADY_EXISTS', 'You have already reviewed this product')); return; }
      next(error);
    }
  });

  return router;
}

function toPublicReview(review: any) { return { id: String(review._id), rating: review.rating, title: review.title, body: review.body, authorName: review.authorName || review.userId?.name || 'Customer', isDemo: review.source === 'admin_demo', createdAt: review.createdAt }; }
function isDuplicate(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000; }
