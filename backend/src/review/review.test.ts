import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { ReviewModel } from './model.js';
import { reviewCreateSchema, reviewAdminUpdateSchema } from './schemas.js';

describe('review rules', () => {
  it('accepts a customer review and admin visibility settings', async () => {
    const input = reviewCreateSchema.parse({ rating: 5, title: 'A gentle daily ritual', body: 'This has become part of my routine.' });
    const review = new ReviewModel({ ...input, productId: new Types.ObjectId(), userId: new Types.ObjectId(), status: 'pending', isFeatured: false });
    await expect(review.validate()).resolves.toBeUndefined();
    expect(reviewAdminUpdateSchema.parse({ isFeatured: true })).toEqual({ isFeatured: true });
  });

  it('rejects invalid ratings and unsupported admin states', () => {
    expect(() => reviewCreateSchema.parse({ rating: 6, title: 'Too high', body: 'No' })).toThrow();
    expect(() => reviewAdminUpdateSchema.parse({ isFeatured: 'yes' })).toThrow();
  });
});
