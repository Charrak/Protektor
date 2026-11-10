import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { customerCreateSchema, customerUpdateSchema, contactPersonCreateSchema, contactPersonUpdateSchema } from '../validators/customer.validator';
import { autoNumberService } from './autoNumber.service';

export class CustomerService {
  async list(query: { search?: string; status?: string; page?: number; limit?: number }) {
    const { search, status, page = 1, limit = 25 } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { customerNumber: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: { select: { objects: true, contactPersons: true } },
        },
        orderBy: { companyName: 'asc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers: customers.map((c: any) => ({
        id: c.id,
        customerNumber: c.customerNumber,
        companyName: c.companyName,
        legalForm: c.legalForm,
        city: c.city,
        phone: c.phone,
        email: c.email,
        invoiceEmail: c.invoiceEmail,
        status: c.status,
        billingType: c.billingType,
        billingInterval: c.billingInterval,
        objectCount: c._count.objects,
        contactCount: c._count.contactPersons,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        contactPersons: { orderBy: { isPrimary: 'desc' } },
        objects: { where: { isActive: true } },
        rates: { orderBy: { validFrom: 'desc' } },
        invoices: { orderBy: { invoiceDate: 'desc' }, take: 10 },
        documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!customer) throw new NotFoundError('Kunde');
    return customer;
  }

  async create(input: any, userId: string, tenantId: string) {
    // Validierung
    const validation = customerCreateSchema.safeParse(input);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    }
    
    const data = validation.data;
    
    // Auto-Generierung der Kundennummer
    const customerNumber = await autoNumberService.generateCustomerNumber(tenantId);

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        customerNumber,
        companyName: data.companyName,
        legalForm: data.legalForm,
        department: data.department,
        street: data.street,
        zipCode: data.zipCode,
        city: data.city,
        country: data.country,
        phone: data.phone,
        fax: data.fax,
        email: data.email,
        website: data.website,
        taxNumber: data.taxNumber,
        vatId: data.vatId,
        
        // Rechnungsdaten
        invoiceStreet: data.invoiceStreet,
        invoiceZipCode: data.invoiceZipCode,
        invoiceCity: data.invoiceCity,
        invoiceCountry: data.invoiceCountry,
        invoiceRecipientName: data.invoiceRecipientName,
        invoiceEmail: data.invoiceEmail,
        invoicePhone: data.invoicePhone,
        invoiceDeliveryMethod: data.invoiceDeliveryMethod,
        
