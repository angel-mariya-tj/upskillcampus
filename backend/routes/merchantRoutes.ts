import { Router } from 'express';
import { createProfile, updateProfile, listMerchants, getMerchantById, getMyProfile, updateApprovalStatus, listAllMerchants } from '../controllers/merchantController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', listMerchants);
router.get('/:id', getMerchantById);

// Merchant routes (authenticated)
router.get('/profile/me', authenticate, authorize('Merchant'), getMyProfile);
router.post('/', authenticate, authorize('Merchant'), createProfile);
router.put('/:id', authenticate, authorize('Merchant'), updateProfile);

// Admin routes
router.get('/admin/all', authenticate, authorize('Admin'), listAllMerchants);
router.put('/:id/approve', authenticate, authorize('Admin'), updateApprovalStatus);

export default router;
