import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import employeeRoutes from './employee.routes';
import qualificationRoutes from './qualification.routes';
import customerRoutes from './customer.routes';
import objectRoutes from './object.routes';
import lockingRoutes from './locking.routes';

const router = Router();

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

// ─── Phase 4+: Weitere Routen ───
// router.use('/deployments', deploymentRoutes);
// router.use('/scheduling', schedulingRoutes);
// router.use('/time-records', timeRecordRoutes);
// router.use('/billing', billingRoutes);
// router.use('/reports', reportRoutes);
// router.use('/admin', adminRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/replacement', replacementRoutes);
// router.use('/uploads', uploadRoutes);

export { router as routes };
