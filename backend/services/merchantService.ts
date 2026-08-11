import { query } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { parsePaginationParams, buildPaginatedResponse } from '../utils/pagination';

interface CreateMerchantProfileInput {
  userId: number;
  businessName: string;
  description?: string;
  categoryId?: number;
  address?: string;
  image?: string;
}

interface UpdateMerchantProfileInput {
  businessName?: string;
  description?: string;
  categoryId?: number;
  address?: string;
  image?: string;
}

/**
 * Create a merchant profile for a registered merchant user.
 */
export const createProfile = async (input: CreateMerchantProfileInput) => {
  const { userId, businessName, description, categoryId, address, image } = input;

  // Check if profile already exists
  const existing = await query('SELECT merchant_id FROM merchants WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) {
    throw new AppError('Merchant profile already exists.', 409);
  }

  const result = await query(
    `INSERT INTO merchants (user_id, business_name, description, category_id, address, image, approval_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
     RETURNING *`,
    [userId, businessName, description || null, categoryId || null, address || null, image || null]
  );

  return result.rows[0];
};

/**
 * Update an existing merchant profile.
 */
export const updateProfile = async (merchantId: number, userId: number, input: UpdateMerchantProfileInput) => {
  // Verify ownership
  const ownership = await query('SELECT merchant_id FROM merchants WHERE merchant_id = $1 AND user_id = $2', [merchantId, userId]);
  if (ownership.rows.length === 0) {
    throw new AppError('Merchant profile not found or access denied.', 404);
  }

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.businessName) { fields.push(`business_name = $${paramIndex++}`); values.push(input.businessName); }
  if (input.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(input.description); }
  if (input.categoryId) { fields.push(`category_id = $${paramIndex++}`); values.push(input.categoryId); }
  if (input.address !== undefined) { fields.push(`address = $${paramIndex++}`); values.push(input.address); }
  if (input.image !== undefined) { fields.push(`image = $${paramIndex++}`); values.push(input.image); }

  if (fields.length === 0) {
    throw new AppError('No fields provided for update.', 400);
  }

  values.push(merchantId);
  const result = await query(
    `UPDATE merchants SET ${fields.join(', ')} WHERE merchant_id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
};

/**
 * Get merchant profile by merchant ID (public).
 */
export const getMerchantById = async (merchantId: number) => {
  const result = await query(
    `SELECT m.*, u.name as owner_name, u.email, u.phone, c.category_name
     FROM merchants m
     JOIN users u ON m.user_id = u.user_id
     LEFT JOIN categories c ON m.category_id = c.category_id
     WHERE m.merchant_id = $1`,
    [merchantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Merchant not found.', 404);
  }

  return result.rows[0];
};

/**
 * Get merchant profile by user_id (for the logged-in merchant).
 */
export const getMerchantByUserId = async (userId: number) => {
  const result = await query(
    `SELECT m.*, c.category_name
     FROM merchants m
     LEFT JOIN categories c ON m.category_id = c.category_id
     WHERE m.user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * List all approved merchants (public).
 * Supports optional category filtering, search, and pagination.
 */
export const listMerchants = async (categoryId?: number, search?: string, page?: number, limit?: number) => {
  const paginationParams = parsePaginationParams(page, limit);

  let baseWhere = ` FROM merchants m
                   JOIN users u ON m.user_id = u.user_id
                   LEFT JOIN categories c ON m.category_id = c.category_id
                   WHERE m.approval_status = 'Approved'`;
  const params: any[] = [];
  let paramIndex = 1;

  if (categoryId) {
    baseWhere += ` AND m.category_id = $${paramIndex++}`;
    params.push(categoryId);
  }

  if (search) {
    baseWhere += ` AND (m.business_name ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Count total matching merchants
  const countResult = await query(`SELECT COUNT(*)` + baseWhere, params);
  const total = parseInt(countResult.rows[0].count, 10);

  // Paginated query
  let sql = `SELECT m.merchant_id, m.business_name, m.description, m.address, m.image,
                    c.category_name, u.name as owner_name` +
            baseWhere +
            ` ORDER BY m.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  
  const dataParams = [...params, paginationParams.limit, paginationParams.offset];
  const result = await query(sql, dataParams);

  return buildPaginatedResponse(result.rows, total, paginationParams);
};

/**
 * Admin: approve or reject a merchant.
 */
export const updateApprovalStatus = async (merchantId: number, status: 'Approved' | 'Rejected') => {
  const result = await query(
    'UPDATE merchants SET approval_status = $1 WHERE merchant_id = $2 RETURNING *',
    [status, merchantId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Merchant not found.', 404);
  }

  return result.rows[0];
};

/**
 * Admin: list all merchants (including pending).
 */
export const listAllMerchants = async () => {
  const result = await query(
    `SELECT m.*, u.name as owner_name, u.email, c.category_name
     FROM merchants m
     JOIN users u ON m.user_id = u.user_id
     LEFT JOIN categories c ON m.category_id = c.category_id
     ORDER BY m.created_at DESC`
  );
  return result.rows;
};
