import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import employeeRoutes from './employee.routes';
import qualificationRoutes from './qualification.routes';
import customerRoutes from './customer.routes';
import objectRoutes from './object.routes';
import deploymentRoutes from './deployment.routes';
import autoPlannerRoutes from './autoPlanner.routes';
import attendanceRoutes from './attendance.routes';
import billingRoutes from './billing.routes';
import lockingRoutes from './locking.routes';
import platformRoutes from './platform.routes';
import { tenantContext } from '../middleware/tenantContext';

const router = Router();

// ─── Plattform-Verwaltung (SaaS Admin) ───
router.use('/platform', platformRoutes);

// ─── Tenant-Context Middleware (für alle Mandanten-APIs) ───
router.use(tenantContext);

// ─── Usage Tracking Middleware ───
import { trackApiUsage } from '../middleware/usageTracker';
router.use(trackApiUsage);

// ─── Phase 1: Auth, Benutzer, Rollen, Sperren ───
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/locks', lockingRoutes);

// ─── Phase 2: Mitarbeiter & Qualifikationen ───
router.use('/employees', employeeRoutes);
router.use('/qualifications', qualificationRoutes);

// ─── Phase 3: Kunden & Objekte ───
router.use('/customers', customerRoutes);
router.use('/objects', objectRoutes);

// ─── Phase 4: Dienstplanung ───
router.use('/deployments', deploymentRoutes);

// ─── Phase 5-8: Auto-Planung, Zeiterfassung, Abrechnung ───
router.use('/auto-planning', autoPlannerRoutes);
router.use('/time-records', attendanceRoutes);
router.use('/billing', billingRoutes);
// router.use('/reports', reportRoutes);
// router.use('/admin', adminRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/replacement', replacementRoutes);
// router.use('/uploads', uploadRoutes);

export { router as routes };
