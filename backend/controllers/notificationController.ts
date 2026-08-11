import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notificationService';

/**
 * GET /api/v1/notifications - Get my notifications
 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user!.userId);
    res.status(200).json({ status: 'success', data: notifications });
  } catch (error) { next(error); }
};

/**
 * PUT /api/v1/notifications/:id/read - Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notificationId = parseInt(req.params.id as string, 10);
    const notification = await notificationService.markAsRead(notificationId, req.user!.userId);
    res.status(200).json({ status: 'success', data: notification });
  } catch (error) { next(error); }
};

/**
 * PUT /api/v1/notifications/read-all - Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notificationService.markAllAsRead(req.user!.userId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};
