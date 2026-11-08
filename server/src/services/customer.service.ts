import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError } from '../middleware/errorHandler';

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
        city: c.city,
        phone: c.phone,
        email: c.email,
        status: c.status,
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
      },
    });

    if (!customer) throw new NotFoundError('Kunde');
    return customer;
  }

  async create(input: any, userId: string) {
    const existing = await prisma.customer.findFirst({
      where: { customerNumber: input.customerNumber, deletedAt: null },
    });

    if (existing) throw new ConflictError('Kundennummer ist bereits vergeben');

    const customer = await prisma.customer.create({
      data: {
        customerNumber: input.customerNumber,
        companyName: input.companyName,
        department: input.department,
        street: input.street,
        zipCode: input.zipCode,
        city: input.city,
        country: input.country || 'DE',
        phone: input.phone,
        fax: input.fax,
        email: input.email,
        website: input.website,
        taxNumber: input.taxNumber,
        vatId: input.vatId,
        paymentTerms: input.paymentTerms || 14,
        notes: input.notes,
        status: input.status || 'active',
      },
    });

    logger.info(`Kunde erstellt: ${customer.companyName} (${customer.customerNumber})`);
    return customer;
  }

  async update(id: string, input: any, userId: string) {
    const existing = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Kunde');

    if (input.customerNumber && input.customerNumber !== existing.customerNumber) {
      const taken = await prisma.customer.findFirst({
        where: { customerNumber: input.customerNumber, deletedAt: null, id: { not: id } },
      });
      if (taken) throw new ConflictError('Kundennummer ist bereits vergeben');
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(input.customerNumber !== undefined && { customerNumber: input.customerNumber }),
        ...(input.companyName !== undefined && { companyName: input.companyName }),
        ...(input.department !== undefined && { department: input.department }),
        ...(input.street !== undefined && { street: input.street }),
        ...(input.zipCode !== undefined && { zipCode: input.zipCode }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.fax !== undefined && { fax: input.fax }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.website !== undefined && { website: input.website }),
        ...(input.taxNumber !== undefined && { taxNumber: input.taxNumber }),
        ...(input.vatId !== undefined && { vatId: input.vatId }),
        ...(input.paymentTerms !== undefined && { paymentTerms: input.paymentTerms }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });

    logger.info(`Kunde aktualisiert: ${customer.companyName}`);
    return customer;
  }

  async delete(id: string, userId: string) {
    const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) throw new NotFoundError('Kunde');

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });

    logger.info(`Kunde deaktiviert: ${customer.companyName}`);
  }

  async addContactPerson(customerId: string, data: any, userId: string) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
    if (!customer) throw new NotFoundError('Kunde');

    const contact = await prisma.contactPerson.create({
      data: {
        customerId,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone,
        mobile: data.mobile,
        email: data.email,
        isPrimary: data.isPrimary || false,
        notes: data.notes,
      },
    });

    logger.info(`Ansprechpartner hinzugefügt: ${contact.firstName} ${contact.lastName} für ${customer.companyName}`);
    return contact;
  }

  async updateContactPerson(customerId: string, contactId: string, data: any, userId: string) {
    const contact = await prisma.contactPerson.findFirst({
      where: { id: contactId, customerId },
    });

    if (!contact) throw new NotFoundError('Ansprechpartner');

    const updated = await prisma.contactPerson.update({
      where: { id: contactId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    logger.info(`Ansprechpartner aktualisiert: ${updated.firstName} ${updated.lastName}`);
    return updated;
  }

  async deleteContactPerson(customerId: string, contactId: string, userId: string) {
    const contact = await prisma.contactPerson.findFirst({
      where: { id: contactId, customerId },
    });

    if (!contact) throw new NotFoundError('Ansprechpartner');

    await prisma.contactPerson.delete({ where: { id: contactId } });
    logger.info(`Ansprechpartner entfernt: ${contact.firstName} ${contact.lastName}`);
  }
}

export const customerService = new CustomerService();