        // Vertragsdaten
        contractNumber: data.contractNumber,
        contractStartDate: data.contractStartDate ? new Date(data.contractStartDate as string) : undefined,
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate as string) : undefined,
        terminationNoticePeriod: data.terminationNoticePeriod,
        billingType: data.billingType,
        billingInterval: data.billingInterval,
        
        // Zahlungsbedingungen
        paymentTerms: data.paymentTerms,
        purchaseOrderNumber: data.purchaseOrderNumber,
        
        notes: data.notes,
        status: data.status,
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'create', 'customer', customer.id, null, data);

    logger.info(`Kunde erstellt: ${customer.companyName} (${customer.customerNumber})`);
    return customer;
  }

  async update(id: string, input: any, userId: string, tenantId: string) {
    const existing = await prisma.customer.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundError('Kunde');

    // Validierung
    const validation = customerUpdateSchema.safeParse(input);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    }
    
    const data = validation.data;

    // Speichere alte Werte für Audit-Log
    const oldData = { ...existing };

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.legalForm !== undefined && { legalForm: data.legalForm }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.street !== undefined && { street: data.street }),
        ...(data.zipCode !== undefined && { zipCode: data.zipCode }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.fax !== undefined && { fax: data.fax }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.taxNumber !== undefined && { taxNumber: data.taxNumber }),
        ...(data.vatId !== undefined && { vatId: data.vatId }),
        
        // Rechnungsdaten
        ...(data.invoiceStreet !== undefined && { invoiceStreet: data.invoiceStreet }),
        ...(data.invoiceZipCode !== undefined && { invoiceZipCode: data.invoiceZipCode }),
        ...(data.invoiceCity !== undefined && { invoiceCity: data.invoiceCity }),
        ...(data.invoiceCountry !== undefined && { invoiceCountry: data.invoiceCountry }),
        ...(data.invoiceRecipientName !== undefined && { invoiceRecipientName: data.invoiceRecipientName }),
        ...(data.invoiceEmail !== undefined && { invoiceEmail: data.invoiceEmail }),
        ...(data.invoicePhone !== undefined && { invoicePhone: data.invoicePhone }),
        ...(data.invoiceDeliveryMethod !== undefined && { invoiceDeliveryMethod: data.invoiceDeliveryMethod }),
        
        // Vertragsdaten
        ...(data.contractNumber !== undefined && { contractNumber: data.contractNumber }),
        ...(data.contractStartDate !== undefined && { contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null }),
        ...(data.contractEndDate !== undefined && { contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null }),
        ...(data.terminationNoticePeriod !== undefined && { terminationNoticePeriod: data.terminationNoticePeriod }),
        ...(data.billingType !== undefined && { billingType: data.billingType }),
        ...(data.billingInterval !== undefined && { billingInterval: data.billingInterval }),
        
        // Zahlungsbedingungen
        ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
        ...(data.purchaseOrderNumber !== undefined && { purchaseOrderNumber: data.purchaseOrderNumber }),
        
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'update', 'customer', customer.id, oldData, data);

    logger.info(`Kunde aktualisiert: ${customer.companyName}`);
    return customer;
  }

  async delete(id: string, userId: string, tenantId: string) {
    const customer = await prisma.customer.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!customer) throw new NotFoundError('Kunde');

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'delete', 'customer', customer.id, customer, null);

    logger.info(`Kunde deaktiviert: ${customer.companyName}`);
  }

  async addContactPerson(customerId: string, data: any, userId: string, tenantId: string) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null } });
    if (!customer) throw new NotFoundError('Kunde');

    // Validierung
    const validation = contactPersonCreateSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    }
    
    const validData = validation.data;

    const contact = await prisma.contactPerson.create({
      data: {
        tenantId,
        customerId,
        firstName: validData.firstName,
        lastName: validData.lastName,
        role: validData.role,
        phone: validData.phone,
        mobile: validData.mobile,
        email: validData.email,
        isPrimary: validData.isPrimary,
        isInvoiceContact: validData.isInvoiceContact,
        isEmergencyContact: validData.isEmergencyContact,
        availability: validData.availability,
        notes: validData.notes,
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'create', 'contactPerson', contact.id, null, validData);

    logger.info(`Ansprechpartner hinzugefügt: ${contact.firstName} ${contact.lastName} für ${customer.companyName}`);
    return contact;
  }

  async updateContactPerson(customerId: string, contactId: string, data: any, userId: string, tenantId: string) {
    const contact = await prisma.contactPerson.findFirst({
      where: { id: contactId, customerId, tenantId },
    });

    if (!contact) throw new NotFoundError('Ansprechpartner');

    // Validierung
    const validation = contactPersonUpdateSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    }
    
    const validData = validation.data;
    const oldData = { ...contact };

    const updated = await prisma.contactPerson.update({
      where: { id: contactId },
      data: {
        ...(validData.firstName !== undefined && { firstName: validData.firstName }),
        ...(validData.lastName !== undefined && { lastName: validData.lastName }),
        ...(validData.role !== undefined && { role: validData.role }),
        ...(validData.phone !== undefined && { phone: validData.phone }),
        ...(validData.mobile !== undefined && { mobile: validData.mobile }),
        ...(validData.email !== undefined && { email: validData.email }),
        ...(validData.isPrimary !== undefined && { isPrimary: validData.isPrimary }),
        ...(validData.isInvoiceContact !== undefined && { isInvoiceContact: validData.isInvoiceContact }),
        ...(validData.isEmergencyContact !== undefined && { isEmergencyContact: validData.isEmergencyContact }),
        ...(validData.availability !== undefined && { availability: validData.availability }),
        ...(validData.notes !== undefined && { notes: validData.notes }),
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'update', 'contactPerson', contact.id, oldData, validData);

    logger.info(`Ansprechpartner aktualisiert: ${updated.firstName} ${updated.lastName}`);
    return updated;
  }

  async deleteContactPerson(customerId: string, contactId: string, userId: string, tenantId: string) {
    const contact = await prisma.contactPerson.findFirst({
      where: { id: contactId, customerId, tenantId },
    });

    if (!contact) throw new NotFoundError('Ansprechpartner');

    await prisma.contactPerson.delete({ where: { id: contactId } });
    
    // Audit-Log
    await this.logAudit(tenantId, userId, 'delete', 'contactPerson', contact.id, contact, null);
    
    logger.info(`Ansprechpartner entfernt: ${contact.firstName} ${contact.lastName}`);
  }

  /**
   * Prüft ob ein Kunde alle Pflichtfelder für Rechnungsstellung hat
   */
  async validateInvoiceReadiness(customerId: string): Promise<{
    ready: boolean;
    missingFields: string[];
  }> {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });

    if (!customer) throw new NotFoundError('Kunde');

    const missingFields: string[] = [];

    // Prüfe Pflichtfelder für Rechnung
    if (!customer.invoiceEmail) {
      missingFields.push('invoiceEmail');
    }

    // Prüfe ob Rechnungsadresse vorhanden (entweder abweichend oder Firmenadresse)
    if (!customer.invoiceStreet && !customer.street) {
      missingFields.push('invoiceStreet oder street');
    }

    if (!customer.invoiceZipCode && !customer.zipCode) {
      missingFields.push('invoiceZipCode oder zipCode');
    }

    if (!customer.invoiceCity && !customer.city) {
      missingFields.push('invoiceCity oder city');
    }

    return {
      ready: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Audit-Log-Eintrag erstellen
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

  /**
   * DSGVO: Zugriffsprotokoll erstellen
   */
  async logAccess(
    tenantId: string,
    customerId: string,
    userId: string | null,
    customerUserId: string | null,
    action: string,
    resourceType?: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await prisma.customerAccessLog.create({
        data: {
          tenantId,
          customerId,
          userId,
          customerUserId,
          action,
          resourceType,
          resourceId,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      logger.error('Fehler beim Erstellen des Zugriffsprotokolls:', error);
    }
  }
}

export const customerService = new CustomerService();
