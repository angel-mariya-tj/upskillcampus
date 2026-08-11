import { query } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { parsePaginationParams, buildPaginatedResponse } from '../utils/pagination';

interface CreateBookingInput {
  customerId: number;
  merchantId: number;
  serviceId: number;
  bookingDate: string;
  bookingTime: string;
}

/**
 * Create a new booking.
 */
export const createBooking = async (input: CreateBookingInput) => {
  const { customerId, merchantId, serviceId, bookingDate, bookingTime } = input;

  // Validate that requested booking date/time is in the future
  let formattedTime = (bookingTime || '').trim();
  if (/^\d:\d{2}/.test(formattedTime)) {
    formattedTime = '0' + formattedTime;
  }
  
  let bookingDateTime: Date;
  if (bookingDate && formattedTime) {
    const [year, month, day] = bookingDate.split('-').map(Number);
    const [hours, minutes] = formattedTime.split(':').map(Number);
    bookingDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0);
  } else {
    bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
  }

  const now = new Date();

  if (isNaN(bookingDateTime.getTime())) {
    throw new AppError('Invalid booking date or time format.', 400);
  }

  // Allow bookings up to 5 minutes buffer for current time slot selection
  if (bookingDateTime.getTime() < now.getTime() - 5 * 60 * 1000) {
    throw new AppError('Booking date and time must be in the future.', 400);
  }

  // Verify service exists and belongs to the merchant
  const svcCheck = await query(
    'SELECT service_id, price FROM services WHERE service_id = $1 AND merchant_id = $2 AND availability = true',
    [serviceId, merchantId]
  );
  if (svcCheck.rows.length === 0) {
    throw new AppError('Service not found or not available.', 404);
  }

  // Check for double booking (same merchant, date, time)
  const conflict = await query(
    `SELECT booking_id FROM bookings
     WHERE merchant_id = $1 AND booking_date = $2 AND booking_time = $3 AND status NOT IN ('Rejected', 'Cancelled')`,
    [merchantId, bookingDate, bookingTime]
  );
  if (conflict.rows.length > 0) {
    throw new AppError('This time slot is already booked. Please choose another time.', 409);
  }

  const result = await query(
    `INSERT INTO bookings (customer_id, merchant_id, service_id, booking_date, booking_time, status)
     VALUES ($1, $2, $3, $4, $5, 'Pending') RETURNING *`,
    [customerId, merchantId, serviceId, bookingDate, bookingTime]
  );

  // Send booking confirmation email (non-blocking)
  try {
    const emailInfo = await query(
      `SELECT u.user_id, u.name, u.email, s.service_name, s.price, m.business_name
       FROM customers c
       JOIN users u ON c.user_id = u.user_id
       JOIN services s ON s.service_id = $1
       JOIN merchants m ON m.merchant_id = $2
       WHERE c.customer_id = $3`,
      [serviceId, merchantId, customerId]
    );
    if (emailInfo.rows.length > 0) {
      const info = emailInfo.rows[0];
      const { sendBookingConfirmation } = await import('./emailService');
      await sendBookingConfirmation(
        info.user_id, info.email, info.name, info.service_name,
        info.business_name, bookingDate, bookingTime, info.price?.toString()
      );
    }
  } catch (emailErr) {
    console.error('Email send failed (booking confirmation):', emailErr);
  }

  return result.rows[0];
};

/**
 * Get bookings for a customer (paginated).
 */
export const getCustomerBookings = async (userId: number, page?: number, limit?: number) => {
  const paginationParams = parsePaginationParams(page, limit);

  const baseWhere = ` FROM bookings b
                     JOIN services s ON b.service_id = s.service_id
                     JOIN merchants m ON b.merchant_id = m.merchant_id
                     JOIN customers c ON b.customer_id = c.customer_id
                     LEFT JOIN payments p ON b.booking_id = p.booking_id
                     WHERE c.user_id = $1`;

  const countRes = await query(`SELECT COUNT(*)` + baseWhere, [userId]);
  const total = parseInt(countRes.rows[0].count, 10);

  const sql = `SELECT b.*, s.service_name, s.price, s.duration, m.business_name, m.address, p.payment_status` +
              baseWhere +
              ` ORDER BY b.booking_date DESC, b.booking_time DESC LIMIT $2 OFFSET $3`;

  const result = await query(sql, [userId, paginationParams.limit, paginationParams.offset]);
  return buildPaginatedResponse(result.rows, total, paginationParams);
};

/**
 * Get bookings for a merchant (paginated).
 */
