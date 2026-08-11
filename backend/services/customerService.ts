import { query } from '../config/db';
import { AppError } from '../middleware/errorHandler';

// Helper to get customer_id from user_id
const getCustomerId = async (userId: number): Promise<number> => {
  const result = await query('SELECT customer_id FROM customers WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) throw new AppError('Customer profile not found.', 404);
  return result.rows[0].customer_id;
};

/**
 * Add a service to customer's favorites.
 */
export const addFavorite = async (userId: number, serviceId: number) => {
  const customerId = await getCustomerId(userId);

  // Check if service exists
  const svcCheck = await query('SELECT service_id FROM services WHERE service_id = $1', [serviceId]);
  if (svcCheck.rows.length === 0) {
    throw new AppError('Service not found.', 404);
  }

  // Check if already favorited
  const existing = await query('SELECT favorite_id FROM favorites WHERE customer_id = $1 AND service_id = $2', [customerId, serviceId]);
  if (existing.rows.length > 0) {
    throw new AppError('Service is already in your favorites.', 409);
  }

  const result = await query(
    'INSERT INTO favorites (customer_id, service_id) VALUES ($1, $2) RETURNING *',
    [customerId, serviceId]
  );
  return result.rows[0];
};

/**
 * Remove a service from customer's favorites.
 */
export const removeFavorite = async (userId: number, serviceId: number) => {
  const customerId = await getCustomerId(userId);

  const result = await query(
    'DELETE FROM favorites WHERE customer_id = $1 AND service_id = $2 RETURNING favorite_id',
    [customerId, serviceId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Favorite not found.', 404);
  }

  return { message: 'Service removed from favorites.' };
};

/**
 * Get all favorites for a customer.
 */
export const getFavorites = async (userId: number) => {
  const customerId = await getCustomerId(userId);

  const result = await query(
    `SELECT f.favorite_id, f.created_at as favorited_at, s.*, m.business_name, m.address, c.category_name, COALESCE(rev.avg_rating, 0) as avg_rating
     FROM favorites f
     JOIN services s ON f.service_id = s.service_id
     JOIN merchants m ON s.merchant_id = m.merchant_id
     LEFT JOIN categories c ON m.category_id = c.category_id
     LEFT JOIN (
       SELECT merchant_id, AVG(rating)::NUMERIC(3,2) as avg_rating
       FROM reviews
       GROUP BY merchant_id
     ) rev ON m.merchant_id = rev.merchant_id
     WHERE f.customer_id = $1
     ORDER BY f.created_at DESC`,
    [customerId]
  );
  return result.rows;
};

/**
 * Update customer profile (name, phone).
 */
export const updateCustomerProfile = async (userId: number, name: string, phone?: string) => {
  if (!name || name.trim().length === 0) {
    throw new AppError('Name is required.', 400);
  }

  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    throw new AppError('Name must not exceed 100 characters.', 400);
  }

  const trimmedPhone = phone ? phone.trim() : null;

  const result = await query(
    `UPDATE users 
     SET name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE user_id = $3 
     RETURNING user_id, name, email, phone, created_at`,
    [trimmedName, trimmedPhone, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User profile not found.', 404);
  }

  return result.rows[0];
};
