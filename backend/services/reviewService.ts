import { query } from '../config/db';
import { AppError } from '../middleware/errorHandler';

/**
 * Add a review for a merchant.
 */
export const addReview = async (userId: number, merchantId: number, rating: number, comment?: string) => {
  // Get customer_id from user_id
  let custResult = await query('SELECT customer_id FROM customers WHERE user_id = $1', [userId]);
  if (custResult.rows.length === 0) {
    custResult = await query('INSERT INTO customers (user_id) VALUES ($1) RETURNING customer_id', [userId]);
  }
  const customerId = custResult.rows[0].customer_id;

  // Check if customer has a completed booking with this merchant
  const bookingCheck = await query(
    `SELECT booking_id FROM bookings
     WHERE customer_id = $1 AND merchant_id = $2 AND status = 'Completed'`,
    [customerId, merchantId]
  );
  if (bookingCheck.rows.length === 0) {
    throw new AppError('You can only review a merchant after completing a booking.', 403);
  }

  // Check if already reviewed
  const existingReview = await query(
    'SELECT review_id FROM reviews WHERE customer_id = $1 AND merchant_id = $2',
    [customerId, merchantId]
  );
  if (existingReview.rows.length > 0) {
    throw new AppError('You have already reviewed this merchant.', 409);
  }

  const result = await query(
    'INSERT INTO reviews (customer_id, merchant_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
    [customerId, merchantId, rating, comment || null]
  );

  return result.rows[0];
};

/**
 * Get all reviews for a merchant (public).
 */
export const getMerchantReviews = async (merchantId: number) => {
  const result = await query(
    `SELECT r.*, u.name as customer_name
     FROM reviews r
     JOIN customers c ON r.customer_id = c.customer_id
     JOIN users u ON c.user_id = u.user_id
     WHERE r.merchant_id = $1
     ORDER BY r.created_at DESC`,
    [merchantId]
  );

  // Calculate average rating
  const avgResult = await query(
    'SELECT AVG(rating)::NUMERIC(3,2) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE merchant_id = $1',
    [merchantId]
  );

  return {
    reviews: result.rows,
    averageRating: parseFloat(avgResult.rows[0].avg_rating) || 0,
    totalReviews: parseInt(avgResult.rows[0].total_reviews),
  };
};

/**
 * Get all reviews submitted by the logged in customer.
 */
export const getCustomerReviews = async (userId: number) => {
  let custResult = await query('SELECT customer_id FROM customers WHERE user_id = $1', [userId]);
  if (custResult.rows.length === 0) return [];
  const customerId = custResult.rows[0].customer_id;

  const result = await query(
    `SELECT r.*, m.business_name, m.image as merchant_image
     FROM reviews r
     JOIN merchants m ON r.merchant_id = m.merchant_id
     WHERE r.customer_id = $1
     ORDER BY r.created_at DESC`,
    [customerId]
  );
  return result.rows;
};
