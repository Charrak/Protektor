import api from './api';

export interface Employee {
  id: string;
  personnelNumber: string;
  firstName: string;
  lastName: string;
  // Persönlich
  dateOfBirth?: string;
  birthPlace?: string;
  gender?: 'male' | 'female' | 'diverse';
  nationality?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'civil_partnership';
  // Adresse
  street?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  // Kontakt
  phone?: string;
  mobile?: string;
  email?: string;
  // Notfallkontakt
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  // Bank
  bankName?: string;
  iban?: string;
  bic?: string;
  // Steuern & Versicherung
  taxId?: string;
  taxClass?: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  religion?: 'none' | 'catholic' | 'protestant' | 'other';
  children?: number;
  socialInsuranceId?: string;
  pensionInsuranceId?: string;
  healthInsurance?: string;
  healthInsuranceId?: string;
  healthInsuranceType?: 'statutory' | 'private' | 'family';
  // Vertrag
  employmentType?: 'full_time' | 'part_time' | 'mini_job' | 'freelance';
  contractType?: 'permanent' | 'fixed_term' | 'temp' | 'working_student';
  weeklyHours?: number;
  contractStart?: string;
  contractEnd?: string;
  probationMonths?: number;
  vacationDays?: number;
  department?: string;
  position?: string;
  costCenter?: string;
  // Vergütung
  hourlyRateBase?: number;
  monthlySalary?: number;
  surchargeNight?: number;
  surchargeSunday?: number;
  surchargeHoliday?: number;
  maxHoursPerDay?: number;
  maxHoursPerWeek?: number;
  preferredRegion?: string;
  // Zusatz
  driverLicense?: string;
  languages?: string;
  uniformSize?: string;
  shoeSize?: number;
  // §34a GewO
  bewachungserlaubnisNr?: string;
  bewachungserlaubnisExpiry?: string;
  bewachungserlaubnisAuthority?: string;
  unterrichtungDatum?: string;
  unterrichtungAuthority?: string;
  sachkundeDatum?: string;
  sachkundeNr?: string;
  fuehrungszeugnisDatum?: string;
  fuehrungszeugnisArt?: string;
  zuverlaessigkeetspruefung?: string;
  unterweisungDatum?: string;
  unterweisungNext?: string;
  // Qualifikationen
  waffensachkunde?: boolean;
  waffensachkundeExpiry?: string;
  waffensachkundeNr?: string;
  ersteHilfeCertified?: boolean;
  ersteHilfeExpiry?: string;
  ersteHilfeHours?: number;
  sicherheitsstufe?: number;
  hundefuehrer?: boolean;
  hundefuehrerExpiry?: string;
  brandschutzbeauftragter?: boolean;
  brandschutzExpiry?: string;
  ersteHilfeTrainer?: boolean;
  // Sonstiges
  notes?: string;
  photoUrl?: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListItem {
  id: string;
  personnelNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: string;
  employmentType?: string;
  qualifications: Array<{
    id: string;
    name: string;
    category?: string;
    expiryDate?: string;
  }>;
}

export interface EmployeeListResponse {
  employees: EmployeeListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Qualification {
  id: string;
  name: string;
  category?: string;
  validityDays?: number;
  color?: string;
  requiresRenewal: boolean;
}

export interface EmployeeQualification {
  id: string;
  employeeId: string;
  qualificationId: string;
  obtainedDate: string;
  expiryDate?: string;
  certificateNumber?: string;
  isVerified: boolean;
  verifiedAt?: string;
  notes?: string;
  qualification: Qualification;
}

export interface Availability {
  id: string;
  employeeId: string;
  type: 'available' | 'vacation' | 'sick' | 'personal' | 'training' | 'other';
  startDate: string;
  endDate: string;
  allDay: boolean;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface EmployeeDetail extends Employee {
  qualifications: EmployeeQualification[];
  documents: any[];
  availabilities: Availability[];
}

export const employeeService = {
  async list(params?: {
    search?: string;
    status?: string;
    employmentType?: string;
    page?: number;
    limit?: number;
  }): Promise<EmployeeListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.employmentType) searchParams.set('employmentType', params.employmentType);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const { data } = await api.get<EmployeeListResponse>(`/employees?${searchParams}`);
    return data;
  },

  async getById(id: string): Promise<EmployeeDetail> {
    const { data } = await api.get<EmployeeDetail>(`/employees/${id}`);
    return data;
  },

  async create(input: Partial<Employee>): Promise<Employee> {
    const { data } = await api.post<Employee>('/employees', input);
    return data;
  },

  async update(id: string, input: Partial<Employee>): Promise<Employee> {
    const { data } = await api.put<Employee>(`/employees/${id}`, input);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/employees/${id}`);
  },

  // Qualifikationen
  async addQualification(
    employeeId: string,
    input: { qualificationId: string; obtainedDate: string; expiryDate?: string; certificateNumber?: string; notes?: string }
  ): Promise<EmployeeQualification> {
    const { data } = await api.post<EmployeeQualification>(`/employees/${employeeId}/qualifications`, input);
    return data;
  },

  async updateQualification(
    employeeId: string,
    qualificationId: string,
    input: { expiryDate?: string; certificateNumber?: string; isVerified?: boolean; notes?: string }
  ): Promise<EmployeeQualification> {
    const { data } = await api.put<EmployeeQualification>(`/employees/${employeeId}/qualifications/${qualificationId}`, input);
    return data;
  },

  async removeQualification(employeeId: string, qualificationId: string): Promise<void> {
    await api.delete(`/employees/${employeeId}/qualifications/${qualificationId}`);
  },

  // Verfügbarkeiten
  async addAvailability(
    employeeId: string,
    input: { type: string; startDate: string; endDate: string; reason?: string }
  ): Promise<Availability> {
    const { data } = await api.post<Availability>(`/employees/${employeeId}/availabilities`, input);
    return data;
  },

  async approveAvailability(employeeId: string, availabilityId: string, approved: boolean): Promise<Availability> {
    const { data } = await api.put<Availability>(`/employees/${employeeId}/availabilities/${availabilityId}/approve`, { approved });
    return data;
  },
};

export const qualificationService = {
  async list(): Promise<Qualification[]> {
    const { data } = await api.get<Qualification[]>('/qualifications');
    return data;
  },

  async getExpiring(days: number = 90): Promise<any[]> {
    const { data } = await api.get(`/qualifications/expiring?days=${days}`);
    return data;
  },
};
