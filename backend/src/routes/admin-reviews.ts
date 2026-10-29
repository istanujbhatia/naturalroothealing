import { Router } from 'express';
import { Types } from 'mongoose';
import type { AppConfig } from '../config.js';
import { requireAdmin, requireCsrf } from '../auth/request.js';
import { AppError } from '../errors.js';
import { ProductModel } from '../catalog/models/product.js';
import { ReviewModel } from '../review/model.js';
import { reviewAdminCreateSchema, reviewAdminUpdateSchema } from '../review/schemas.js';
import { parsePagination } from '../catalog/query.js';
import { validateBody } from '../validation.js';
import { recordAudit } from '../audit/service.js';

export function createAdminReviewsRouter(config: AppConfig): Router {
  const router = Router();
  router.use(requireAdmin(config));

  router.get('/', async (req, res, next) => {
    try {
      const { page, limit } = parsePagination(req.query.page, req.query.limit, 10);
      const filter: Record<string, unknown> = {};
      const productId = String(req.query.productId || '');
      if (!Types.ObjectId.isValid(productId)) throw new AppError(400, 'PRODUCT_REQUIRED', 'Select a product to view its reviews');
      filter.productId = productId;
      const rating = Number(req.query.rating || 0);
      if (rating >= 1 && rating <= 5 && Number.isInteger(rating)) filter.rating = rating;
      const [reviews, total] = await Promise.all([
        ReviewModel.find(filter).populate('productId', 'name slug').populate('userId', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        ReviewModel.countDocuments(filter),
      ]);
      res.json({ data: { reviews: reviews.map(toAdminReview), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
    } catch (error) { next(error); }
  });

  router.post('/demo', requireCsrf, validateBody(reviewAdminCreateSchema), async (req, res, next) => {
    try {
      const product = await ProductModel.findOne({ _id: req.body.productId, status: 'active' }).select('_id').lean();
      if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Select an active product');
      if (req.body.isStrip && await ReviewModel.countDocuments({ status: 'published', isStrip: true }) >= 20) throw new AppError(409, 'REVIEW_STRIP_LIMIT_REACHED', 'The home review strip already has 20 reviews. Remove one before adding another.');
      const review = await ReviewModel.create({ ...req.body, productId: product._id, source: 'customer_customer' });
      await recordAudit({ actorUserId: req.auth!.userId, action: 'review.demo_created', entityType: 'Review', entityId: String(review._id), requestId: String(req.id), changes: { after: { productId: String(product._id), authorName: review.authorName, status: review.status, isFeatured: review.isFeatured } } });
      const populated = await ReviewModel.findById(review._id).populate('productId', 'name slug').lean();
      res.status(201).json({ data: { review: toAdminReview(populated) } });
    } catch (error) { next(error); }
  });

  router.patch('/:reviewId', requireCsrf, validateBody(reviewAdminUpdateSchema), async (req, res, next) => {
    try {
      const reviewId = String(req.params.reviewId ?? '');
      if (!Types.ObjectId.isValid(reviewId)) throw new AppError(400, 'INVALID_REVIEW_ID', 'Review identifier is invalid');
      const before = await ReviewModel.findById(reviewId).lean();
      if (!before) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found');
      const changes: Record<string, unknown> = {};
      if (req.body.isFeatured !== undefined) changes.isFeatured = req.body.isFeatured;
      if (req.body.isStrip !== undefined) {
        if (req.body.isStrip) {
          const stripCount = await ReviewModel.countDocuments({ status: 'published', isStrip: true, _id: { $ne: reviewId } });
          if (stripCount >= 20) throw new AppError(409, 'REVIEW_STRIP_LIMIT_REACHED', 'The home review strip already has 20 reviews. Remove one before adding another.');
          changes.isStrip = true;
          changes.status = 'published';
        } else changes.isStrip = false;
      }
      if (req.body.isFeatured === true) changes.status = 'published';
      const updated = await ReviewModel.findByIdAndUpdate(reviewId, { $set: changes }, { new: true, runValidators: true }).populate('productId', 'name slug').populate('userId', 'name email').lean();
      await recordAudit({ actorUserId: req.auth!.userId, action: 'review.visibility_updated', entityType: 'Review', entityId: reviewId, requestId: String(req.id), changes: { before: { status: before.status, isFeatured: before.isFeatured, isStrip: before.isStrip }, after: { status: updated!.status, isFeatured: updated!.isFeatured, isStrip: updated!.isStrip } } });
      res.json({ data: { review: toAdminReview(updated) } });
    } catch (error) { next(error); }
  });

  router.delete('/:reviewId', requireCsrf, async (req, res, next) => {
    try {
      const reviewId = String(req.params.reviewId ?? '');
      if (!Types.ObjectId.isValid(reviewId)) throw new AppError(400, 'INVALID_REVIEW_ID', 'Review identifier is invalid');
      const review = await ReviewModel.findById(reviewId).select('_id productId source').lean();
      if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found');
      await ReviewModel.deleteOne({ _id: reviewId });
      await recordAudit({ actorUserId: req.auth!.userId, action: 'review.deleted', entityType: 'Review', entityId: reviewId, requestId: String(req.id), changes: { before: { productId: String(review.productId), source: review.source } } });
      res.status(204).send();
    } catch (error) { next(error); }
  });

  return router;
}

function toAdminReview(review: any) { return { id: String(review._id), rating: review.rating, title: review.title, body: review.body, status: review.status, isFeatured: review.isFeatured, isStrip: review.isStrip, source: review.source, authorName: review.authorName || null, createdAt: review.createdAt, product: review.productId ? { id: String(review.productId._id), name: review.productId.name, slug: review.productId.slug } : null, user: review.userId ? { id: String(review.userId._id), name: review.userId.name, email: review.userId.email } : null }; }
