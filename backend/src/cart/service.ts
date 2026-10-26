import { Types } from 'mongoose';
import { AppError } from '../errors.js';
import { calculateFinalPriceMinor } from '../catalog/price.js';
import type { ProductQuantity } from './schemas.js';

const MAX_QUANTITY = 99;

type CartItemRecord = { productId: { toString(): string }; quantity: number };
type CartRecord = { userId: { toString(): string }; items: CartItemRecord[] };
export type ProductRecord = {
  _id: { toString(): string };
  slug: string;
  name: string;
  size: string;
  category?: { name?: string } | null;
  images: { reference: string }[];
  currency: string;
  listPriceMinor: number;
  discount: { type: 'percentage'; value: number };
};

type CartRepository = {
  findOne(query: Record<string, unknown>): Promise<CartRecord | null>;
  create(document: Record<string, unknown>): Promise<CartRecord>;
  findOneAndUpdate(query: Record<string, unknown>, update: Record<string, unknown>): Promise<CartRecord | null>;
  deleteOne(query: Record<string, unknown>): Promise<unknown>;
};

export type ProductRepository = {
  findByIdentifier(identifier: string): Promise<ProductRecord | null>;
  findByIds(ids: unknown[]): Promise<ProductRecord[]>;
};

export type CartLine = {
  id: string;
  productId: string;
  name: string;
  category: string;
  size: string;
  image: string;
  price: number;
  originalPrice: number;
  discount: number;
  quantity: number;
};

export type CartResult = {
  items: CartLine[];
  subtotalMinor: number;
  removedProductIds: string[];
};

export async function getCart(userId: string, carts: CartRepository, products: ProductRepository): Promise<CartResult> {
  const cart = await carts.findOne({ userId });
  if (!cart || cart.items.length === 0) return { items: [], subtotalMinor: 0, removedProductIds: [] };
  const activeProducts = await products.findByIds(cart.items.map((item) => item.productId));
  const activeIds = new Set(activeProducts.map((product) => product._id.toString()));
  const removedProductIds = cart.items.map((item) => item.productId.toString()).filter((id) => !activeIds.has(id));
  if (removedProductIds.length) {
    await carts.findOneAndUpdate({ userId }, { $set: { items: cart.items.filter((item) => activeIds.has(item.productId.toString())) } });
  }
  return makeResult(cart.items.filter((item) => activeIds.has(item.productId.toString())), activeProducts, removedProductIds);
}

export async function addCartItem(userId: string, input: ProductQuantity, carts: CartRepository, products: ProductRepository): Promise<CartResult> {
  const product = await requireProduct(input.productId, products);
  const cart = await carts.findOne({ userId });
  const items = cart?.items.map((item) => ({ productId: item.productId, quantity: item.quantity })) ?? [];
  const existing = items.find((item) => item.productId.toString() === product._id.toString());
  if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + input.quantity);
  else items.push({ productId: product._id, quantity: input.quantity });
  await saveCart(userId, items, carts);
  return getCart(userId, carts, products);
}

export async function updateCartItem(userId: string, productId: string, quantity: number, carts: CartRepository, products: ProductRepository): Promise<CartResult> {
  const product = await products.findByIdentifier(productId);
  const resolvedProductId = product?._id.toString() || productId;
  if (!Types.ObjectId.isValid(resolvedProductId)) throw new AppError(400, 'INVALID_PRODUCT_ID', 'Product identifier is invalid');
  const cart = await carts.findOne({ userId });
  const items = cart?.items.map((item) => ({ productId: item.productId, quantity: item.quantity })) ?? [];
  const itemIndex = items.findIndex((item) => item.productId.toString() === resolvedProductId);
  if (quantity > 0) {
    await requireProduct(resolvedProductId, products);
    if (itemIndex >= 0) items[itemIndex]!.quantity = quantity;
    else items.push({ productId: new Types.ObjectId(resolvedProductId), quantity });
  } else if (itemIndex >= 0) {
    items.splice(itemIndex, 1);
  }
  await saveCart(userId, items, carts);
  return getCart(userId, carts, products);
}

export async function removeCartItem(userId: string, productId: string, carts: CartRepository, products: ProductRepository): Promise<CartResult> {
  return updateCartItem(userId, productId, 0, carts, products);
}

export async function clearCart(userId: string, carts: CartRepository, products: ProductRepository): Promise<CartResult> {
  await carts.deleteOne({ userId });
  return getCart(userId, carts, products);
}

export async function mergeCart(userId: string, guestItems: ProductQuantity[], carts: CartRepository, products: ProductRepository): Promise<CartResult & { ignoredProductIds: string[] }> {
  const cart = await carts.findOne({ userId });
  const items = cart?.items.map((item) => ({ productId: item.productId, quantity: item.quantity })) ?? [];
  const ignoredProductIds: string[] = [];
  for (const guestItem of guestItems) {
    const product = await products.findByIdentifier(guestItem.productId);
    if (!product) { ignoredProductIds.push(guestItem.productId); continue; }
    const existing = items.find((item) => item.productId.toString() === product._id.toString());
    if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + guestItem.quantity);
    else items.push({ productId: product._id, quantity: guestItem.quantity });
  }
  await saveCart(userId, items, carts);
  return { ...(await getCart(userId, carts, products)), ignoredProductIds };
}

async function requireProduct(identifier: string, products: ProductRepository): Promise<ProductRecord> {
  const product = await products.findByIdentifier(identifier);
  if (!product) throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'That product is unavailable');
  return product;
}

async function saveCart(userId: string, items: { productId: unknown; quantity: number }[], carts: CartRepository): Promise<void> {
  await carts.findOneAndUpdate({ userId }, { $set: { userId, items } });
}

function makeResult(items: CartItemRecord[], products: ProductRecord[], removedProductIds: string[]): CartResult {
  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  let subtotalMinor = 0;
  const lines = items.flatMap((item) => {
    const product = byId.get(item.productId.toString());
    if (!product) return [];
    const priceMinor = calculateFinalPriceMinor(product.listPriceMinor, product.discount);
    subtotalMinor += priceMinor * item.quantity;
    return [{
      id: product.slug,
      productId: product._id.toString(),
      name: product.name,
      category: product.category?.name || '',
      size: product.size,
      image: product.images[0]?.reference || '',
      price: priceMinor / 100,
      originalPrice: product.listPriceMinor / 100,
      discount: product.discount.value,
      quantity: item.quantity,
    }];
  });
  return { items: lines, subtotalMinor, removedProductIds };
}
