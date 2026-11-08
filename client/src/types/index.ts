// ─── Auth & User ───
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: string;
    name: string;
    slug: string;
  };
  permissions: string[];
  lastLogin?: string;
}

// ─── Employee ───
export interface Employee {
  id: string;
  personnelNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  employmentType?: 'full_time' | 'part_time' | 'mini_job' | 'freelance';
  weeklyHours?: number;
  hourlyRateBase?: number;
}

// ─── Customer ───
export interface Customer {
  id: string;
  customerNumber: string;
  companyName: string;
  city?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'prospect';
}

// ─── Object ───
export interface SMSObject {
  id: string;
  objectNumber: string;
  name: string;
  customerId: string;
  customer?: Customer;
  objectType?: string;
  city?: string;
}

// ─── Deployment ───
export interface Deployment {
  id: string;
  objectId: string;
  object?: SMSObject;
  employeeId: string;
  employee?: Employee;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isNightShift: boolean;
  isSunday: boolean;
  isHoliday: boolean;
  status: 'planned' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  version: number;
}

// ─── Lock ───
export interface Lock {
  id: string;
  resourceType: string;
  resourceId: string;
  lockedBy: {
    name: string;
    role: string;
  };
  acquiredAt: string;
  expiresAt: string;
}

// ─── Notification ───
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Time Record ───
export interface TimeRecord {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  clockIn: string;
  clockOut?: string;
  breakDuration: number;
  totalHours?: number;
  status: 'open' | 'completed' | 'approved' | 'rejected';
}

// ─── Dashboard ───
export interface DashboardStats {
  activeEmployees: number;
  todaysDeployments: number;
  openShifts: number;
  sickToday: number;
  monthlyRevenue: number;
  pendingApprovals: number;
}
