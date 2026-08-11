import { query } from '../config/db';
import { AppError } from '../middleware/errorHandler';

/**
 * List all categories.
 */
export const listCategories = async () => {
  const result = await query('SELECT * FROM categories ORDER BY category_name ASC');
  return result.rows;
};

/**
 * Create a new category (Admin only).
 */
export const createCategory = async (categoryName: string, description?: string) => {
  const existing = await query('SELECT category_id FROM categories WHERE category_name = $1', [categoryName]);
  if (existing.rows.length > 0) {
    throw new AppError('Category already exists.', 409);
  }

  const result = await query(
    'INSERT INTO categories (category_name, description) VALUES ($1, $2) RETURNING *',
    [categoryName, description || null]
  );

  return result.rows[0];
};

/**
 * Update a category (Admin only).
 */
export const updateCategory = async (categoryId: number, categoryName?: string, description?: string) => {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (categoryName) { fields.push(`category_name = $${idx++}`); values.push(categoryName); }
  if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }

  if (fields.length === 0) {
    throw new AppError('No fields provided for update.', 400);
  }

  values.push(categoryId);
  const result = await query(
    `UPDATE categories SET ${fields.join(', ')} WHERE category_id = $${idx} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Category not found.', 404);
  }

  return result.rows[0];
};

/**
 * Delete a category (Admin only).
 */
export const deleteCategory = async (categoryId: number) => {
  const result = await query(
    'DELETE FROM categories WHERE category_id = $1 RETURNING category_id',
    [categoryId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Category not found.', 404);
  }

  return { message: 'Category deleted successfully.' };
};
