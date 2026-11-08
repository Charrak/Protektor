import { Router } from 'express';
import { auditLogController } from '../controllers/auditLog.controller';
import { platformAuthenticate } from '../middleware/platformAuth';

const router = Router();

// Alle Audit-Routes erfordern Platform-Auth
router.use(platformAuthenticate);

// Statistiken
router.get('/stats', (req, res) => auditLogController.getStats(req, res));

// Alle Logs (Platform-Admin)
router.get('/', (req, res) => auditLogController.getAllLogs(req, res));

// Logs für spezifischen Tenant
router.get('/tenant/:tenantId', (req, res) => auditLogController.getTenantLogs(req, res));

// Log-Details
router.get('/:logId', (req, res) => auditLogController.getLogDetails(req, res));

// Rollback
router.post('/:logId/rollback', (req, res) => auditLogController.rollback(req, res));

export default router;
