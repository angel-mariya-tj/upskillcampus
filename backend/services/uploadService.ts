import path from 'path';
import fs from 'fs';
import { query } from '../config/db';
import { AppError } from '../middleware/errorHandler';

/**
 * Update a service's image URL.
 * Only the owning merchant can update.
 */
export const updateServiceImage = async (serviceId: number, merchantId: number, filename: string) => {
  // Verify ownership
  const ownership = await query(
    'SELECT service_id, image FROM services WHERE service_id = $1 AND merchant_id = $2',
    [serviceId, merchantId]
  );
  
  if (ownership.rows.length === 0) {
    throw new AppError('Service not found or access denied.', 404);
  }

  const oldImage = ownership.rows[0].image;
  const imageUrl = `/uploads/${filename}`;

  const result = await query(
    `UPDATE services SET image = $1 WHERE service_id = $2 RETURNING *`,
    [imageUrl, serviceId]
  );

  // Attempt to delete old image if it exists and is a local upload
  if (oldImage && oldImage.startsWith('/uploads/')) {
    try {
      const oldFilename = oldImage.replace('/uploads/', '');
      const oldPath = path.resolve(process.cwd(), 'uploads', oldFilename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    } catch (err) {
      console.error('Failed to delete old image:', err);
    }
  }

  return result.rows[0];
};

/**
 * Delete a service's image.
 * Only the owning merchant can delete.
 */
export const deleteServiceImage = async (serviceId: number, merchantId: number) => {
  // Verify ownership
  const ownership = await query(
    'SELECT service_id, image FROM services WHERE service_id = $1 AND merchant_id = $2',
    [serviceId, merchantId]
  );
  
  if (ownership.rows.length === 0) {
    throw new AppError('Service not found or access denied.', 404);
  }

  const oldImage = ownership.rows[0].image;

  if (!oldImage) {
    return { message: 'No image to delete.' };
  }

  await query(
    `UPDATE services SET image = NULL WHERE service_id = $1`,
    [serviceId]
  );

  // Attempt to delete image if it's a local upload
  if (oldImage.startsWith('/uploads/')) {
    try {
      const oldFilename = oldImage.replace('/uploads/', '');
      const oldPath = path.resolve(process.cwd(), 'uploads', oldFilename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    } catch (err) {
      console.error('Failed to delete old image:', err);
    }
  }

  return { message: 'Image deleted successfully.' };
};
