import { query } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { parsePaginationParams, buildPaginatedResponse } from '../utils/pagination';

interface AddServiceInput {
  merchantId: number;
  serviceName: string;
  description?: string;
  price: number;
  duration: number;
  image?: string;
}

interface UpdateServiceInput {
  serviceName?: string;
  description?: string;
  price?: number;
  duration?: number;
  image?: string;
  availability?: boolean;
}

/**
 * Add a new service for a merchant.
 */
export const addService = async (input: AddServiceInput) => {
  const { merchantId, serviceName, description, price, duration, image } = input;

  const result = await query(
    `INSERT INTO services (merchant_id, service_name, description, price, duration, image)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [merchantId, serviceName, description || null, price, duration, image || null]
  );

  return result.rows[0];
};

/**
 * Update a service. Only the owning merchant can update.
 */
export const updateService = async (serviceId: number, merchantId: number, input: UpdateServiceInput) => {
  // Verify ownership
  const ownership = await query(
    'SELECT service_id FROM services WHERE service_id = $1 AND merchant_id = $2',
    [serviceId, merchantId]
  );
  if (ownership.rows.length === 0) {
    throw new AppError('Service not found or access denied.', 404);
  }

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (input.serviceName) { fields.push(`service_name = $${idx++}`); values.push(input.serviceName); }
  if (input.description !== undefined) { fields.push(`description = $${idx++}`); values.push(input.description); }
  if (input.price !== undefined) { fields.push(`price = $${idx++}`); values.push(input.price); }
  if (input.duration !== undefined) { fields.push(`duration = $${idx++}`); values.push(input.duration); }
  if (input.image !== undefined) { fields.push(`image = $${idx++}`); values.push(input.image); }
  if (input.availability !== undefined) { fields.push(`availability = $${idx++}`); values.push(input.availability); }

  if (fields.length === 0) {
    throw new AppError('No fields provided for update.', 400);
  }

  values.push(serviceId);
  const result = await query(
    `UPDATE services SET ${fields.join(', ')} WHERE service_id = $${idx} RETURNING *`,
    values
  );

  return result.rows[0];
};

/**
 * Delete a service. Only the owning merchant can delete.
 */
export const deleteService = async (serviceId: number, merchantId: number) => {
  const result = await query(
    'DELETE FROM services WHERE service_id = $1 AND merchant_id = $2 RETURNING service_id',
    [serviceId, merchantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Service not found or access denied.', 404);
  }

  return { message: 'Service deleted successfully.' };
};

/**
 * Get all services for a specific merchant (public).
 */
export const getServicesByMerchant = async (merchantId: number) => {
  const result = await query(
    'SELECT * FROM services WHERE merchant_id = $1 ORDER BY created_at DESC',
    [merchantId]
  );
  return result.rows;
};

/**
 * Get a single service by ID (public).
 */
export const getServiceById = async (serviceId: number) => {
  const result = await query(
    `SELECT s.*, m.business_name, m.address
     FROM services s
     JOIN merchants m ON s.merchant_id = m.merchant_id
     WHERE s.service_id = $1`,
    [serviceId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Service not found.', 404);
  }

  return result.rows[0];
};

/**
 * List all available services (public), supports category filtering, search, price range filtering, whitelisted sorting, and pagination.
 */
export const listAllServices = async (
  categoryId?: number,
  search?: string,
  minPrice?: number,
  maxPrice?: number,
  sortBy?: string,
  page?: number,
  limit?: number
) => {
  const paginationParams = parsePaginationParams(page, limit);

  if (minPrice !== undefined && (isNaN(minPrice) || minPrice < 0)) {
    throw new AppError('minPrice must be a non-negative number.', 400);
  }
  if (maxPrice !== undefined && (isNaN(maxPrice) || maxPrice < 0)) {
    throw new AppError('maxPrice must be a non-negative number.', 400);
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new AppError('minPrice cannot exceed maxPrice.', 400);
  }

  let baseFrom = ` FROM services s
                  JOIN merchants m ON s.merchant_id = m.merchant_id
                  LEFT JOIN categories c ON m.category_id = c.category_id
                  LEFT JOIN (
                    SELECT merchant_id, AVG(rating)::NUMERIC(3,2) as avg_rating
                    FROM reviews
                    GROUP BY merchant_id
                  ) rev ON m.merchant_id = rev.merchant_id
                  WHERE m.approval_status = 'Approved' AND s.availability = true`;
  const params: any[] = [];
  let idx = 1;
  let useFtsRank = false;

  if (categoryId) {
    baseFrom += ` AND m.category_id = $${idx++}`;
    params.push(categoryId);
  }

  if (search) {
    const trimmed = search.trim();
    if (trimmed.length > 0) {
      // Try full-text search with tsquery for multi-word / longer queries
      // Fall back to trigram similarity for short or single-partial-word queries
      const words = trimmed.split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 1 && trimmed.length >= 3) {
        // Build tsquery: join words with '&' for AND matching, append ':*' for prefix matching
        const tsqueryStr = words.map(w => w.replace(/[^a-zA-Z0-9]/g, '')).filter(w => w.length > 0).join(' & ') + ':*';
        baseFrom += ` AND (
          s.search_vector @@ to_tsquery('english', $${idx})
          OR s.service_name ILIKE $${idx + 1}
          OR s.description ILIKE $${idx + 1}
          OR similarity(s.service_name, $${idx + 2}) > 0.2
        )`;
        params.push(tsqueryStr, `%${trimmed}%`, trimmed);
        idx += 3;
        useFtsRank = true;
      } else {
        // Very short query — use ILIKE + trigram only
        baseFrom += ` AND (s.service_name ILIKE $${idx} OR s.description ILIKE $${idx})`;
        params.push(`%${trimmed}%`);
        idx++;
      }
    }
  }

  if (minPrice !== undefined) {
    baseFrom += ` AND s.price >= $${idx++}`;
    params.push(minPrice);
  }

  if (maxPrice !== undefined) {
    baseFrom += ` AND s.price <= $${idx++}`;
    params.push(maxPrice);
  }

  // Count total matching records
  const countResult = await query(`SELECT COUNT(*)` + baseFrom, params);
  const total = parseInt(countResult.rows[0].count, 10);

  // Main query with sorting and pagination
  let sql = `SELECT s.*, m.business_name, m.address, c.category_name, COALESCE(rev.avg_rating, 0) as avg_rating` + baseFrom;

  // Whitelisted SORT logic
  const sortMap: Record<string, string> = {
    price_asc: 'ORDER BY s.price ASC',
    price_desc: 'ORDER BY s.price DESC',
    rating_desc: 'ORDER BY rev.avg_rating DESC NULLS LAST, s.created_at DESC',
    newest: 'ORDER BY s.created_at DESC',
    relevance: 'ORDER BY s.created_at DESC', // overridden below when FTS active
  };

  // Default to relevance sorting when full-text search is active and no explicit sort
  let selectedSort: string;
  if (useFtsRank && (!sortBy || sortBy === 'relevance')) {
    selectedSort = 'ORDER BY ts_rank(s.search_vector, to_tsquery(\'english\', $1)) DESC, s.created_at DESC';
  } else {
    selectedSort = (sortBy && sortMap[sortBy]) ? sortMap[sortBy] : sortMap['newest'];
  }
  sql += ` ${selectedSort} LIMIT $${idx++} OFFSET $${idx++}`;
  
  const dataParams = [...params, paginationParams.limit, paginationParams.offset];
  const result = await query(sql, dataParams);

  return buildPaginatedResponse(result.rows, total, paginationParams);
};
