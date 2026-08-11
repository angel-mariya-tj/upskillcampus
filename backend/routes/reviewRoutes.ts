import { Router } from 'express';
import { addReview, getMerchantReviews, getCustomerReviews } from '../controllers/reviewController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/merchant/:merchantId', getMerchantReviews);
router.get('/customer/me', authenticate, authorize('Customer'), getCustomerReviews);
router.post('/', authenticate, authorize('Customer'), addReview);

export default router;
