import { query } from '../config/db';
import { AppError } from '../middleware/errorHandler';

/**
 * Create a notification for a user.
 */
export const createNotification = async (userId: number, message: string) => {
  const result = await query(
    'INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *',
    [userId, message]
  );
  return result.rows[0];
};

/**
 * Get all notifications for a user.
 */
export const getUserNotifications = async (userId: number) => {
  const result = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  return result.rows;
};

/**
 * Mark a notification as read.
 */
export const markAsRead = async (notificationId: number, userId: number) => {
  const result = await query(
    "UPDATE notifications SET status = 'Read' WHERE notification_id = $1 AND user_id = $2 RETURNING *",
    [notificationId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Notification not found.', 404);
  }

  return result.rows[0];
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllAsRead = async (userId: number) => {
  await query(
    "UPDATE notifications SET status = 'Read' WHERE user_id = $1 AND status = 'Unread'",
    [userId]
  );
  return { message: 'All notifications marked as read.' };
};
