export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Parse page and limit from request query string safely.
 * Page default = 1, min = 1
 * Limit default = 12, min = 1, max = 100
 */
export const parsePaginationParams = (pageQuery?: any, limitQuery?: any): PaginationParams => {
  let page = parseInt(pageQuery as string, 10);
  let limit = parseInt(limitQuery as string, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 12;
  if (limit > 100) limit = 100;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Build standardized pagination response object.
 */
export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginationResult<T> => {
  const totalPages = Math.ceil(total / params.limit) || 1;

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
    },
  };
};
