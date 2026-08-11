import Razorpay from 'razorpay';
import crypto from 'crypto';
import { query } from '../config/db';
import { AppError } from '../middleware/errorHandler';

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set. Payment features will not work.');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

/**
 * Create a Razorpay Order for an accepted booking.
 */
export const createOrder = async (bookingId: number, userId: number) => {
  // 1. Verify booking exists, belongs to customer, and is Accepted
  const bookingResult = await query(
    `SELECT b.booking_id, b.status, s.price, s.service_name
     FROM bookings b
     JOIN services s ON b.service_id = s.service_id
     JOIN customers c ON b.customer_id = c.customer_id
     WHERE b.booking_id = $1 AND c.user_id = $2`,
    [bookingId, userId]
  );

  if (bookingResult.rows.length === 0) {
    throw new AppError('Booking not found or access denied.', 404);
  }

  const booking = bookingResult.rows[0];

  if (booking.status !== 'Accepted') {
    throw new AppError('Payment can only be initiated for accepted bookings.', 400);
  }

  // 2. Check if payment is already completed
  const existingPayment = await query('SELECT payment_id, payment_status FROM payments WHERE booking_id = $1', [bookingId]);
  if (existingPayment.rows.length > 0 && existingPayment.rows[0].payment_status === 'Completed') {
    throw new AppError('Payment has already been completed for this booking.', 409);
  }

  const amountInPaise = Math.round(parseFloat(booking.price) * 100);
  let order;

  try {
    order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_booking_${bookingId}`,
      notes: {
        bookingId: bookingId.toString(),
        serviceName: booking.service_name,
      },
    });
  } catch (err: any) {
    console.warn('Razorpay SDK order creation notice:', err?.error?.description || err.message);
    
    // STRICT FALLBACK ONLY FOR AUTOMATED TESTS (Prevents silent simulation in production/development)
    if (process.env.NODE_ENV === 'test') {
      order = {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        amount: amountInPaise,
        currency: 'INR',
      };
    } else {
      throw new AppError('Failed to create Razorpay order. Please verify your API keys.', 500);
    }
  }

  // 3. Insert or update payment record as Pending
  await query(
    `INSERT INTO payments (booking_id, amount, payment_status, razorpay_order_id, currency)
     VALUES ($1, $2, 'Pending', $3, 'INR')
     ON CONFLICT (booking_id) DO UPDATE SET 
       razorpay_order_id = EXCLUDED.razorpay_order_id,
       payment_status = 'Pending'`,
    [bookingId, booking.price, order.id]
  );

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID || '',
    serviceName: booking.service_name,
    price: booking.price,
  };
};

/**
 * Verify Razorpay payment signature & update database state.
 */
export const verifyPayment = async (
  bookingId: number,
  userId: number,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  paymentMethod?: string
) => {
  // 1. Verify customer ownership
  const check = await query(
    `SELECT b.booking_id, b.status FROM bookings b
     JOIN customers c ON b.customer_id = c.customer_id
     WHERE b.booking_id = $1 AND c.user_id = $2`,
    [bookingId, userId]
  );

  if (check.rows.length === 0) {
    throw new AppError('Booking not found or access denied.', 404);
  }

  // Prevent duplicate verification for already completed payments
  const existingPayment = await query(
    'SELECT payment_status FROM payments WHERE booking_id = $1',
    [bookingId]
  );
  if (existingPayment.rows.length > 0 && existingPayment.rows[0].payment_status === 'Completed') {
    throw new AppError('Payment for this booking has already been verified and completed.', 409);
  }

  // 2. Cryptographic HMAC-SHA256 signature verification
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new AppError('Payment verification unavailable: server configuration error.', 500);
  }
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const isSignatureValid = expectedSignature === razorpaySignature;

  if (!isSignatureValid) {
    await query(
      `UPDATE payments SET payment_status = 'Failed' WHERE booking_id = $1`,
      [bookingId]
    );

    // Audit: PAYMENT_FAILED
    const { logAuditEvent } = await import('./auditService');
    await logAuditEvent({
      userId,
      action: 'PAYMENT_FAILED',
      entityType: 'Payment',
      entityId: bookingId,
      details: { reason: 'Invalid signature' },
    });

    throw new AppError('Payment verification failed: Invalid signature.', 400);
  }

  // 3. Mark payment as Completed in database and record payment method
  const paymentResult = await query(
    `UPDATE payments 
     SET payment_status = 'Completed',
         razorpay_payment_id = $1,
         razorpay_signature = $2,
         transaction_id = $1,
         payment_method = COALESCE($3, payment_method, 'card')
     WHERE booking_id = $4 RETURNING *`,
    [razorpayPaymentId, razorpaySignature, paymentMethod || null, bookingId]
  );

  // Audit: PAYMENT_COMPLETED
  const { logAuditEvent } = await import('./auditService');
  await logAuditEvent({
    userId,
    action: 'PAYMENT_COMPLETED',
    entityType: 'Payment',
    entityId: paymentResult.rows[0].payment_id,
    details: { bookingId, amount: paymentResult.rows[0].amount },
  });

  // Send payment receipt email (non-blocking)
  try {
    const emailInfo = await query(
      `SELECT u.user_id, u.name, u.email, s.service_name
       FROM bookings b
       JOIN customers c ON b.customer_id = c.customer_id
       JOIN users u ON c.user_id = u.user_id
       JOIN services s ON b.service_id = s.service_id
       WHERE b.booking_id = $1`,
      [bookingId]
    );
    if (emailInfo.rows.length > 0) {
      const info = emailInfo.rows[0];
      const { sendPaymentReceipt } = await import('./emailService');
      await sendPaymentReceipt(
        info.user_id, info.email, info.name, info.service_name,
        paymentResult.rows[0].amount?.toString(), razorpayPaymentId
      );
    }
  } catch (emailErr) {
    console.error('Email send failed (payment receipt):', emailErr);
  }

  // Note: We preserve booking.status as 'Accepted' so the merchant can later mark the service as 'Completed' after service delivery.
  return paymentResult.rows[0];
};

/**
 * Get payment history for a customer.
 */
export const getCustomerPayments = async (userId: number) => {
  const result = await query(
    `SELECT p.*, s.service_name, m.business_name, b.booking_date, b.booking_time
     FROM payments p
     JOIN bookings b ON p.booking_id = b.booking_id
     JOIN services s ON b.service_id = s.service_id
     JOIN merchants m ON b.merchant_id = m.merchant_id
     JOIN customers c ON b.customer_id = c.customer_id
     WHERE c.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Get analytics & earnings for a merchant (isolated to logged-in merchant).
 */
export const getMerchantAnalytics = async (userId: number) => {
  const mRes = await query('SELECT merchant_id FROM merchants WHERE user_id = $1', [userId]);
  if (mRes.rows.length === 0) {
    throw new AppError('Merchant profile not found.', 404);
  }
  const merchantId = mRes.rows[0].merchant_id;

  // Booking status aggregations
  const statusRes = await query(
    `SELECT status, COUNT(*)::INT as count
     FROM bookings
     WHERE merchant_id = $1
     GROUP BY status`,
    [merchantId]
  );

  const statusCounts: Record<string, number> = {
    Pending: 0, Accepted: 0, Completed: 0, Cancelled: 0, Rejected: 0
  };
  let totalBookings = 0;
  statusRes.rows.forEach(r => {
    statusCounts[r.status] = r.count;
    totalBookings += r.count;
  });

  // Total revenue from completed payments only
  const revRes = await query(
    `SELECT COALESCE(SUM(p.amount), 0)::FLOAT as total_earnings
     FROM payments p
     JOIN bookings b ON p.booking_id = b.booking_id
     WHERE b.merchant_id = $1 AND p.payment_status = 'Completed'`,
    [merchantId]
  );
  const totalEarnings = revRes.rows[0].total_earnings;

  // Monthly historical revenue breakdown
  const monthlyRes = await query(
    `SELECT TO_CHAR(p.created_at, 'YYYY-MM') as month, SUM(p.amount)::FLOAT as revenue
     FROM payments p
     JOIN bookings b ON p.booking_id = b.booking_id
     WHERE b.merchant_id = $1 AND p.payment_status = 'Completed'
     GROUP BY TO_CHAR(p.created_at, 'YYYY-MM')
     ORDER BY month DESC`,
    [merchantId]
  );

  // Recent completed transactions
  const txRes = await query(
    `SELECT p.*, s.service_name, b.booking_date, u.name as customer_name
     FROM payments p
     JOIN bookings b ON p.booking_id = b.booking_id
     JOIN services s ON b.service_id = s.service_id
     JOIN customers c ON b.customer_id = c.customer_id
     JOIN users u ON c.user_id = u.user_id
     WHERE b.merchant_id = $1 AND p.payment_status = 'Completed'
     ORDER BY p.created_at DESC`,
    [merchantId]
  );

  return {
    totalEarnings,
    totalBookings,
    pendingBookings: statusCounts['Pending'] || 0,
    acceptedBookings: statusCounts['Accepted'] || 0,
    completedBookings: statusCounts['Completed'] || 0,
    cancelledBookings: statusCounts['Cancelled'] || 0,
    rejectedBookings: statusCounts['Rejected'] || 0,
    monthlyRevenue: monthlyRes.rows,
    transactions: txRes.rows,
  };
};

/**
 * Get earnings for a merchant (backward compatibility wrapper).
 */
export const getMerchantEarnings = async (userId: number) => {
  return getMerchantAnalytics(userId);
};

/**
 * Admin: Get system-wide platform analytics.
 */
export const getAdminAnalytics = async () => {
  // User counts
  const userCounts = await query(`
    SELECT 
      COUNT(*)::INT as total_users,
      COUNT(CASE WHEN role_id = 2 THEN 1 END)::INT as total_merchants,
      COUNT(CASE WHEN role_id = 3 THEN 1 END)::INT as total_customers
    FROM users
  `);

  // Service count
  const serviceCount = await query(`SELECT COUNT(*)::INT as total_services FROM services`);

  // Booking metrics by status
  const bookingCounts = await query(`
    SELECT 
      COUNT(*)::INT as total_bookings,
      COUNT(CASE WHEN status = 'Pending' THEN 1 END)::INT as pending_bookings,
      COUNT(CASE WHEN status = 'Accepted' THEN 1 END)::INT as accepted_bookings,
      COUNT(CASE WHEN status = 'Completed' THEN 1 END)::INT as completed_bookings,
      COUNT(CASE WHEN status = 'Cancelled' THEN 1 END)::INT as cancelled_bookings,
      COUNT(CASE WHEN status = 'Rejected' THEN 1 END)::INT as rejected_bookings
    FROM bookings
  `);

  // Payment metrics by status
  const paymentCounts = await query(`
    SELECT 
      COALESCE(SUM(CASE WHEN payment_status = 'Completed' THEN amount ELSE 0 END), 0)::FLOAT as total_payment_volume,
      COUNT(CASE WHEN payment_status = 'Completed' THEN 1 END)::INT as completed_payments_count,
      COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END)::INT as pending_payments_count,
      COUNT(CASE WHEN payment_status = 'Failed' THEN 1 END)::INT as failed_payments_count
    FROM payments
  `);

  // Monthly platform metrics
  const monthlyMetrics = await query(`
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM') as month,
      SUM(CASE WHEN payment_status = 'Completed' THEN amount ELSE 0 END)::FLOAT as payment_volume,
      COUNT(*)::INT as payment_count
    FROM payments
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month DESC
  `);

  return {
    users: userCounts.rows[0],
    services: serviceCount.rows[0].total_services,
    bookings: bookingCounts.rows[0],
    payments: paymentCounts.rows[0],
    monthlyMetrics: monthlyMetrics.rows
  };
};

/**
 * Admin: Get all payments.
 */
export const getAllPayments = async () => {
  const result = await query(
    `SELECT p.*, s.service_name, m.business_name, u.name as customer_name
     FROM payments p
     JOIN bookings b ON p.booking_id = b.booking_id
     JOIN services s ON b.service_id = s.service_id
     JOIN merchants m ON b.merchant_id = m.merchant_id
     JOIN customers c ON b.customer_id = c.customer_id
     JOIN users u ON c.user_id = u.user_id
     ORDER BY p.created_at DESC`
  );
  return result.rows;
};

/**
 * Check refund eligibility for a booking.
 * Backend is authoritative — never trust frontend eligibility claims.
 */
export const checkRefundEligibility = async (bookingId: number) => {
  const result = await query(
    `SELECT b.booking_id, b.status, b.booking_date, b.booking_time,
            p.payment_id, p.payment_status, p.amount, p.razorpay_payment_id,
            p.refund_status
     FROM bookings b
     LEFT JOIN payments p ON b.booking_id = p.booking_id
     WHERE b.booking_id = $1`,
    [bookingId]
  );

  if (result.rows.length === 0) {
    return { eligible: false, reason: 'Booking not found.' };
  }

  const row = result.rows[0];

  // No payment record or payment not completed
  if (!row.payment_id || row.payment_status !== 'Completed') {
    return { eligible: false, reason: 'No completed payment found for this booking.' };
  }

  // Already refunded
  if (row.payment_status === 'Refunded' || row.refund_status === 'PROCESSED') {
    return { eligible: false, reason: 'Payment has already been refunded.' };
  }

  // Refund in progress
  if (row.refund_status === 'PENDING') {
    return { eligible: false, reason: 'Refund is already in progress.' };
  }

  // Booking already completed (service delivered)
  if (row.status === 'Completed') {
    return { eligible: false, reason: 'Cannot refund a completed booking.' };
  }

  // Check if booking time is in the future
  const bookingDateTime = new Date(`${row.booking_date.toISOString().split('T')[0]}T${row.booking_time}`);
  const now = new Date();

  if (bookingDateTime <= now) {
    return { eligible: false, reason: 'Booking time has already passed. Refund not available.' };
  }

  return {
    eligible: true,
    reason: 'Booking cancelled before scheduled service time. Full refund eligible.',
    amount: parseFloat(row.amount),
    razorpayPaymentId: row.razorpay_payment_id,
    paymentId: row.payment_id,
  };
};

/**
 * Initiate a Razorpay refund for a paid booking.
 * Refund amount is always FULL and derived from verified payment record.
 * Never accepts arbitrary frontend amount.
 */
export const initiateRefund = async (bookingId: number, userId: number) => {
  // 1. Verify customer or merchant ownership
  const ownerCheck = await query(
    `SELECT b.booking_id, b.status, b.merchant_id,
            c.user_id as customer_user_id, m.user_id as merchant_user_id,
            p.payment_id, p.payment_status, p.amount, p.razorpay_payment_id,
            p.refund_status
     FROM bookings b
     JOIN customers c ON b.customer_id = c.customer_id
     JOIN merchants m ON b.merchant_id = m.merchant_id
     LEFT JOIN payments p ON b.booking_id = p.booking_id
     WHERE b.booking_id = $1`,
    [bookingId]
  );

  if (ownerCheck.rows.length === 0) {
    throw new AppError('Booking not found.', 404);
  }

  const bk = ownerCheck.rows[0];

  // Authorization: must be the customer or the merchant
  if (bk.customer_user_id !== userId && bk.merchant_user_id !== userId) {
    throw new AppError('Unauthorized to initiate refund for this booking.', 403);
  }

  // 2. Guard conditions
  if (!bk.payment_id || bk.payment_status !== 'Completed') {
    throw new AppError('No completed payment found for this booking.', 400);
  }

  if (bk.payment_status === 'Refunded' || bk.refund_status === 'PROCESSED') {
    throw new AppError('Refund has already been processed for this payment.', 409);
  }

  if (bk.refund_status === 'PENDING') {
    throw new AppError('Refund is already in progress.', 409);
  }

  if (bk.status === 'Completed') {
    throw new AppError('Cannot refund a completed booking.', 400);
  }

  // 3. Mark refund as PENDING before making external call (prevents duplicate race)
  await query(
    `UPDATE payments SET refund_status = 'PENDING' WHERE payment_id = $1`,
    [bk.payment_id]
  );

  // 4. Attempt Razorpay refund via SDK
  const refundAmountInPaise = Math.round(parseFloat(bk.amount) * 100);
  let razorpayRefundId: string | null = null;
  let refundSuccess = false;

  try {
    const refund = await razorpay.payments.refund(bk.razorpay_payment_id, {
      amount: refundAmountInPaise,
      notes: {
        bookingId: bookingId.toString(),
        reason: 'Booking cancellation refund',
      },
    });
    razorpayRefundId = refund.id;
    refundSuccess = true;
  } catch (err: any) {
    console.warn('Razorpay refund API notice:', err?.error?.description || err.message);
    
    // STRICT FALLBACK ONLY FOR AUTOMATED TESTS (Prevents silent simulation in production/development)
    if (process.env.NODE_ENV === 'test') {
      razorpayRefundId = `rfnd_test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      refundSuccess = true;
      console.log('Test-mode refund ID generated:', razorpayRefundId);
    } else {
      // If we aren't in tests, a failed refund is a real failure. We must throw to abort the transaction.
      // (The payment_status remains Completed, and refund_status remains PENDING or fails later based on webhooks).
      // Since this is a synchronous failure, we revert the PENDING state.
      await query(`UPDATE payments SET refund_status = 'FAILED' WHERE payment_id = $1`, [bk.payment_id]);
      throw new AppError('Failed to initiate Razorpay refund. Please verify your API keys or try again.', 500);
    }
  }

  if (refundSuccess && razorpayRefundId) {
    // 5. Update payment record with successful refund
    await query(
      `UPDATE payments
       SET payment_status = 'Refunded',
           refund_status = 'PROCESSED',
           razorpay_refund_id = $1,
           refund_amount = $2,
           refund_reason = 'Booking cancellation refund',
           refunded_at = CURRENT_TIMESTAMP
       WHERE payment_id = $3`,
      [razorpayRefundId, bk.amount, bk.payment_id]
    );

    // Send refund notification email (non-blocking)
    try {
      const emailInfo = await query(
        `SELECT u.user_id, u.name, u.email, s.service_name
         FROM bookings b
         JOIN customers c ON b.customer_id = c.customer_id
         JOIN users u ON c.user_id = u.user_id
         JOIN services s ON b.service_id = s.service_id
         WHERE b.booking_id = $1`,
        [bookingId]
      );
      if (emailInfo.rows.length > 0) {
        const info = emailInfo.rows[0];
        const { sendRefundNotification } = await import('./emailService');
        await sendRefundNotification(
          info.user_id, info.email, info.name, info.service_name,
          bk.amount?.toString(), razorpayRefundId!
        );
      }
    } catch (emailErr) {
      console.error('Email send failed (refund notification):', emailErr);
    }

    return {
      success: true,
      refundId: razorpayRefundId,
      refundAmount: parseFloat(bk.amount),
      paymentId: bk.payment_id,
      bookingId,
    };
  } else {
    // 6. Refund failed — roll back to FAILED status
    await query(
      `UPDATE payments SET refund_status = 'FAILED' WHERE payment_id = $1`,
      [bk.payment_id]
    );

    throw new AppError('Refund request failed. Please try again later.', 500);
  }
};
