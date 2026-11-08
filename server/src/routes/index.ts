import { Router } from 'express';
import authRoutes from './auth.routes';
import lockingRoutes from './locking.routes';

const router = Router();

// ─── Routes ───
router.use('/auth', authRoutes);
router.use('/locks', lockingRoutes);

// Phase 1+: Weitere Routen werden hier registriert
// router.use('/users', userRoutes);
// router.use('/employees', employeeRoutes);
// router.use('/customers', customerRoutes);
// router.use('/objects', objectRoutes);
// router.use('/deployments', deploymentRoutes);
// router.use('/scheduling', schedulingRoutes);
// router.use('/time-records', timeRecordRoutes);
// router.use('/billing', billingRoutes);
// router.use('/reports', reportRoutes);
// router.use('/admin', adminRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/qualifications', qualificationRoutes);
// router.use('/replacement', replacementRoutes);
// router.use('/uploads', uploadRoutes);

export { router as routes };
