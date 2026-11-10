import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';

// Alle Felder als any für Flexibilität - Prisma validiert die Typen
interface CreateEmployeeInput {
  [key: string]: any;
  personnelNumber: string;
  firstName: string;
  lastName: string;
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

  async create(input: CreateEmployeeInput, userId: string, tenantId?: string) {
    if (!tenantId) {
      throw new ValidationError('Tenant-ID erforderlich');
    }
    // Prüfen ob Personalnummer bereits vergeben
    const existing = await prisma.employee.findFirst({
      where: { personnelNumber: input.personnelNumber, deletedAt: null },
    });

    if (existing) {
      throw new ConflictError('Personalnummer ist bereits vergeben');
    }

    // Helper für optionale Date-Konvertierung
    const toDate = (v: any) => v ? new Date(v) : null;
    const toDec = (v: any) => v !== undefined && v !== null && v !== '' ? Number(v) : null;
    const toInt = (v: any) => v !== undefined && v !== null && v !== '' ? parseInt(v) : null;

    const employee = await prisma.employee.create({
      data: {
        tenantId,
        personnelNumber: input.personnelNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        // Persönlich
        email: input.email || null,
        phone: input.phone || null,
        mobile: input.mobile || null,
        gender: input.gender || null,
        dateOfBirth: toDate(input.dateOfBirth),
        birthPlace: input.birthPlace || null,
        nationality: input.nationality || null,
        maritalStatus: input.maritalStatus || null,
        // Adresse
        street: input.street || null,
        zipCode: input.zipCode || null,
        city: input.city || null,
        country: input.country || 'DE',
        // Notfallkontakt
        emergencyContactName: input.emergencyContactName || null,
        emergencyContactPhone: input.emergencyContactPhone || null,
        emergencyContactRelation: input.emergencyContactRelation || null,
        // Bank
        bankName: input.bankName || null,
        iban: input.iban || null,
        bic: input.bic || null,
        // Steuern & Versicherung
        taxId: input.taxId || null,
        taxClass: input.taxClass || null,
        religion: input.religion || null,
        children: toInt(input.children) ?? 0,
        socialInsuranceId: input.socialInsuranceId || null,
        pensionInsuranceId: input.pensionInsuranceId || null,
        healthInsurance: input.healthInsurance || null,
        healthInsuranceId: input.healthInsuranceId || null,
        healthInsuranceType: input.healthInsuranceType || null,
        // Vertrag
        employmentType: input.employmentType || null,
        contractType: input.contractType || null,
        weeklyHours: toDec(input.weeklyHours),
        contractStart: toDate(input.contractStart),
        contractEnd: toDate(input.contractEnd),
        probationMonths: toInt(input.probationMonths),
        vacationDays: toInt(input.vacationDays) ?? 30,
        department: input.department || null,
        position: input.position || null,
        costCenter: input.costCenter || null,
        // Vergütung
        hourlyRateBase: toDec(input.hourlyRateBase),
        monthlySalary: toDec(input.monthlySalary),
        surchargeNight: toDec(input.surchargeNight) ?? 0,
        surchargeSunday: toDec(input.surchargeSunday) ?? 0,
        surchargeHoliday: toDec(input.surchargeHoliday) ?? 0,
        maxHoursPerDay: toDec(input.maxHoursPerDay) ?? 10,
        maxHoursPerWeek: toDec(input.maxHoursPerWeek) ?? 48,
        preferredRegion: input.preferredRegion || null,
        // Zusatz
        driverLicense: input.driverLicense || null,
        languages: input.languages || null,
        uniformSize: input.uniformSize || null,
        shoeSize: toDec(input.shoeSize),
        // §34a GewO
        bewachungserlaubnisNr: input.bewachungserlaubnisNr || null,
        bewachungserlaubnisExpiry: toDate(input.bewachungserlaubnisExpiry),
        bewachungserlaubnisAuthority: input.bewachungserlaubnisAuthority || null,
        unterrichtungDatum: toDate(input.unterrichtungDatum),
        unterrichtungAuthority: input.unterrichtungAuthority || null,
        sachkundeDatum: toDate(input.sachkundeDatum),
        sachkundeNr: input.sachkundeNr || null,
        fuehrungszeugnisDatum: toDate(input.fuehrungszeugnisDatum),
        fuehrungszeugnisArt: input.fuehrungszeugnisArt || null,
        zuverlaessigkeetspruefung: toDate(input.zuverlaessigkeetspruefung),
        unterweisungDatum: toDate(input.unterweisungDatum),
        unterweisungNext: toDate(input.unterweisungNext),
        // Qualifikationen
        waffensachkunde: input.waffensachkunde || false,
        waffensachkundeExpiry: toDate(input.waffensachkundeExpiry),
        waffensachkundeNr: input.waffensachkundeNr || null,
        ersteHilfeCertified: input.ersteHilfeCertified || false,
        ersteHilfeExpiry: toDate(input.ersteHilfeExpiry),
        ersteHilfeHours: toInt(input.ersteHilfeHours),
        sicherheitsstufe: toInt(input.sicherheitsstufe) ?? 1,
        hundefuehrer: input.hundefuehrer || false,
        hundefuehrerExpiry: toDate(input.hundefuehrerExpiry),
        brandschutzbeauftragter: input.brandschutzbeauftragter || false,
        brandschutzExpiry: toDate(input.brandschutzExpiry),
        ersteHilfeTrainer: input.ersteHilfeTrainer || false,
        // Sonstiges
        notes: input.notes || null,
        photoUrl: input.photoUrl || null,
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

    const toDate = (v: any) => v ? new Date(v) : null;
    const toDec = (v: any) => v !== undefined && v !== null && v !== '' ? Number(v) : null;
    const toInt = (v: any) => v !== undefined && v !== null && v !== '' ? parseInt(v) : null;

    // Generischer Update-Data-Builder
    const updateData: any = {};
    
    // Für jedes Feld im Input: prüfen ob es definiert ist und zum Schema passt
    const strFields = ['personnelNumber','firstName','lastName','email','phone','mobile','birthPlace','nationality',
      'street','zipCode','city','country','emergencyContactName','emergencyContactPhone','emergencyContactRelation',
      'bankName','iban','bic','taxId','socialInsuranceId','pensionInsuranceId','healthInsurance','healthInsuranceId',
      'department','position','costCenter','preferredRegion','driverLicense','languages','uniformSize','notes','photoUrl',
      'bewachungserlaubnisNr','bewachungserlaubnisAuthority','unterrichtungAuthority','sachkundeNr',
      'fuehrungszeugnisArt','waffensachkundeNr'];
    
    const enumFields = ['gender','maritalStatus','taxClass','religion','healthInsuranceType',
      'employmentType','contractType','status'];
    
    const dateFields = ['dateOfBirth','contractStart','contractEnd',
      'bewachungserlaubnisExpiry','unterrichtungDatum','sachkundeDatum',
      'fuehrungszeugnisDatum','zuverlaessigkeetspruefung','unterweisungDatum','unterweisungNext',
      'waffensachkundeExpiry','ersteHilfeExpiry','hundefuehrerExpiry','brandschutzExpiry'];
    
    const decFields = ['weeklyHours','hourlyRateBase','monthlySalary','surchargeNight','surchargeSunday','surchargeHoliday',
      'maxHoursPerDay','maxHoursPerWeek','shoeSize'];
    
    const intFields = ['children','probationMonths','vacationDays','ersteHilfeHours','sicherheitsstufe'];
    
    const boolFields = ['waffensachkunde','ersteHilfeCertified','hundefuehrer','brandschutzbeauftragter','ersteHilfeTrainer'];

    for (const f of strFields) {
      if (f in input) updateData[f] = input[f] || null;
    }
    for (const f of enumFields) {
      if (f in input) updateData[f] = input[f] || null;
    }
    for (const f of dateFields) {
      if (f in input) updateData[f] = toDate(input[f]);
    }
    for (const f of decFields) {
      if (f in input) {
        const v = toDec(input[f]);
        if (v !== null) updateData[f] = v;
      }
    }
    for (const f of intFields) {
      if (f in input) {
        const v = toInt(input[f]);
        if (v !== null) updateData[f] = v;
      }
    }
    for (const f of boolFields) {
      if (f in input) updateData[f] = Boolean(input[f]);
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
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
