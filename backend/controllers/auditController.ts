import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/auditService';

/**
 * GET /api/v1/admin/audit-logs - Admin: get paginated audit logs
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const action = req.query.action as string | undefined;
    const entityType = req.query.entityType as string | undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;

    const result = await auditService.getAuditLogs(page, limit, action, entityType, userId);
    res.status(200).json({ status: 'success', data: result.data, pagination: result.pagination });
  } catch (error) { next(error); }
};
