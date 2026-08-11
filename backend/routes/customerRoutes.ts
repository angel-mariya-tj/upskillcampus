import { Router } from 'express';
import { addFavorite, removeFavorite, getFavorites, updateProfile } from '../controllers/customerController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Customer authenticated routes
router.use(authenticate, authorize('Customer'));

router.put('/profile', updateProfile);
router.get('/favorites', getFavorites);
router.post('/favorites/:serviceId', addFavorite);
router.delete('/favorites/:serviceId', removeFavorite);

export default router;
