import { Router } from 'express';
import { createOrder, verifyPayment, getCustomerPayments, getMerchantEarnings, getAllPayments, getAdminAnalytics, initiateRefund, checkRefundEligibility } from '../controllers/paymentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/create-order', authenticate, authorize('Customer'), createOrder);
router.post('/verify', authenticate, authorize('Customer'), verifyPayment);
router.get('/customer', authenticate, authorize('Customer'), getCustomerPayments);
router.get('/earnings', authenticate, authorize('Merchant'), getMerchantEarnings);
router.get('/admin/analytics', authenticate, authorize('Admin'), getAdminAnalytics);
router.get('/all', authenticate, authorize('Admin'), getAllPayments);

// Refund endpoints (Customer or Merchant authorized within service layer)
router.get('/:bookingId/refund-eligibility', authenticate, checkRefundEligibility);
router.post('/:bookingId/refund', authenticate, initiateRefund);

export default router;