export const getMerchantBookings = async (userId: number, page?: number, limit?: number) => {
  const paginationParams = parsePaginationParams(page, limit);

  const baseWhere = ` FROM bookings b
                     JOIN services s ON b.service_id = s.service_id
                     JOIN customers c ON b.customer_id = c.customer_id
                     JOIN users u ON c.user_id = u.user_id
                     JOIN merchants m ON b.merchant_id = m.merchant_id
                     WHERE m.user_id = $1`;

  const countRes = await query(`SELECT COUNT(*)` + baseWhere, [userId]);
  const total = parseInt(countRes.rows[0].count, 10);

  const sql = `SELECT b.*, s.service_name, s.price, s.duration, u.name as customer_name, u.phone as customer_phone` +
              baseWhere +
              ` ORDER BY b.booking_date DESC, b.booking_time DESC LIMIT $2 OFFSET $3`;

  const result = await query(sql, [userId, paginationParams.limit, paginationParams.offset]);
  return buildPaginatedResponse(result.rows, total, paginationParams);
};

/**
 * Reschedule a booking (Customer or Merchant action).
 */
export const rescheduleBooking = async (
  bookingId: number,
  userId: number,
  newDate: string,
  newTime: string
) => {
  if (!newDate || !newTime) {
    throw new AppError('booking_date and booking_time are required.', 400);
  }

  // 1. Verify future date/time
  const newDateTime = new Date(`${newDate}T${newTime}`);
  if (isNaN(newDateTime.getTime()) || newDateTime < new Date()) {
    throw new AppError('Booking date and time must be in the future.', 400);
  }

  // 2. Fetch booking record and verify authorization
  const check = await query(
    `SELECT b.booking_id, b.merchant_id, b.status, c.user_id as customer_user_id, m.user_id as merchant_user_id
     FROM bookings b
     JOIN customers c ON b.customer_id = c.customer_id
     JOIN merchants m ON b.merchant_id = m.merchant_id
     WHERE b.booking_id = $1`,
    [bookingId]
  );

  if (check.rows.length === 0) {
    throw new AppError('Booking not found.', 404);
  }

  const bk = check.rows[0];

  // Authorization check: User must be the customer OR the merchant of this booking
  const isCustomerOwner = bk.customer_user_id === userId;
  const isMerchantOwner = bk.merchant_user_id === userId;

  if (!isCustomerOwner && !isMerchantOwner) {
    throw new AppError('Unauthorized to reschedule this booking.', 403);
  }

  // 3. Status eligibility check (only Pending or Accepted)
  if (['Completed', 'Cancelled', 'Rejected'].includes(bk.status)) {
    throw new AppError(`Cannot reschedule a ${bk.status} booking.`, 400);
  }

  // 4. Slot conflict check (exclude current booking ID)
  const conflict = await query(
    `SELECT booking_id FROM bookings
     WHERE merchant_id = $1 AND booking_date = $2 AND booking_time = $3
       AND booking_id != $4 AND status NOT IN ('Rejected', 'Cancelled')`,
    [bk.merchant_id, newDate, newTime, bookingId]
  );

  if (conflict.rows.length > 0) {
    throw new AppError('This time slot is already booked for this merchant. Please choose another slot.', 409);
  }

  // 5. Update booking date and time while preserving status and payment_status
  const result = await query(
    `UPDATE bookings
     SET booking_date = $1, booking_time = $2
     WHERE booking_id = $3
     RETURNING *`,
    [newDate, newTime, bookingId]
  );

  // Audit: BOOKING_RESCHEDULED
  const { logAuditEvent } = await import('./auditService');
  await logAuditEvent({
    userId,
    action: 'BOOKING_RESCHEDULED',
    entityType: 'Booking',
    entityId: bookingId,
    details: { newDate, newTime },
  });

  return result.rows[0];
};

/**
 * Update booking status (merchant action: Accept, Reject, Complete).
 */
export const updateBookingStatus = async (bookingId: number, userId: number, status: string) => {
  const validStatuses = ['Accepted', 'Rejected', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const check = await query(
    `SELECT b.booking_id, b.status FROM bookings b
     JOIN merchants m ON b.merchant_id = m.merchant_id
     WHERE b.booking_id = $1 AND m.user_id = $2`,
    [bookingId, userId]
  );

  if (check.rows.length === 0) {
    throw new AppError('Booking not found or access denied.', 404);
  }

  const currentStatus = check.rows[0].status;

  // Enforce logical state transitions
  if (currentStatus === 'Completed' || currentStatus === 'Cancelled' || currentStatus === 'Rejected') {
    throw new AppError(`Cannot change status of a ${currentStatus} booking.`, 400);
  }

  if (currentStatus === 'Pending' && !['Accepted', 'Rejected'].includes(status)) {
    throw new AppError('Pending bookings can only be Accepted or Rejected.', 400);
  }

  if (currentStatus === 'Accepted' && status !== 'Completed') {
    throw new AppError('Accepted bookings can only be marked as Completed.', 400);
  }

  const result = await query(
    'UPDATE bookings SET status = $1 WHERE booking_id = $2 RETURNING *',
    [status, bookingId]
  );

  // Audit: BOOKING_STATUS_CHANGED
  const { logAuditEvent } = await import('./auditService');
  await logAuditEvent({
    userId,
    action: 'BOOKING_STATUS_CHANGED',
    entityType: 'Booking',
    entityId: bookingId,
    details: { previousStatus: currentStatus, newStatus: status },
  });

  // Send booking status update email to customer (non-blocking)
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
      const { sendBookingStatusUpdate } = await import('./emailService');
      await sendBookingStatusUpdate(info.user_id, info.email, info.name, info.service_name, status);
    }
  } catch (emailErr) {
    console.error('Email send failed (booking status update):', emailErr);
  }

  return result.rows[0];
};

