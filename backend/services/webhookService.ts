import crypto from 'crypto';
import { query } from '../config/db';

/**
 * Verify Razorpay webhook signature using HMAC SHA256.
 */
export const verifyWebhookSignature = (
  rawBody: string,
  signature: string,
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Guard: timingSafeEqual requires equal-length buffers.
  // A malformed signature must not crash the server.
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
};

/**
 * Store a raw webhook event in payment_events table.
 * Returns false if event already exists (idempotency).
 */
export const storeWebhookEvent = async (
  razorpayEventId: string,
  eventType: string,
  payload: any
): Promise<boolean> => {
  try {
    await query(
      `INSERT INTO payment_events (razorpay_event_id, event_type, payload)
       VALUES ($1, $2, $3)`,
      [razorpayEventId, eventType, JSON.stringify(payload)]
    );
    return true;
  } catch (err: any) {
    // Unique constraint violation — duplicate event
    if (err.code === '23505') {
      return false;
    }
    throw err;
  }
};

/**
 * Process payment.captured event — update payment status to Completed.
 */
const processPaymentCaptured = async (payload: any) => {
  const paymentEntity = payload?.payload?.payment?.entity;
  if (!paymentEntity) return;

  const razorpayPaymentId = paymentEntity.id;
  const razorpayOrderId = paymentEntity.order_id;

  if (!razorpayPaymentId || !razorpayOrderId) return;

  // Find the payment record by razorpay_order_id
  const existing = await query(
    'SELECT payment_id, payment_status FROM payments WHERE razorpay_order_id = $1',
    [razorpayOrderId]
  );

  if (existing.rows.length === 0) return;

  const payment = existing.rows[0];

  // Only update if not already Completed
  if (payment.payment_status === 'Completed') return;

  await query(
    `UPDATE payments
     SET payment_status = 'Completed',
         razorpay_payment_id = $1,
         payment_method = COALESCE($2, payment_method, 'card')
     WHERE payment_id = $3`,
    [razorpayPaymentId, paymentEntity.method || null, payment.payment_id]
  );

  // Log audit event
  const { logAuditEvent } = await import('./auditService');
  await logAuditEvent({
    userId: null,
    action: 'PAYMENT_COMPLETED',
    entityType: 'Payment',
    entityId: payment.payment_id,
    details: { source: 'webhook', razorpayPaymentId, razorpayOrderId },
  });
};

/**
 * Process payment.failed event — update payment status to Failed.
 */
const processPaymentFailed = async (payload: any) => {
  const paymentEntity = payload?.payload?.payment?.entity;
  if (!paymentEntity) return;

  const razorpayOrderId = paymentEntity.order_id;
  if (!razorpayOrderId) return;

  const existing = await query(
    'SELECT payment_id, payment_status FROM payments WHERE razorpay_order_id = $1',
    [razorpayOrderId]
  );

  if (existing.rows.length === 0) return;

  const payment = existing.rows[0];

  if (payment.payment_status === 'Completed' || payment.payment_status === 'Refunded') return;

  await query(
    `UPDATE payments SET payment_status = 'Failed' WHERE payment_id = $1`,
    [payment.payment_id]
  );

  const { logAuditEvent } = await import('./auditService');
  await logAuditEvent({
    userId: null,
    action: 'PAYMENT_FAILED',
    entityType: 'Payment',
    entityId: payment.payment_id,
    details: { source: 'webhook', reason: paymentEntity.error_description || 'Payment failed' },
  });
};

/**
 * Process refund.processed event — update refund status to PROCESSED.
 */
const processRefundProcessed = async (payload: any) => {
  const refundEntity = payload?.payload?.refund?.entity;
  if (!refundEntity) return;

  const razorpayPaymentId = refundEntity.payment_id;
  const razorpayRefundId = refundEntity.id;

  if (!razorpayPaymentId) return;

  const existing = await query(
    'SELECT payment_id, refund_status FROM payments WHERE razorpay_payment_id = $1',
    [razorpayPaymentId]
  );

  if (existing.rows.length === 0) return;

  const payment = existing.rows[0];

  if (payment.refund_status === 'PROCESSED') return;

  await query(
    `UPDATE payments
     SET payment_status = 'Refunded',
         refund_status = 'PROCESSED',
         razorpay_refund_id = $1,
         refund_amount = $2,
         refunded_at = CURRENT_TIMESTAMP
     WHERE payment_id = $3`,
    [razorpayRefundId, (refundEntity.amount / 100).toFixed(2), payment.payment_id]
  );

  const { logAuditEvent } = await import('./auditService');
  await logAuditEvent({
    userId: null,
    action: 'REFUND_PROCESSED',
    entityType: 'Payment',
    entityId: payment.payment_id,
    details: { source: 'webhook', razorpayRefundId, amount: refundEntity.amount / 100 },
  });
};

/**
 * Process refund.failed event — update refund status to FAILED.
 */
const processRefundFailed = async (payload: any) => {
  const refundEntity = payload?.payload?.refund?.entity;
  if (!refundEntity) return;

  const razorpayPaymentId = refundEntity.payment_id;
  if (!razorpayPaymentId) return;

  const existing = await query(
    'SELECT payment_id, refund_status FROM payments WHERE razorpay_payment_id = $1',
    [razorpayPaymentId]
  );

  if (existing.rows.length === 0) return;

  const payment = existing.rows[0];

  if (payment.refund_status === 'PROCESSED') return;

  await query(
    `UPDATE payments SET refund_status = 'FAILED' WHERE payment_id = $1`,
    [payment.payment_id]
  );

  const { logAuditEvent } = await import('./auditService');
  await logAuditEvent({
    userId: null,
    action: 'REFUND_FAILED',
    entityType: 'Payment',
    entityId: payment.payment_id,
    details: { source: 'webhook', reason: 'Refund failed via Razorpay webhook' },
  });
};

/**
 * Main webhook processor — dispatch to appropriate handler based on event type.
 * Mark event as processed after handling.
 */
export const processWebhookEvent = async (
  razorpayEventId: string,
  eventType: string,
  payload: any
): Promise<void> => {
  switch (eventType) {
    case 'payment.captured':
    case 'payment.authorized':
      await processPaymentCaptured(payload);
      break;
    case 'payment.failed':
      await processPaymentFailed(payload);
      break;
    case 'refund.processed':
    case 'refund.created':
      await processRefundProcessed(payload);
      break;
    case 'refund.failed':
      await processRefundFailed(payload);
      break;
    default:
      // Unknown event type — stored but not processed
      break;
  }

  // Mark event as processed
  await query(
    `UPDATE payment_events SET processed = TRUE, processed_at = CURRENT_TIMESTAMP
     WHERE razorpay_event_id = $1`,
    [razorpayEventId]
  );
};
