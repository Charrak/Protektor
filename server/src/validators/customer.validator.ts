import { z } from 'zod';

// ═══════════════════════════════════════════════════
// KUNDEN-VALIDATOR
// ═══════════════════════════════════════════════════

export const customerCreateSchema = z.object({
  // Pflichtfelder (global, nicht konfigurierbar)
  companyName: z.string().min(1, 'Firmenname ist erforderlich').max(200),
  street: z.string().min(1, 'Straße ist erforderlich').max(200),
  zipCode: z.string().min(1, 'PLZ ist erforderlich').max(20),
  city: z.string().min(1, 'Stadt ist erforderlich').max(100),
  country: z.string().default('DE').max(100),
  
  // Rechnungsdaten (Pflicht für Rechnungsstellung)
  invoiceEmail: z.string().email('Ungültige E-Mail-Adresse').optional(),
  invoiceStreet: z.string().max(200).optional(),
  invoiceZipCode: z.string().max(20).optional(),
  invoiceCity: z.string().max(100).optional(),
  invoiceCountry: z.string().default('DE').max(100),
  invoiceRecipientName: z.string().max(200).optional(),
  invoicePhone: z.string().max(50).optional(),
  invoiceDeliveryMethod: z.enum(['email', 'portal', 'post']).default('email'),
  
  // Firmeninformationen
  legalForm: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  
  // Kontakt
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  website: z.string().url('Ungültige URL').optional(),
  
  // Steuerdaten
  taxNumber: z.string().max(50).optional(),
  vatId: z.string().max(50).optional().refine(
    (val) => !val || /^DE\d{9}$/.test(val),
    'USt-IdNr. muss das Format DE123456789 haben'
  ),
  
  // Vertragsdaten
  contractNumber: z.string().max(100).optional(),
  contractStartDate: z.string().datetime().optional(),
  contractEndDate: z.string().datetime().optional(),
  terminationNoticePeriod: z.number().int().min(0).default(90),
  billingType: z.enum(['hourly', 'perPost', 'lumpSum', 'mixed']).default('hourly'),
  billingInterval: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  
  // Zahlungsbedingungen
  paymentTerms: z.number().int().min(0).default(14),
  purchaseOrderNumber: z.string().max(100).optional(),
  
  // Sonstiges
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'prospect']).default('active'),
}).refine(
  (data) => {
    // Wenn invoiceEmail gesetzt ist, muss es eine gültige E-Mail sein
    if (data.invoiceDeliveryMethod === 'email' && !data.invoiceEmail) {
      return false;
    }
    return true;
  },
  {
    message: 'Rechnungs-E-Mail ist erforderlich bei Versand per E-Mail',
    path: ['invoiceEmail'],
  }
);

export const customerUpdateSchema = customerCreateSchema.partial();

// ═══════════════════════════════════════════════════
// KONTAKTPERSON-VALIDATOR
// ═══════════════════════════════════════════════════

export const contactPersonCreateSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich').max(100),
  lastName: z.string().min(1, 'Nachname ist erforderlich').max(100),
  role: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  isPrimary: z.boolean().default(false),
  isInvoiceContact: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  availability: z.string().max(200).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // Wenn isInvoiceContact true ist, muss email oder phone gesetzt sein
    if (data.isInvoiceContact && !data.email && !data.phone) {
      return false;
    }
    return true;
  },
  {
    message: 'Rechnungskontakt benötigt E-Mail oder Telefonnummer',
    path: ['isInvoiceContact'],
  }
);

export const contactPersonUpdateSchema = contactPersonCreateSchema.partial();

// ═══════════════════════════════════════════════════
// OBJEKT-VALIDATOR
// ═══════════════════════════════════════════════════

export const objectCreateSchema = z.object({
  name: z.string().min(1, 'Objektname ist erforderlich').max(200),
  street: z.string().max(200).optional(),
  zipCode: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  description: z.string().optional(),
  objectType: z.string().max(50).optional(),
  
  // Sicherheit & Zugang
  alarmNumber: z.string().max(50).optional(),
  keyDepot: z.string().optional(),
  accessCode: z.string().max(100).optional(),
  accessRegulations: z.string().optional(),
  specialInstructions: z.string().optional(),
  
  // Personal & Ausrüstung
  requiredPersonnel: z.number().int().min(1).default(1),
  equipmentRequirements: z.string().optional(),
  
  // Notfall & Alarm
  alarmPlan: z.string().optional(),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    role: z.string().optional(),
    availability: z.string().optional(),
  })).optional(),
  
  // Leistung
  serviceType: z.enum(['objectProtection', 'guardService', 'entryControl', 'patrolService', 'eventSecurity']).default('objectProtection'),
  
  isActive: z.boolean().default(true),
});