/**
 * Cancel booking (customer action).
 * Integrates Razorpay refund policy and audit logging.
 */
export const cancelBooking = async (bookingId: number, userId: number) => {
  // 1. Verify booking exists and belongs to customer
  const check = await query(
    `SELECT b.booking_id, b.status, b.booking_date, b.booking_time,
            p.payment_id, p.payment_status, p.amount, p.razorpay_payment_id, p.refund_status
     FROM bookings b
     JOIN customers c ON b.customer_id = c.customer_id
     LEFT JOIN payments p ON b.booking_id = p.booking_id
     WHERE b.booking_id = $1 AND c.user_id = $2`,
    [bookingId, userId]
  );

  if (check.rows.length === 0) {
    throw new AppError('Booking not found or access denied.', 404);
  }

  const bk = check.rows[0];

  if (['Completed', 'Cancelled', 'Rejected'].includes(bk.status)) {
    throw new AppError(`Cannot cancel a ${bk.status} booking.`, 400);
  }

  const previousStatus = bk.status;

  // 2. Cancel the booking
  await query(
    "UPDATE bookings SET status = 'Cancelled' WHERE booking_id = $1",
    [bookingId]
  );

  let refundResult: any = null;

  // 3. Determine refund eligibility for PAID bookings
  if (bk.payment_status === 'Completed' && bk.refund_status !== 'PROCESSED' && bk.refund_status !== 'PENDING') {
    // Check if booking time is in the future (eligible for refund)
    const bookingDateTime = new Date(`${bk.booking_date.toISOString().split('T')[0]}T${bk.booking_time}`);
    const now = new Date();

    if (bookingDateTime > now) {
      // Eligible for full refund — initiate via paymentService
      try {
        const { initiateRefund } = await import('./paymentService');
        refundResult = await initiateRefund(bookingId, userId);

        // Audit: REFUND_PROCESSED
        const { logAuditEvent } = await import('./auditService');
        await logAuditEvent({
          userId,
          action: 'REFUND_PROCESSED',
          entityType: 'Payment',
          entityId: refundResult.paymentId,
          details: {
            bookingId,
            refundAmount: refundResult.refundAmount,
            razorpayRefundId: refundResult.refundId,
          },
        });
      } catch (refundErr: any) {
        // Refund failed, but booking is already cancelled
        console.error('Refund initiation failed during cancellation:', refundErr.message);

        // Audit: REFUND_FAILED
        const { logAuditEvent } = await import('./auditService');
        await logAuditEvent({
          userId,
          action: 'REFUND_FAILED',
          entityType: 'Payment',
          entityId: bk.payment_id || 0,
          details: { bookingId, reason: refundErr.message },
        });
      }
    } else {
      // Past booking time — no refund
      // Update payment refund_status to indicate expired eligibility
      if (bk.payment_id) {
        await query(
          `UPDATE payments SET refund_status = 'REFUND_EXPIRED' WHERE payment_id = $1`,
          [bk.payment_id]
        );
      }
    }
  }

  // 4. Audit: BOOKING_CANCELLED
  const { logAuditEvent } = await import('./auditService');
  await logAuditEvent({
    userId,
    action: 'BOOKING_CANCELLED',
    entityType: 'Booking',
    entityId: bookingId,
    details: {
      previousStatus,
      refundIssued: !!refundResult,
      refundAmount: refundResult?.refundAmount || null,
    },
  });

  // 5. Fetch and return updated booking
  const result = await query('SELECT * FROM bookings WHERE booking_id = $1', [bookingId]);
  return {
    ...result.rows[0],
    refund: refundResult || null,
  };
};

/**
 * Admin: Get all bookings (paginated).
 */
export const getAllBookings = async (page?: number, limit?: number) => {
  const paginationParams = parsePaginationParams(page, limit);

  const baseWhere = ` FROM bookings b
                     JOIN services s ON b.service_id = s.service_id
                     JOIN merchants m ON b.merchant_id = m.merchant_id
                     JOIN customers c ON b.customer_id = c.customer_id
                     JOIN users u ON c.user_id = u.user_id`;

  const countRes = await query(`SELECT COUNT(*)` + baseWhere);
  const total = parseInt(countRes.rows[0].count, 10);

  const sql = `SELECT b.*, s.service_name, s.price, m.business_name, u.name as customer_name` +
              baseWhere +
              ` ORDER BY b.created_at DESC LIMIT $1 OFFSET $2`;

  const result = await query(sql, [paginationParams.limit, paginationParams.offset]);
  return buildPaginatedResponse(result.rows, total, paginationParams);
};
