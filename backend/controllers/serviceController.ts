import { Request, Response, NextFunction } from 'express';
import * as serviceService from '../services/serviceService';
import { query } from '../config/db';

// Helper to get merchant_id from the logged-in user
const getMerchantId = async (userId: number): Promise<number> => {
  const result = await query('SELECT merchant_id FROM merchants WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) throw new Error('Merchant profile not found.');
  return result.rows[0].merchant_id;
};

/**
 * POST /api/v1/services - Add a service
 */
export const addService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = await getMerchantId(req.user!.userId);
    const { serviceName, description, price, duration, image } = req.body;
    if (!serviceName || price === undefined || duration === undefined) {
      res.status(400).json({ status: 'error', message: 'serviceName, price, and duration are required.' });
      return;
    }
    const service = await serviceService.addService({ merchantId, serviceName, description, price, duration, image });
    res.status(201).json({ status: 'success', data: service });
  } catch (error) { next(error); }
};

/**
 * PUT /api/v1/services/:id - Update a service
 */
export const updateService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = await getMerchantId(req.user!.userId);
    const serviceId = parseInt(req.params.id as string, 10);
    const service = await serviceService.updateService(serviceId, merchantId, req.body);
    res.status(200).json({ status: 'success', data: service });
  } catch (error) { next(error); }
};

/**
 * DELETE /api/v1/services/:id - Delete a service
 */
export const deleteService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = await getMerchantId(req.user!.userId);
    const serviceId = parseInt(req.params.id as string, 10);
    const result = await serviceService.deleteService(serviceId, merchantId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/services/merchant/:merchantId - Get services by merchant (public)
 */
export const getServicesByMerchant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = parseInt(req.params.merchantId as string, 10);
    const services = await serviceService.getServicesByMerchant(merchantId);
    res.status(200).json({ status: 'success', data: services });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/services/:id - Get service by ID (public)
 */
export const getServiceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const serviceId = parseInt(req.params.id as string, 10);
    const service = await serviceService.getServiceById(serviceId);
    res.status(200).json({ status: 'success', data: service });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/services - List all services (public)
 */
export const listAllServices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined;
    const search = req.query.search as string | undefined;
    const minPrice = req.query.minPrice !== undefined && req.query.minPrice !== '' ? parseFloat(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice !== undefined && req.query.maxPrice !== '' ? parseFloat(req.query.maxPrice as string) : undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await serviceService.listAllServices(categoryId, search, minPrice, maxPrice, sortBy, page, limit);
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error) { next(error); }
};

/**
 * POST /api/v1/services/:id/image - Upload service image
 */
export const uploadImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = await getMerchantId(req.user!.userId);
    const serviceId = parseInt(req.params.id as string, 10);
    
    if (!req.file) {
      res.status(400).json({ status: 'error', message: 'No image file provided.' });
      return;
    }

    const { updateServiceImage } = await import('../services/uploadService');
    const service = await updateServiceImage(serviceId, merchantId, req.file.filename);
    
    res.status(200).json({ status: 'success', data: service });
  } catch (error) { next(error); }
};

/**
 * DELETE /api/v1/services/:id/image - Delete service image
 */
export const removeImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = await getMerchantId(req.user!.userId);
    const serviceId = parseInt(req.params.id as string, 10);
    
    const { deleteServiceImage } = await import('../services/uploadService');
    const result = await deleteServiceImage(serviceId, merchantId);
    
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};