export const objectUpdateSchema = objectCreateSchema.partial();

// ═══════════════════════════════════════════════════
// RECHNUNGS-VALIDATOR
// ═══════════════════════════════════════════════════

export const invoiceCreateSchema = z.object({
  customerId: z.string().uuid(),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  
  purchaseOrderNumber: z.string().max(100).optional(),
  billingContactId: z.string().uuid().optional(),
  
  subtotal: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(19),
  taxAmount: z.number().min(0),
  totalAmount: z.number().min(0),
  
  deliveryMethod: z.enum(['email', 'portal', 'post']).default('email'),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // dueDate muss nach invoiceDate sein
    if (new Date(data.dueDate) <= new Date(data.invoiceDate)) {
      return false;
    }
    return true;
  },
  {
    message: 'Fälligkeitsdatum muss nach Rechnungsdatum liegen',
    path: ['dueDate'],
  }
).refine(
  (data) => {
    // periodEnd muss nach periodStart sein
    if (new Date(data.periodEnd) <= new Date(data.periodStart)) {
      return false;
    }
    return true;
  },
  {
    message: 'Leistungszeitraum-Ende muss nach -Anfang liegen',
    path: ['periodEnd'],
  }
);

// ═══════════════════════════════════════════════════
// SCHICHTBERICHT-VALIDATOR
// ═══════════════════════════════════════════════════

export const shiftReportCreateSchema = z.object({
  customerId: z.string().uuid(),
  objectId: z.string().uuid(),
  deploymentId: z.string().uuid().optional(),
  
  reportDate: z.string().datetime(),
  shiftStart: z.string().datetime(),
  shiftEnd: z.string().datetime(),
  personnelCount: z.number().int().min(1).default(1),
  
  generalNotes: z.string().optional(),
  incidents: z.array(z.object({
    time: z.string(),
    type: z.string(),
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  })).optional(),
  specialTasks: z.array(z.object({
    task: z.string(),
    completed: z.boolean(),
    notes: z.string().optional(),
  })).optional(),
  handoverNotes: z.string().optional(),
  
  patrolChecks: z.array(z.object({
    location: z.string(),
    time: z.string(),
    status: z.enum(['OK', 'ISSUE', 'ALERT']),
    notes: z.string().optional(),
  })).optional(),
  
  attachmentUrls: z.array(z.string().url()).optional(),
  
  reportedById: z.string().uuid(),
});

// ═══════════════════════════════════════════════════
// KUNDEN-PORTAL-VALIDATOR
// ═══════════════════════════════════════════════════

export const customerUserCreateSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  firstName: z.string().min(1, 'Vorname ist erforderlich').max(100),
  lastName: z.string().min(1, 'Nachname ist erforderlich').max(100),
  contactPersonId: z.string().uuid().optional(),
  role: z.enum(['invoiceViewer', 'reportViewer', 'fullAccess', 'admin']).default('invoiceViewer'),
  
  canViewInvoices: z.boolean().default(true),
  canViewDeployments: z.boolean().default(false),
  canViewTimeRecords: z.boolean().default(false),
  canViewReports: z.boolean().default(false),
  canApproveRecords: z.boolean().default(false),
});

// ═══════════════════════════════════════════════════
// MAHNUNGS-VALIDATOR
// ═══════════════════════════════════════════════════

export const reminderCreateSchema = z.object({
  invoiceId: z.string().uuid(),
  customerId: z.string().uuid(),
  reminderLevel: z.enum(['reminder1', 'reminder2', 'reminder3']),
  reminderDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  amountDue: z.number().min(0),
  lateFees: z.number().min(0).default(0),
  subject: z.string().min(1).max(200),
  message: z.string().min(1),
  notes: z.string().optional(),
  sentVia: z.enum(['email', 'post', 'portal']).optional(),
}).refine(
  (data) => {
    // dueDate muss nach reminderDate sein
    if (new Date(data.dueDate) <= new Date(data.reminderDate)) {
      return false;
    }
    return true;
  },
  {
    message: 'Neues Fälligkeitsdatum muss nach Mahndatum liegen',
    path: ['dueDate'],
  }
);

// ═══════════════════════════════════════════════════
// EXPORT-TYPEN
// ═══════════════════════════════════════════════════

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type ContactPersonCreateInput = z.infer<typeof contactPersonCreateSchema>;
export type ContactPersonUpdateInput = z.infer<typeof contactPersonUpdateSchema>;
export type ObjectCreateInput = z.infer<typeof objectCreateSchema>;
export type ObjectUpdateInput = z.infer<typeof objectUpdateSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type ShiftReportCreateInput = z.infer<typeof shiftReportCreateSchema>;
export type CustomerUserCreateInput = z.infer<typeof customerUserCreateSchema>;
export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;
