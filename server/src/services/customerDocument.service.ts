import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { z } from 'zod';

// Validierung für Dokument-Upload
const documentCreateSchema = z.object({
  customerId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url(),
  fileSize: z.number().int().min(0),
  mimeType: z.string().max(100),
  category: z.enum([
    'contract',
    'privacyAgreement',
    'objectApproval',
    'training',
    'qualification',
    'insurance',
    'correspondence',
    'other',
  ]),
  description: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  reminderDays: z.number().int().min(0).max(365).default(90),
  retentionPeriodMonths: z.number().int().min(0).max(120).default(120), // Default: 10 Jahre
  purpose: z.enum([
    'contractFulfillment',
    'billing',
    'customerService',
    'legal',
    'marketing',
  ]).default('contractFulfillment'),
});

export class CustomerDocumentService {
  /**
   * Liste aller Dokumente für einen Kunden
   */
  async listByCustomer(tenantId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError('Kunde');

    const documents = await prisma.customerDocument.findMany({
      where: { customerId, tenantId, deletedAt: null },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
        verifiedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return documents;
  }

  /**
   * Einzelnes Dokument abrufen
   */
  async getById(tenantId: string, documentId: string) {
    const document = await prisma.customerDocument.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
        verifiedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!document) throw new NotFoundError('Dokument');
    return document;
  }

  /**
   * Dokument erstellen mit automatischer Versionierung
   */
  async create(tenantId: string, input: any, userId: string) {
    // Validierung
    const validation = documentCreateSchema.safeParse(input);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    }

    const data = validation.data;

    // Kunde prüfen
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError('Kunde');

    // Prüfen ob bereits ein Dokument gleicher Kategorie existiert
    const existingDoc = await prisma.customerDocument.findFirst({
      where: {
        customerId: data.customerId,
        tenantId,
        category: data.category,
        isLatestVersion: true,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
    });

    let version = 1;
    let previousVersionId: string | null = null;

    if (existingDoc) {
      // Bestehendes Dokument als alte Version markieren
      await prisma.customerDocument.update({
        where: { id: existingDoc.id },
        data: { isLatestVersion: false },
      });
      version = existingDoc.version + 1;
      previousVersionId = existingDoc.id;
    }

    // Berechnung des Löschdatums basierend auf Aufbewahrungsfrist
    const deleteAt = new Date();
    deleteAt.setMonth(deleteAt.getMonth() + data.retentionPeriodMonths);

    const document = await prisma.customerDocument.create({
      data: {
        tenantId,
        customerId: data.customerId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        category: data.category,
        description: data.description,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        reminderDays: data.reminderDays,
        retentionPeriodMonths: data.retentionPeriodMonths,
        deleteAt,
        purpose: data.purpose,
        version,
        previousVersionId,
        isLatestVersion: true,
        uploadedById: userId,
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'create', 'customerDocument', document.id, null, data);

    logger.info(`Kunden-Dokument erstellt: ${data.fileName} (v${version}) für Kunde ${customer.companyName}`);
    return document;
  }

  /**
   * Dokument verifizieren
   */
  async verify(tenantId: string, documentId: string, userId: string) {
    const document = await prisma.customerDocument.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    });

    if (!document) throw new NotFoundError('Dokument');

    const updated = await prisma.customerDocument.update({
      where: { id: documentId },
      data: {
        verifiedById: userId,
        verifiedAt: new Date(),
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'verify', 'customerDocument', documentId, null, null);

    logger.info(`Dokument verifiziert: ${document.fileName}`);
    return updated;
  }

  /**
   * Dokument löschen (Soft-Delete für Versionshistorie)
   */
  async delete(tenantId: string, documentId: string, userId: string) {
    const document = await prisma.customerDocument.findFirst({
      where: { id: documentId, tenantId, deletedAt: null },
    });

    if (!document) throw new NotFoundError('Dokument');

    await prisma.customerDocument.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'delete', 'customerDocument', documentId, document, null);

    logger.info(`Dokument gelöscht (soft): ${document.fileName}`);
  }

  /**
   * Alle Dokumente abrufen, die bald ablaufen
   */
  async getExpiring(tenantId: string, days: number = 90) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const documents = await prisma.customerDocument.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isLatestVersion: true,
        expiryDate: {
          not: null,
          lte: futureDate,
        },
      },
      include: {
        customer: { select: { companyName: true, customerNumber: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return documents;
  }

  /**
   * Alle Dokumente abrufen, die gelöscht werden können (Aufbewahrungsfrist abgelaufen)
   */
  async getDeletable(tenantId: string) {
    const now = new Date();

    const documents = await prisma.customerDocument.findMany({
      where: {
        tenantId,
        deletedAt: null,
        deleteAt: {
          lte: now,
        },
      },
      include: {
        customer: { select: { companyName: true, customerNumber: true } },
      },
      orderBy: { deleteAt: 'asc' },
    });

    return documents;
  }

  /**
   * Dokument physisch löschen (nach Aufbewahrungsfrist)
   */
  async permanentDelete(tenantId: string, documentId: string, userId: string) {
    const document = await prisma.customerDocument.findFirst({
      where: { id: documentId, tenantId, deleteAt: { lte: new Date() } },
    });

    if (!document) {
      throw new ValidationError('Dokument kann noch nicht gelöscht werden (Aufbewahrungsfrist nicht abgelaufen)');
    }

    await prisma.customerDocument.delete({
      where: { id: documentId },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'permanentDelete', 'customerDocument', documentId, document, null);

    logger.info(`Dokument physisch gelöscht: ${document.fileName}`);
  }

  /**
   * Versionshistorie eines Dokuments abrufen
   */
  async getVersionHistory(tenantId: string, documentId: string) {
    const document = await prisma.customerDocument.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) throw new NotFoundError('Dokument');

    // Finde das erste Dokument in der Versionskette
    let current = document;
    while (current.previousVersionId) {
      const prev = await prisma.customerDocument.findFirst({
        where: { id: current.previousVersionId },
      });
      if (!prev) break;
      current = prev;
    }

    // Sammle alle Versionen
    const versions: any[] = [];
    let version: any = current;
    while (version) {
      versions.push({
        id: version.id,
        version: version.version,
        fileName: version.fileName,
        fileUrl: version.fileUrl,
        uploadedAt: version.createdAt,
        uploadedBy: version.uploadedBy?.firstName + ' ' + version.uploadedBy?.lastName,
        isLatestVersion: version.isLatestVersion,
        verified: !!version.verifiedAt,
        verifiedAt: version.verifiedAt,
      });

      const next = await prisma.customerDocument.findFirst({
        where: { previousVersionId: version.id },
      });
      if (!next) break;
      version = next;
    }

    return versions;
  }

  /**
   * Dokumente nach Kategorie gruppieren
   */
  async getGroupedByCategory(tenantId: string, customerId: string) {
    const documents = await prisma.customerDocument.findMany({
      where: { customerId, tenantId, deletedAt: null, isLatestVersion: true },
      orderBy: { createdAt: 'desc' },
    });

    const grouped: Record<string, any[]> = {};
    for (const doc of documents) {
      if (!grouped[doc.category]) {
        grouped[doc.category] = [];
      }
      grouped[doc.category].push(doc);
    }

    return grouped;
  }

  /**
   * Audit-Log erstellen
   */
  private async logAudit(
    tenantId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValue: any,
    newValue: any
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          oldValue: oldValue || undefined,
          newValue: newValue || undefined,
        },
      });
    } catch (error) {
      logger.error('Fehler beim Erstellen des Audit-Logs:', error);
    }
  }
}

export const customerDocumentService = new CustomerDocumentService();
