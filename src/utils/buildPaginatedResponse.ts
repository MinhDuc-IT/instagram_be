import { PaginatedResponse } from "src/types/pagination"

export function buildPaginatedResponse<T>(
  items: T[],
  totalCount: number,
  currentPage: number,
  limit: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(totalCount / limit)
  const hasMore = currentPage < totalPages

  return {
    items,
    pagination: {
      currentPage,
      totalPages,
      totalItems: totalCount,
      limit,
      hasMore,
    },
  }
}
