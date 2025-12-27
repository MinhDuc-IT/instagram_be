export interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalItems: number
  limit: number
  hasMore: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationMeta
}
