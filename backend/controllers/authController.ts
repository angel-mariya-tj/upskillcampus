import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';

/**
 * POST /api/v1/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ status: 'error', message: 'Name, email, password, and role are required.' });
      return;
    }

    if (!['Merchant', 'Customer'].includes(role)) {
      res.status(400).json({ status: 'error', message: 'Role must be Merchant or Customer.' });
      return;
    }

    const result = await authService.registerUser({ name, email, password, phone, role });
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ status: 'error', message: 'Email and password are required.' });
      return;
    }

    const result = await authService.loginUser({ email, password });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await authService.getCurrentUser(userId);
    res.status(200).json({ status: 'success', data: user });
  } catch (error) {
    next(error);
  }
};
