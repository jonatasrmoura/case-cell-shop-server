export function paginationQueryConfig(page?: string, limit?: string) {
  const pageCurrent = Math.max(Number(page ?? 1), 1);
  const limitCurrent = Math.min(Number(limit ?? 10), 50);
  const offset = (pageCurrent - 1) * limitCurrent;

  return {
    pageCurrent,
    limitCurrent,
    offset,
  };
}
