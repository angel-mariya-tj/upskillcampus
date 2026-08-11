import { Request, Response, NextFunction } from 'express';
import * as reviewService from '../services/reviewService';

/**
 * POST /api/v1/reviews - Add a review (Customer)
 */
export const addReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { merchantId, rating, comment } = req.body;
    if (!merchantId || !rating) {
      res.status(400).json({ status: 'error', message: 'merchantId and rating are required.' });
      return;
    }
    if (rating < 1 || rating > 5) {
      res.status(400).json({ status: 'error', message: 'Rating must be between 1 and 5.' });
      return;
    }
    const review = await reviewService.addReview(req.user!.userId, merchantId, rating, comment);
    res.status(201).json({ status: 'success', data: review });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/reviews/merchant/:merchantId - Get reviews for a merchant (public)
 */
export const getMerchantReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = parseInt(req.params.merchantId as string, 10);
    const reviews = await reviewService.getMerchantReviews(merchantId);
    res.status(200).json({ status: 'success', data: reviews });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/reviews/customer/me - Get reviews by current customer
 */
export const getCustomerReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reviews = await reviewService.getCustomerReviews(req.user!.userId);
    res.status(200).json({ status: 'success', data: reviews });
  } catch (error) { next(error); }
};
