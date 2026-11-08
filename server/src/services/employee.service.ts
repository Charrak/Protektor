import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';

type EmploymentType = 'full_time' | 'part_time' | 'mini_job' | 'freelance';
type Gender = 'male' | 'female' | 'diverse';
type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

interface CreateEmployeeInput {
  personnelNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  gender?: Gender;
  dateOfBirth?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  taxId?: string;
  socialInsuranceId?: string;
  healthInsurance?: string;
  healthInsuranceId?: string;
  employmentType?: EmploymentType;
  weeklyHours?: number;
  contractStart?: string;
  contractEnd?: string;
  hourlyRateBase?: number;
  surchargeNight?: number;
  surchargeSunday?: number;
  surchargeHoliday?: number;
  maxHoursPerDay?: number;
  maxHoursPerWeek?: number;
  preferredRegion?: string;
  notes?: string;
  status?: EmployeeStatus;
}

interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {}

interface ListQuery {
  search?: string;
  status?: EmployeeStatus;
  employmentType?: EmploymentType;
  page?: number;
  limit?: number;
}

export class EmployeeService {
  async list(query: ListQuery) {
    const { search, status, employmentType, page = 1, limit = 25 } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { personnelNumber: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (employmentType) where.employmentType = employmentType;

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          qualifications: {
            include: { qualification: true },
            where: { expiryDate: { gte: new Date() } },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.employee.count({ where }),
    ]);

    return {
      employees: employees.map((e: any) => ({
        id: e.id,
        personnelNumber: e.personnelNumber,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        phone: e.phone,
        status: e.status,
        employmentType: e.employmentType,
        qualifications: e.qualifications.map((eq: any) => ({
          id: eq.qualification.id,
          name: eq.qualification.name,
          category: eq.qualification.category,
          expiryDate: eq.expiryDate,
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: {
        qualifications: {
          include: { qualification: true },
          orderBy: { obtainedDate: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        availabilities: {
          where: { endDate: { gte: new Date() } },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!employee) throw new NotFoundError('Mitarbeiter');

    return employee;
  }

  async create(input: CreateEmployeeInput, userId: string) {
    // Prüfen ob Personalnummer bereits vergeben
    const existing = await prisma.employee.findFirst({
      where: { personnelNumber: input.personnelNumber, deletedAt: null },
    });

    if (existing) {
      throw new ConflictError('Personalnummer ist bereits vergeben');
    }

    const employee = await prisma.employee.create({
      data: {
        personnelNumber: input.personnelNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        street: input.street,
        zipCode: input.zipCode,
        city: input.city,
        country: input.country || 'DE',
        bankName: input.bankName,
        iban: input.iban,
        bic: input.bic,
        taxId: input.taxId,
        socialInsuranceId: input.socialInsuranceId,
        healthInsurance: input.healthInsurance,
        healthInsuranceId: input.healthInsuranceId,
        employmentType: input.employmentType,
        weeklyHours: input.weeklyHours,
        contractStart: input.contractStart ? new Date(input.contractStart) : undefined,
        contractEnd: input.contractEnd ? new Date(input.contractEnd) : undefined,
        hourlyRateBase: input.hourlyRateBase,
        surchargeNight: input.surchargeNight || 0,
        surchargeSunday: input.surchargeSunday || 0,
        surchargeHoliday: input.surchargeHoliday || 0,
        maxHoursPerDay: input.maxHoursPerDay || 10,
        maxHoursPerWeek: input.maxHoursPerWeek || 48,
        preferredRegion: input.preferredRegion,
        notes: input.notes,
        status: input.status || 'active',
      },
    });

    logger.info(`Mitarbeiter erstellt: ${employee.firstName} ${employee.lastName} (${employee.personnelNumber})`);

    return employee;
  }

  async update(id: string, input: UpdateEmployeeInput, userId: string) {
    const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Mitarbeiter');

    // Bei Personalnummer-Änderung prüfen
    if (input.personnelNumber && input.personnelNumber !== existing.personnelNumber) {
      const taken = await prisma.employee.findFirst({
        where: { personnelNumber: input.personnelNumber, deletedAt: null, id: { not: id } },
      });
      if (taken) throw new ConflictError('Personalnummer ist bereits vergeben');
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(input.personnelNumber !== undefined && { personnelNumber: input.personnelNumber }),
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.mobile !== undefined && { mobile: input.mobile }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }),
        ...(input.street !== undefined && { street: input.street }),
        ...(input.zipCode !== undefined && { zipCode: input.zipCode }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.bankName !== undefined && { bankName: input.bankName }),
        ...(input.iban !== undefined && { iban: input.iban }),
        ...(input.bic !== undefined && { bic: input.bic }),
        ...(input.taxId !== undefined && { taxId: input.taxId }),
        ...(input.socialInsuranceId !== undefined && { socialInsuranceId: input.socialInsuranceId }),
        ...(input.healthInsurance !== undefined && { healthInsurance: input.healthInsurance }),
        ...(input.healthInsuranceId !== undefined && { healthInsuranceId: input.healthInsuranceId }),
        ...(input.employmentType !== undefined && { employmentType: input.employmentType }),
        ...(input.weeklyHours !== undefined && { weeklyHours: input.weeklyHours }),
        ...(input.contractStart !== undefined && { contractStart: input.contractStart ? new Date(input.contractStart) : null }),
        ...(input.contractEnd !== undefined && { contractEnd: input.contractEnd ? new Date(input.contractEnd) : null }),
        ...(input.hourlyRateBase !== undefined && { hourlyRateBase: input.hourlyRateBase }),
        ...(input.surchargeNight !== undefined && { surchargeNight: input.surchargeNight }),
        ...(input.surchargeSunday !== undefined && { surchargeSunday: input.surchargeSunday }),
        ...(input.surchargeHoliday !== undefined && { surchargeHoliday: input.surchargeHoliday }),
        ...(input.maxHoursPerDay !== undefined && { maxHoursPerDay: input.maxHoursPerDay }),
        ...(input.maxHoursPerWeek !== undefined && { maxHoursPerWeek: input.maxHoursPerWeek }),
        ...(input.preferredRegion !== undefined && { preferredRegion: input.preferredRegion }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });

    logger.info(`Mitarbeiter aktualisiert: ${employee.firstName} ${employee.lastName}`);

    return employee;
  }

  async delete(id: string, userId: string) {
    const employee = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    await prisma.employee.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'terminated',
      },
    });

    logger.info(`Mitarbeiter deaktiviert: ${employee.firstName} ${employee.lastName}`);
  }

  // ─── Qualifikationen ───

  async addQualification(
    employeeId: string,
    qualificationId: string,
    data: { obtainedDate: string; expiryDate?: string; certificateNumber?: string; notes?: string },
    userId: string
  ) {
    // Prüfen ob Mitarbeiter existiert
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null } });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    // Prüfen ob Qualifikation bereits zugewiesen
    const existing = await prisma.employeeQualification.findUnique({
      where: { employeeId_qualificationId: { employeeId, qualificationId } },
    });

    if (existing) {
      throw new ConflictError('Qualifikation ist bereits zugewiesen');
    }

    const eq = await prisma.employeeQualification.create({
      data: {
        employeeId,
        qualificationId,
        obtainedDate: new Date(data.obtainedDate),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        certificateNumber: data.certificateNumber,
        notes: data.notes,
        isVerified: false,
      },
      include: { qualification: true },
    });

    logger.info(`Qualifikation zugewiesen: ${employee.lastName} → ${eq.qualification.name}`);

    return eq;
  }

  async updateQualification(
    employeeId: string,
    qualificationId: string,
    data: { expiryDate?: string; certificateNumber?: string; isVerified?: boolean; notes?: string },
    userId: string
  ) {
    const eq = await prisma.employeeQualification.findUnique({
      where: { employeeId_qualificationId: { employeeId, qualificationId } },
    });

    if (!eq) throw new NotFoundError('Qualifikationszuweisung');

    const updated = await prisma.employeeQualification.update({
      where: { id: eq.id },
      data: {
        ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null }),
        ...(data.certificateNumber !== undefined && { certificateNumber: data.certificateNumber }),
        ...(data.isVerified !== undefined && { isVerified: data.isVerified, verifiedById: userId, verifiedAt: new Date() }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { qualification: true },
    });

    logger.info(`Qualifikation aktualisiert: ${updated.qualification.name}`);

    return updated;
  }

  async removeQualification(employeeId: string, qualificationId: string, userId: string) {
    const eq = await prisma.employeeQualification.findUnique({
      where: { employeeId_qualificationId: { employeeId, qualificationId } },
      include: { qualification: true },
    });

    if (!eq) throw new NotFoundError('Qualifikationszuweisung');

    await prisma.employeeQualification.delete({ where: { id: eq.id } });

    logger.info(`Qualifikation entfernt: ${eq.qualification.name}`);
  }

  // ─── Verfügbarkeiten ───

  async addAvailability(
    employeeId: string,
    data: { type: string; startDate: string; endDate: string; reason?: string },
    userId: string
  ) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null } });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    const availability = await prisma.availability.create({
      data: {
        employeeId,
        type: data.type as any,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        status: 'pending',
      },
    });

    logger.info(`Verfügbarkeit erstellt: ${data.type} für ${employee.lastName}`);

    return availability;
  }

  async approveAvailability(availabilityId: string, approved: boolean, userId: string) {
    const availability = await prisma.availability.update({
      where: { id: availabilityId },
      data: {
        status: approved ? 'approved' : 'rejected',
        approvedById: userId,
      },
    });

    logger.info(`Verfügbarkeit ${approved ? 'genehmigt' : 'abgelehnt'}: ${availabilityId}`);

    return availability;
  }
}

export const employeeService = new EmployeeService();
