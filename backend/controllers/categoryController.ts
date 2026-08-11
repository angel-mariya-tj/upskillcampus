import { Request, Response, NextFunction } from 'express';
import * as categoryService from '../services/categoryService';

/**
 * GET /api/v1/categories - List all categories (public)
 */
export const listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await categoryService.listCategories();
    res.status(200).json({ status: 'success', data: categories });
  } catch (error) { next(error); }
};

/**
 * POST /api/v1/categories - Create category (Admin)
 */
export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { categoryName, description } = req.body;
    if (!categoryName) {
      res.status(400).json({ status: 'error', message: 'categoryName is required.' });
      return;
    }
    const category = await categoryService.createCategory(categoryName, description);
    res.status(201).json({ status: 'success', data: category });
  } catch (error) { next(error); }
};

/**
 * PUT /api/v1/categories/:id - Update category (Admin)
 */
export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.id as string, 10);
    const { categoryName, description } = req.body;
    const category = await categoryService.updateCategory(categoryId, categoryName, description);
    res.status(200).json({ status: 'success', data: category });
  } catch (error) { next(error); }
};

/**
 * DELETE /api/v1/categories/:id - Delete category (Admin)
 */
export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.id as string, 10);
    const result = await categoryService.deleteCategory(categoryId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};
