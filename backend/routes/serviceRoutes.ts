import { Router } from 'express';
import { addService, updateService, deleteService, getServicesByMerchant, getServiceById, listAllServices, uploadImage, removeImage } from '../controllers/serviceController';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Public routes
router.get('/', listAllServices);
router.get('/:id', getServiceById);
router.get('/merchant/:merchantId', getServicesByMerchant);

// Merchant routes (authenticated)
router.post('/', authenticate, authorize('Merchant'), addService);
router.put('/:id', authenticate, authorize('Merchant'), updateService);
router.delete('/:id', authenticate, authorize('Merchant'), deleteService);

// Image upload routes
router.post('/:id/image', authenticate, authorize('Merchant'), upload.single('image'), uploadImage);
router.delete('/:id/image', authenticate, authorize('Merchant'), removeImage);

export default router;
