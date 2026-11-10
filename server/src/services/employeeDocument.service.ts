import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError } from '../middleware/errorHandler';

interface CreateDocumentInput {
  employeeId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  category: string;
  subCategory?: string;
  description?: string;
  expiryDate?: string;
  reminderDays?: number;
  tags?: string[];
}

export class EmployeeDocumentService {
  /**
   * Liste aller Dokumente für einen Mitarbeiter
   */
  async listByEmployee(tenantId: string, employeeId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    return prisma.employeeDocument.findMany({
      where: { employeeId, tenantId, deletedAt: null },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
        verifiedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Erstelle ein neues Dokument (Versionierung beachten)
   */
  async create(tenantId: string, input: CreateDocumentInput, userId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    // Prüfe ob es ein vorheriges Dokument gleicher Kategorie+SubKategorie gibt
    const previousDoc = await prisma.employeeDocument.findFirst({
      where: {
        employeeId: input.employeeId,
        tenantId,
        category: input.category as any,
        subCategory: input.subCategory || null,
        isLatestVersion: true,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
    });

    let version = 1;
    let previousVersionId: string | null = null;

    if (previousDoc) {
      // Markiere vorheriges Dokument als nicht mehr aktuell
      await prisma.employeeDocument.update({
        where: { id: previousDoc.id },
        data: { isLatestVersion: false },
      });
      version = previousDoc.version + 1;
      previousVersionId = previousDoc.id;
    }

    const document = await prisma.employeeDocument.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        category: input.category as any,
        subCategory: input.subCategory,
        description: input.description,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        reminderDays: input.reminderDays || 90,
        tags: input.tags || [],
        version,
        previousVersionId,
        isLatestVersion: true,
        uploadedById: userId,
      },
    });

    logger.info(`Dokument erstellt: ${input.fileName} (v${version}) für MA ${input.employeeId}`);
    return document;
  }

  /**
   * Verifiziere ein Dokument
   */
  async verify(tenantId: string, id: string, userId: string) {
    const document = await prisma.employeeDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!document) throw new NotFoundError('Dokument');

    return prisma.employeeDocument.update({
      where: { id },
      data: {
        verifiedById: userId,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Soft-Delete eines Dokuments
   */
  async delete(tenantId: string, id: string) {
    const document = await prisma.employeeDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!document) throw new NotFoundError('Dokument');

    await prisma.employeeDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info(`Dokument gelöscht (soft): ${id}`);
  }

  /**
   * Hole alle Dokumente die bald ablaufen
   */
  async getExpiring(tenantId: string, days: number = 90) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return prisma.employeeDocument.findMany({
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
        employee: { select: { firstName: true, lastName: true, personnelNumber: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  /**
   * Hole alle Dokumente gruppiert nach Kategorie
   */
  async getGroupedByCategory(tenantId: string, employeeId: string) {
    const documents = await prisma.employeeDocument.findMany({
      where: { employeeId, tenantId, deletedAt: null, isLatestVersion: true },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
        verifiedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Gruppiere nach Kategorie
    const grouped: Record<string, any[]> = {};
    for (const doc of documents) {
      const cat = doc.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(doc);
    }

    return grouped;
  }

  /**
   * Hole Versionshistorie für ein Dokument
   */
  async getVersionHistory(tenantId: string, id: string) {
    const document = await prisma.employeeDocument.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!document) throw new NotFoundError('Dokument');

    // Finde die ursprüngliche Version
    let current = document;
    while (current.previousVersionId) {
      const prev = await prisma.employeeDocument.findFirst({
        where: { id: current.previousVersionId },
      });
      if (!prev) break;
      current = prev;
    }

    // Sammle alle Versionen
    const versions: any[] = [];
    let v: any = current;
    while (v) {
      versions.push(v);
      const next = await prisma.employeeDocument.findFirst({
        where: { previousVersionId: v.id },
      });
      if (!next) break;
      v = next;
    }

    return versions;
  }
}

export const employeeDocumentService = new EmployeeDocumentService();
