import { Request, Response, NextFunction } from 'express';
import * as merchantService from '../services/merchantService';

/**
 * POST /api/v1/merchants - Create merchant profile
 */
export const createProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { businessName, description, categoryId, address, image } = req.body;
    if (!businessName) {
      res.status(400).json({ status: 'error', message: 'Business name is required.' });
      return;
    }
    const profile = await merchantService.createProfile({
      userId: req.user!.userId,
      businessName, description, categoryId, address, image,
    });
    res.status(201).json({ status: 'success', data: profile });
  } catch (error) { next(error); }
};

/**
 * PUT /api/v1/merchants/:id - Update merchant profile
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = parseInt(req.params.id as string, 10);
    const profile = await merchantService.updateProfile(merchantId, req.user!.userId, req.body);
    res.status(200).json({ status: 'success', data: profile });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/merchants - List approved merchants (public)
 */
export const listMerchants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await merchantService.listMerchants(categoryId, search, page, limit);
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/merchants/me - Get my merchant profile
 */
export const getMyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await merchantService.getMerchantByUserId(req.user!.userId);
    if (!profile) {
      res.status(404).json({ status: 'error', message: 'Merchant profile not set up yet.' });
      return;
    }
    res.status(200).json({ status: 'success', data: profile });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/merchants/:id - Get merchant by ID (public)
 */
export const getMerchantById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = parseInt(req.params.id as string, 10);
    const merchant = await merchantService.getMerchantById(merchantId);
    res.status(200).json({ status: 'success', data: merchant });
  } catch (error) { next(error); }
};

/**
 * PUT /api/v1/merchants/:id/approve - Admin approve/reject merchant
 */
export const updateApprovalStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = parseInt(req.params.id as string, 10);
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      res.status(400).json({ status: 'error', message: 'Status must be Approved or Rejected.' });
      return;
    }
    const merchant = await merchantService.updateApprovalStatus(merchantId, status);
    res.status(200).json({ status: 'success', data: merchant });
  } catch (error) { next(error); }
};

/**
 * GET /api/v1/merchants/admin/all - Admin list all merchants
 */
export const listAllMerchants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchants = await merchantService.listAllMerchants();
    res.status(200).json({ status: 'success', data: merchants });
  } catch (error) { next(error); }
};
