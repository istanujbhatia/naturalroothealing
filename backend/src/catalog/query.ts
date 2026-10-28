export function parsePagination(pageValue: unknown, limitValue: unknown, maxLimit: number): { page: number; limit: number } {
  const pageNumber = Number(Array.isArray(pageValue) ? pageValue[0] : pageValue);
  const limitNumber = Number(Array.isArray(limitValue) ? limitValue[0] : limitValue);
  return {
    page: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1,
    limit: Number.isInteger(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, maxLimit) : Math.min(20, maxLimit),
  };
}
