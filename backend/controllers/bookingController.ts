import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../services/bookingService';
import { query } from '../config/db';

/**
 * POST /api/v1/bookings - Create a booking (Customer)
 */
export const createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { merchantId, serviceId, bookingDate, bookingTime } = req.body;
    if (!merchantId || !serviceId || !bookingDate || !bookingTime) {
      res.status(400).json({ status: 'error', message: 'merchantId, serviceId, bookingDate, bookingTime are required.' });
      return;
    }

    // Get customer_id from user_id
    let custResult = await query('SELECT customer_id FROM customers WHERE user_id = $1', [req.user!.userId]);
    if (custResult.rows.length === 0) {
      custResult = await query('INSERT INTO customers (user_id) VALUES ($1) RETURNING customer_id', [req.user!.userId]);
    }

    const booking = await bookingService.createBooking({
      customerId: custResult.rows[0].customer_id,
      merchantId, serviceId, bookingDate, bookingTime,
    });
    res.status(201).json({ status: 'success', data: booking });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/bookings/customer - Get my bookings (Customer)
 */
export const getCustomerBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await bookingService.getCustomerBookings(req.user!.userId, page, limit);
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/bookings/merchant - Get my received bookings (Merchant)
 */
export const getMerchantBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await bookingService.getMerchantBookings(req.user!.userId, page, limit);
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error) { next(error); }
};

/**
 * PATCH /api/v1/bookings/:id/reschedule - Reschedule booking (Customer or Merchant)
 */
export const rescheduleBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookingId = parseInt(req.params.id as string, 10);
    const { booking_date, booking_time, bookingDate, bookingTime } = req.body;
    const bDate = booking_date || bookingDate;
    const bTime = booking_time || bookingTime;

    const booking = await bookingService.rescheduleBooking(
      bookingId,
      req.user!.userId,
      bDate,
      bTime
    );
    res.status(200).json({ status: 'success', message: 'Booking rescheduled successfully', data: booking });
  } catch (error) { next(error); }
};

/**
 * PUT /api/v1/bookings/:id/status - Update booking status (Merchant)
 */
export const updateBookingStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookingId = parseInt(req.params.id as string, 10);
    const { status } = req.body;
    const booking = await bookingService.updateBookingStatus(bookingId, req.user!.userId, status);
    res.status(200).json({ status: 'success', data: booking });
  } catch (error) { next(error); }
};

/**
 * PUT /api/v1/bookings/:id/cancel - Cancel booking (Customer)
 */
export const cancelBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookingId = parseInt(req.params.id as string, 10);
    const booking = await bookingService.cancelBooking(bookingId, req.user!.userId);
    res.status(200).json({ status: 'success', data: booking });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/bookings/all - Admin: get all bookings
 */
export const getAllBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await bookingService.getAllBookings(page, limit);
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error) { next(error); }
};
