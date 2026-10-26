export type PercentageDiscount = {
  type: 'percentage';
  value: number;
};

export function calculateFinalPriceMinor(
  listPriceMinor: number,
  discount: PercentageDiscount,
): number {
  if (!Number.isSafeInteger(listPriceMinor) || listPriceMinor < 0) {
    throw new Error('listPriceMinor must be a non-negative integer');
  }
  if (discount.type !== 'percentage' || !Number.isInteger(discount.value)
    || discount.value < 0 || discount.value > 100) {
    throw new Error('discount must be a percentage from 0 to 100');
  }

  return Math.round(listPriceMinor * (100 - discount.value) / 100);
}
