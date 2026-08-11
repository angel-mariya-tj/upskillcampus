import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/paymentService';

/**
 * POST /api/v1/payments/create-order - Create Razorpay Order (Customer)
 */
export const createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      res.status(400).json({ status: 'error', message: 'bookingId is required.' });
      return;
    }
    const orderData = await paymentService.createOrder(parseInt(bookingId, 10), req.user!.userId);
    res.status(201).json({ status: 'success', data: orderData });
  } catch (error) { next(error); }
};

/**
 * POST /api/v1/payments/verify - Verify Razorpay Payment Signature (Customer)
 */
export const verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod } = req.body;
    if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.status(400).json({
        status: 'error',
        message: 'bookingId, razorpayOrderId, razorpayPaymentId, and razorpaySignature are required.',
      });
      return;
    }
    const payment = await paymentService.verifyPayment(
      parseInt(bookingId, 10),
      req.user!.userId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod
    );
    res.status(200).json({ status: 'success', data: payment });
  } catch (error) { next(error); }
};


/**
 * GET /api/v1/payments/customer - Get customer payment history
 */
export const getCustomerPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payments = await paymentService.getCustomerPayments(req.user!.userId);
    res.status(200).json({ status: 'success', data: payments });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/payments/earnings - Get merchant earnings
 */
export const getMerchantEarnings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const earnings = await paymentService.getMerchantEarnings(req.user!.userId);
    res.status(200).json({ status: 'success', data: earnings });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/payments/admin/analytics - Admin: get platform analytics
 */
export const getAdminAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const analytics = await paymentService.getAdminAnalytics();
    res.status(200).json({ status: 'success', data: analytics });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/payments/all - Admin: get all payments
 */
export const getAllPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payments = await paymentService.getAllPayments();
    res.status(200).json({ status: 'success', data: payments });
  } catch (error) { next(error); }
};

/**
 * POST /api/v1/payments/:bookingId/refund - Initiate refund (Customer or Merchant)
 */
export const initiateRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookingId = parseInt(req.params.bookingId as string, 10);
    if (isNaN(bookingId)) {
      res.status(400).json({ status: 'error', message: 'Valid bookingId is required.' });
      return;
    }
    const result = await paymentService.initiateRefund(bookingId, req.user!.userId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/payments/:bookingId/refund-eligibility - Check refund eligibility
 */
export const checkRefundEligibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookingId = parseInt(req.params.bookingId as string, 10);
    if (isNaN(bookingId)) {
      res.status(400).json({ status: 'error', message: 'Valid bookingId is required.' });
      return;
    }
    const result = await paymentService.checkRefundEligibility(bookingId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};
