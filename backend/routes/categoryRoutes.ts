import { Router } from 'express';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', listCategories);
router.post('/', authenticate, authorize('Admin'), createCategory);
router.put('/:id', authenticate, authorize('Admin'), updateCategory);
router.delete('/:id', authenticate, authorize('Admin'), deleteCategory);

export default router;
