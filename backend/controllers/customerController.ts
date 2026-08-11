import { Request, Response, NextFunction } from 'express';
import * as customerService from '../services/customerService';

/**
 * POST /api/v1/customer/favorites/:serviceId - Add a service to favorites
 */
export const addFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const serviceId = parseInt(req.params.serviceId as string, 10);
    const favorite = await customerService.addFavorite(req.user!.userId, serviceId);
    res.status(201).json({ status: 'success', data: favorite });
  } catch (error) { next(error); }
};

/**
 * DELETE /api/v1/customer/favorites/:serviceId - Remove a service from favorites
 */
export const removeFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const serviceId = parseInt(req.params.serviceId as string, 10);
    const result = await customerService.removeFavorite(req.user!.userId, serviceId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/customer/favorites - List all favorites for current customer
 */
export const getFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const favorites = await customerService.getFavorites(req.user!.userId);
    res.status(200).json({ status: 'success', data: favorites });
  } catch (error) { next(error); }
};

/**
 * PUT /api/v1/customer/profile - Update customer profile (name, phone)
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, phone } = req.body;
    const profile = await customerService.updateCustomerProfile(req.user!.userId, name, phone);
    res.status(200).json({ status: 'success', data: profile });
  } catch (error) { next(error); }
};
