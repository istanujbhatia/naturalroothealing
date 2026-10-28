import { Router } from 'express';
import { ProductModel } from '../catalog/models/product.js';
import { CategoryModel } from '../catalog/models/category.js';
import { calculateFinalPriceMinor } from '../catalog/price.js';
import { parsePagination } from '../catalog/query.js';
import { StoreSettingsModel } from '../catalog/models/store-settings.js';
import { resolvedSiteImages } from '../catalog/site-images.js';

export const catalogRouter = Router();

catalogRouter.get('/site-images', async (_req, res, next) => {
  try {
    const settings = await StoreSettingsModel.findOne({ key: 'default' }).lean();
    res.json({ data: { images: resolvedSiteImages(settings?.siteImages || []) } });
  } catch (error) { next(error); }
});

catalogRouter.get('/categories', async (_req, res, next) => {
  try {
    const categories = await CategoryModel.find({ status: 'active' }).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ data: { categories: categories.map((category) => ({
      id: String(category._id), name: category.name, slug: category.slug, description: category.description,
    })) } });
  } catch (error) { next(error); }
});

catalogRouter.get('/products', async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query.page, req.query.limit, 50);
    const activeCategories = await CategoryModel.find({ status: 'active' }).select('_id').lean();
    const filter = { status: 'active' as const, category: { $in: activeCategories.map((category) => category._id) } };
    const [products, total] = await Promise.all([
      ProductModel.find(filter).populate({ path: 'category', match: { status: 'active' }, select: 'name slug' }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ProductModel.countDocuments(filter),
    ]);
    res.json({ data: { products: products.map(toPublicProduct), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
});

catalogRouter.get('/products/:slug', async (req, res, next) => {
  try {
    const product = await ProductModel.findOne({ slug: req.params.slug, status: 'active' }).populate({ path: 'category', match: { status: 'active' }, select: 'name slug' }).lean();
    if (!product || !product.category) {
      res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found', requestId: req.id } });
      return;
    }
    res.json({ data: { product: toPublicProduct(product) } });
  } catch (error) { next(error); }
});

function toPublicProduct(product: any) {
  return {
    id: String(product._id), slug: product.slug, name: product.name, description: product.description,
    details: product.details, ingredients: product.ingredients, size: product.size, images: product.images,
    currency: product.currency, listPriceMinor: product.listPriceMinor,
    discount: product.discount, finalPriceMinor: calculateFinalPriceMinor(product.listPriceMinor, product.discount),
    category: product.category ? { id: String(product.category._id), name: product.category.name, slug: product.category.slug } : null,
  };
}
