import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption';
import { auditService } from './audit.service';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

/**
 * Object Service mit optionaler Encryption für sensible Daten
 */
export class ObjectService {
  /**
   * Listet alle Objekte (kompatibel mit bestehendem Controller)
   */
  async list(filters: {
    search?: string;
    customerId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, customerId, isActive, page = 1, limit = 50 } = filters;

    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { objectNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [objects, total] = await Promise.all([
      prisma.sMSObject.findMany({
        where,
        skip: ((page || 1) - 1) * (limit || 50),
        take: limit || 50,
        orderBy: { name: 'asc' },
        include: {
          customer: {
            select: {
              companyName: true,
            },
          },
        },
      }),
      prisma.sMSObject.count({ where }),
    ]);

    return {
      objects,
      total,
      page: page || 1,
      limit: limit || 50,
      totalPages: Math.ceil(total / (limit || 50)),
    };
  }

  /**
   * Ruft ein Objekt ab und entschlüsselt Zugangsdaten falls vorhanden
   */
  async getById(id: string) {
    const object = await prisma.sMSObject.findUnique({
      where: { id },
      include: {
        customer: true,
        deployments: true,
      },
    });

    if (!object) {
      throw new Error('Objekt nicht gefunden');
    }

    // Zugangsdaten entschlüsseln wenn vorhanden
    if ((object as any).accessCredentials && typeof (object as any).accessCredentials === 'object') {
      try {
        const creds = (object as any).accessCredentials;
        const decrypted: any = {};
        
        if (creds.username) {
          decrypted.username = decrypt(creds.username);
        }
        if (creds.password) {
          decrypted.password = decrypt(creds.password);
        }
        if (creds.code) {
          decrypted.code = decrypt(creds.code);
        }
        
        (object as any).accessCredentials = decrypted;
      } catch (error) {
        logger.error('Fehler beim Entschlüsseln der Zugangsdaten:', error);
      }
    }

    return object;
  }

  /**
   * Erstellt ein neues Objekt (kompatibel mit bestehendem Controller)
   */
  async create(data: any, userId: string) {
    // Zugangsdaten verschlüsseln wenn vorhanden
    if (data.accessCredentials && typeof data.accessCredentials === 'object') {
      const creds = data.accessCredentials;
      const encrypted: any = {};
      
      if (creds.username) {
        encrypted.username = encrypt(creds.username);
      }
      if (creds.password) {
        encrypted.password = encrypt(creds.password);
      }
      if (creds.code) {
        encrypted.code = encrypt(creds.code);
      }
      
      data.accessCredentials = encrypted;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
      select: { tenantId: true },
    });
    if (!customer) throw new Error('Kunde nicht gefunden');

    const object = await prisma.sMSObject.create({
      data: {
        tenantId: customer.tenantId,
        objectNumber: data.objectNumber,
        customerId: data.customerId,
        name: data.name,
        street: data.street ?? data.address?.street,
        zipCode: data.zipCode ?? data.address?.zipCode,
        city: data.city ?? data.address?.city,
        contactPersonId: data.contactPersonId || undefined,
        accessCredentials: data.accessCredentials || undefined,
        notes: data.notes || '',
        isActive: data.isActive !== false,
      },
    });

    // Audit Log
    if (data.tenantId) {
      await auditService.logCreate(
        data.tenantId,
        userId,
        'Object',
        object.id,
        { objectNumber: data.objectNumber, name: data.name }
      );
    }

    return object;
  }

  /**
   * Aktualisiert ein Objekt (kompatibel mit bestehendem Controller)
   */
  async update(id: string, data: any, userId: string) {
    // Zugangsdaten verschlüsseln wenn vorhanden
    if (data.accessCredentials && typeof data.accessCredentials === 'object') {
      const creds = data.accessCredentials;
      const encrypted: any = {};
      
      if (creds.username) {
        encrypted.username = encrypt(creds.username);
      }
      if (creds.password) {
        encrypted.password = encrypt(creds.password);
      }
      if (creds.code) {
        encrypted.code = encrypt(creds.code);
      }
      
      data.accessCredentials = encrypted;
    }

    const object = await prisma.sMSObject.update({
      where: { id },
      data,
    });

    // Audit Log
    if (data.tenantId) {
      await auditService.logUpdate(
        data.tenantId,
        userId,
        'Object',
        id,
        data
      );
    }

    return object;
  }

  /**
   * Setzt Objekt-Anforderungen
   */
  async setRequirements(objectId: string, requirements: any[], userId: string) {
    const object = await prisma.sMSObject.update({
      where: { id: objectId },
      data: {
        requirements: requirements as any,
      },
    });

    // Audit Log
    await auditService.logUpdate(
      (object as any).tenantId || '',
      userId,
      'Object',
      objectId,
      { requirements }
    );

    return object;
  }
}

export const objectService = new ObjectService();
