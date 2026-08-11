import { Router } from 'express';
import {
  createBooking, getCustomerBookings, getMerchantBookings,
  updateBookingStatus, cancelBooking, getAllBookings, rescheduleBooking
} from '../controllers/bookingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Customer & Merchant Reschedule Route
router.patch('/:id/reschedule', authenticate, authorize('Customer', 'Merchant'), rescheduleBooking);
router.put('/:id/reschedule', authenticate, authorize('Customer', 'Merchant'), rescheduleBooking);

// Customer routes
router.post('/', authenticate, authorize('Customer'), createBooking);
router.get('/customer', authenticate, authorize('Customer'), getCustomerBookings);
router.put('/:id/cancel', authenticate, authorize('Customer'), cancelBooking);

// Merchant routes
router.get('/merchant', authenticate, authorize('Merchant'), getMerchantBookings);
router.put('/:id/status', authenticate, authorize('Merchant'), updateBookingStatus);

// Admin routes
router.get('/all', authenticate, authorize('Admin'), getAllBookings);

export default router;
