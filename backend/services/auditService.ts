import { query } from '../config/db';
import { parsePaginationParams, buildPaginatedResponse } from '../utils/pagination';

/**
 * Log an audit event to the audit_logs table.
 * Never stores passwords, JWT secrets, API keys, or card numbers.
 */
export const logAuditEvent = async (params: {
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number;
  details?: Record<string, any>;
}) => {
  const { userId, action, entityType, entityId, details } = params;

  // Sanitize details - strip any sensitive fields if accidentally included
  let safeDetails = details || null;
  if (safeDetails) {
    const sensitiveKeys = ['password', 'secret', 'token', 'key_secret', 'razorpay_key_secret', 'jwt', 'cvv', 'card_number'];
    safeDetails = { ...safeDetails };
    for (const key of sensitiveKeys) {
      delete safeDetails[key];
    }
  }

  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, entityType, entityId, safeDetails ? JSON.stringify(safeDetails) : null]
  );
};

/**
 * Get audit logs with pagination and optional filters (Admin only).
 * Whitelisted filter values only.
 */
export const getAuditLogs = async (
  page?: number,
  limit?: number,
  action?: string,
  entityType?: string,
  userId?: number
) => {
  const paginationParams = parsePaginationParams(page, limit);

  // Whitelisted action values
  const allowedActions = [
    'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'BOOKING_STATUS_CHANGED',
    'PAYMENT_COMPLETED', 'PAYMENT_FAILED',
    'REFUND_INITIATED', 'REFUND_PROCESSED', 'REFUND_FAILED',
    'MERCHANT_APPROVED', 'MERCHANT_REJECTED',
  ];

  // Whitelisted entity types
  const allowedEntityTypes = ['Booking', 'Payment', 'Merchant', 'User', 'Service'];

  let baseWhere = ' FROM audit_logs al LEFT JOIN users u ON al.user_id = u.user_id WHERE 1=1';
  const params: any[] = [];
  let idx = 1;

  if (action) {
    if (!allowedActions.includes(action)) {
      // Silently ignore invalid action filter
    } else {
      baseWhere += ` AND al.action = $${idx++}`;
      params.push(action);
    }
  }

  if (entityType) {
    if (!allowedEntityTypes.includes(entityType)) {
      // Silently ignore invalid entity type filter
    } else {
      baseWhere += ` AND al.entity_type = $${idx++}`;
      params.push(entityType);
    }
  }

  if (userId && !isNaN(userId)) {
    baseWhere += ` AND al.user_id = $${idx++}`;
    params.push(userId);
  }

  const countRes = await query(`SELECT COUNT(*)` + baseWhere, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const sql = `SELECT al.*, u.name as user_name, u.email as user_email` +
              baseWhere +
              ` ORDER BY al.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;

  const dataParams = [...params, paginationParams.limit, paginationParams.offset];
  const result = await query(sql, dataParams);

  return buildPaginatedResponse(result.rows, total, paginationParams);
};
