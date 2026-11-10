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
import datevRoutes from './datev.routes';
import addonRoutes from './addon.routes';
import recurringAvailabilityRoutes from './recurringAvailability.routes';
import employeeRestrictionRoutes from './employeeRestriction.routes';
import employeeDocumentRoutes from './employeeDocument.routes';
import timeRecordRoutes from './timeRecord.routes';
import complianceRoutes from './compliance.routes';
import customerDocumentRoutes from './customerDocument.routes';
import shiftReportRoutes from './shiftReport.routes';
import reminderRoutes from './reminder.routes';
import customerPortalRoutes from './customerPortal.routes';
import helpRoutes from './help.routes';
import notificationRoutes from './notification.routes';
import supportRoutes from './support.routes';

const router = Router();

// ─── Help & Support (öffentlich, vor Auth) ───
router.use('/help', helpRoutes);

// ─── Plattform-Verwaltung (SaaS Admin, eigene Auth) ───
router.use('/platform', platformRoutes);

// ─── Auth-Routen (öffentlich, kein tenantContext nötig) ───
router.use('/auth', authRoutes);

// ─── Usage Tracking Middleware (für alle folgenden Routen) ───
import { trackApiUsage } from '../middleware/usageTracker';
router.use(trackApiUsage);

// ─── Phase 1: Benutzer, Rollen, Sperren ───
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/locks', lockingRoutes);

// ─── Phase 2: Mitarbeiter & Qualifikationen ───
router.use('/employees', employeeRoutes);
router.use('/qualifications', qualificationRoutes);

// ─── Phase 2a: Verfügbarkeiten, Restriktionen, Dokumente ───
router.use('/recurring-availabilities', recurringAvailabilityRoutes);
router.use('/employee-restrictions', employeeRestrictionRoutes);
router.use('/employee-documents', employeeDocumentRoutes);

// ─── Phase 3: Kunden & Objekte ───
router.use('/customers', customerRoutes);
router.use('/objects', objectRoutes);
router.use('/customer-documents', customerDocumentRoutes);
router.use('/shift-reports', shiftReportRoutes);
router.use('/reminders', reminderRoutes);
router.use('/customer-portal', customerPortalRoutes);

// ─── Phase 4: Dienstplanung ───
router.use('/deployments', deploymentRoutes);

// ─── Phase 5-8: Auto-Planung, Zeiterfassung, Abrechnung ───
router.use('/auto-planning', autoPlannerRoutes);
router.use('/time-records', timeRecordRoutes);
router.use('/billing', billingRoutes);

// ─── Phase 9: Compliance & Audit ───
router.use('/compliance', complianceRoutes);

// ─── Phase 9: DATEV-Export für Lohnabrechnung ───
router.use('/datev', datevRoutes);

// ─── Phase 10: Add-on-System & Feature-Management ───
router.use('/addons', addonRoutes);

// ─── Support & Kommunikation ───
router.use('/notifications', notificationRoutes);
router.use('/support', supportRoutes);

// router.use('/reports', reportRoutes);
// router.use('/admin', adminRoutes);
// router.use('/replacement', replacementRoutes);
// router.use('/uploads', uploadRoutes);

export { router as routes };
