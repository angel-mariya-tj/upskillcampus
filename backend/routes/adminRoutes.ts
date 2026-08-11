import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/audit-logs', authenticate, authorize('Admin'), getAuditLogs);

export default router;
