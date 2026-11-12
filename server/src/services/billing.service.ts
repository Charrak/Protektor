import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError } from '../middleware/errorHandler';

export class BillingService {
  /**
   * Berechnet Mitarbeitervergütung für einen Zeitraum
   */
  async calculateEmployeePayroll(employeeId: string, startDate: string, endDate: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    // Zeiterfassungen laden
    const timeRecords = await prisma.timeRecord.findMany({
      where: {
        employeeId,
        date: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'approved',
      },
    });

    // Stundensätze laden
    const rate = await prisma.employeeRate.findFirst({
      where: {
        employeeId,
        validFrom: { lte: new Date(endDate) },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date(startDate) } }],
      },
    });

    const baseRate = Number(rate?.rateBase ?? employee.hourlyRateBase ?? 0);
    const nightSurcharge = Number(rate?.rateNight ?? employee.surchargeNight ?? 0);
    const sundaySurcharge = Number(rate?.rateSunday ?? employee.surchargeSunday ?? 0);
    const holidaySurcharge = Number(rate?.rateHoliday ?? employee.surchargeHoliday ?? 0);

    let regularPay = 0;
    let nightPay = 0;
    let sundayPay = 0;
    let holidayPay = 0;
    let totalHours = 0;

    for (const record of timeRecords) {
      const hours = Number(record.regularHours || record.totalHours || 0);
      const nightHours = Number(record.nightHours || 0);
      const sundayHours = Number(record.sundayHours || 0);
      const holidayHours = Number(record.holidayHours || 0);

      regularPay += (hours - nightHours - sundayHours - holidayHours) * baseRate;
      nightPay += nightHours * (baseRate * (1 + nightSurcharge / 100));
      sundayPay += sundayHours * (baseRate * (1 + sundaySurcharge / 100));
      holidayPay += holidayHours * (baseRate * (1 + holidaySurcharge / 100));
      totalHours += hours;
    }

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      period: { startDate, endDate },
      totalHours: totalHours.toFixed(2),
      regularPay: regularPay.toFixed(2),
      nightPay: nightPay.toFixed(2),
      sundayPay: sundayPay.toFixed(2),
      holidayPay: holidayPay.toFixed(2),
      totalPay: (regularPay + nightPay + sundayPay + holidayPay).toFixed(2),
      records: timeRecords.length,
    };
  }

  /**
   * Generiert Kundenrechnung für einen Zeitraum
   */
  async generateCustomerInvoice(customerId: string, startDate: string, endDate: string, userId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError('Kunde');

    // Alle Einsätze für diesen Kunden im Zeitraum laden
    const deployments = await prisma.deployment.findMany({
      where: {
        date: { gte: new Date(startDate), lte: new Date(endDate) },
        object: { customerId },
        status: { in: ['confirmed', 'completed'] },
      },
      include: {
        object: true,
        employee: true,
      },
    });

    // Kundenspezifische Stundensätze laden
    const rates = await prisma.customerRate.findMany({
      where: {
        customerId,
        validFrom: { lte: new Date(endDate) },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date(startDate) } }],
      },
    });

    const defaultRate = Number(rates[0]?.rateNormal || 30);
    const nightRate = Number(rates[0]?.rateNight || defaultRate * 1.2);
    const sundayRate = Number(rates[0]?.rateSunday || defaultRate * 1.3);
    const holidayRate = Number(rates[0]?.rateHoliday || defaultRate * 1.5);

    let subtotal = 0;
    const positions: any[] = [];

    for (const dep of deployments) {
      const start = new Date(`1970-01-01T${dep.startTime}`);
      const end = new Date(`1970-01-01T${dep.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60) - dep.breakMinutes / 60;

      let rate = defaultRate;
      if (dep.isHoliday) rate = holidayRate;
      else if (dep.isSunday) rate = sundayRate;
      else if (dep.isNightShift) rate = nightRate;

      const amount = hours * rate;
      subtotal += amount;

      positions.push({
        description: `${dep.object.name} - ${dep.employee.firstName} ${dep.employee.lastName}`,
        quantity: parseFloat(hours.toFixed(2)),
        ratePerUnit: rate,
        totalAmount: parseFloat(amount.toFixed(2)),
        serviceDate: dep.date,
        serviceType: dep.isNightShift ? 'night' : dep.isSunday ? 'sunday' : dep.isHoliday ? 'holiday' : 'normal',
      });
    }

    const taxRate = 19;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    // Rechnungsnummer generieren
    const invoiceCount = await prisma.customerInvoice.count({ where: { customerId } });
    const invoiceNumber = `INV-${customer.customerNumber}-${String(invoiceCount + 1).padStart(4, '0')}`;

    const invoice = await prisma.customerInvoice.create({
      data: {
        invoiceNumber,
        customerId,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + customer.paymentTerms * 24 * 60 * 60 * 1000),
        periodStart: new Date(startDate),
        periodEnd: new Date(endDate),
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        status: 'draft',
        createdById: userId,
      },
    });

    // Rechnungspositionen erstellen
    if (positions.length > 0) {
      await prisma.invoicePosition.createMany({
        data: positions.map((p, i) => ({
          invoiceId: invoice.id,
          description: p.description,
          quantity: p.quantity,
          ratePerUnit: p.ratePerUnit,
          totalAmount: p.totalAmount,
          serviceDate: p.serviceDate,
          serviceType: p.serviceType,
          sortOrder: i,
        })),
      });
    }

    logger.info(`Rechnung erstellt: ${invoiceNumber} für ${customer.companyName}, Betrag: ${totalAmount.toFixed(2)}€`);

    return {
      ...invoice,
      positions,
    };
  }

  async listInvoices(query: { customerId?: string; status?: string; page?: number; limit?: number }) {
    const { customerId, status, page = 1, limit = 25 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.customerInvoice.findMany({
        where,
        include: {
          customer: { select: { companyName: true, customerNumber: true } },
          _count: { select: { positions: true } },
        },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customerInvoice.count({ where }),
    ]);

    return {
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
        status: inv.status,
        positionCount: inv._count.positions,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const billingService = new BillingService();
