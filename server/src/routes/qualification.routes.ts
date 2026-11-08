import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// Alle Qualifikationen auflisten
router.get('/', authenticate, requirePermission('employees:view'), async (req, res, next) => {
  try {
    const qualifications = await prisma.qualification.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(qualifications);
  } catch (error) {
    next(error);
  }
});

// Qualifikation erstellen (nur Admin)
router.post('/', authenticate, requirePermission('admin:settings'), async (req, res, next) => {
  try {
    const { name, category, validityDays, color, requiresRenewal } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name ist erforderlich' });
      return;
    }

    const qualification = await prisma.qualification.create({
      data: {
        name,
        category,
        validityDays,
        color,
        requiresRenewal: requiresRenewal ?? (validityDays ? true : false),
      },
    });

    res.status(201).json(qualification);
  } catch (error) {
    next(error);
  }
});

// Qualifikation bearbeiten
router.put('/:id', authenticate, requirePermission('admin:settings'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { name, category, validityDays, color, requiresRenewal } = req.body;

    const qualification = await prisma.qualification.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(validityDays !== undefined && { validityDays }),
        ...(color !== undefined && { color }),
        ...(requiresRenewal !== undefined && { requiresRenewal }),
      },
    });

    res.json(qualification);
  } catch (error) {
    next(error);
  }
});

// Qualifikation löschen
router.delete('/:id', authenticate, requirePermission('admin:settings'), async (req, res, next) => {
  try {
    const id = req.params.id as string;

    // Prüfen ob Qualifikation noch zugewiesen ist
    const assignments = await prisma.employeeQualification.count({
      where: { qualificationId: id },
    });

    if (assignments > 0) {
      res.status(400).json({ error: 'Qualifikation ist noch Mitarbeitern zugewiesen und kann nicht gelöscht werden' });
      return;
    }

    await prisma.qualification.delete({ where: { id } });
    res.json({ message: 'Qualifikation gelöscht' });
  } catch (error) {
    next(error);
  }
});

// Bald ablaufende Qualifikationen
router.get('/expiring', authenticate, requirePermission('employees:view'), async (req, res, next) => {
  try {
    const daysAhead = parseInt(req.query.days as string, 10) || 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    const expiring = await prisma.employeeQualification.findMany({
      where: {
        expiryDate: {
          not: null,
          lte: cutoff,
        },
        isVerified: true,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            personnelNumber: true,
          },
        },
        qualification: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    res.json(expiring);
  } catch (error) {
    next(error);
  }
});

export default router;
