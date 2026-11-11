import api from './api';

export interface TimePreference {
  id: string;
  tenantId: string;
  employeeId: string;
  type: 'preferred' | 'restricted' | 'requested';
  weekdays: number[];
  startTime: string | null;
  endTime: string | null;
  reason?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface TimeRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  type: 'day_off' | 'early_leave' | 'late_start' | 'extra_hours' | 'swap';
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateTimePreferenceInput {
  type: 'preferred' | 'restricted' | 'requested';
  weekdays: number[];
  startTime?: string;
  endTime?: string;
  reason?: string;
  priority?: number;
}

export interface CreateTimeRequestInput {
  type: 'day_off' | 'early_leave' | 'late_start' | 'extra_hours' | 'swap';
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason: string;
}

export const employeeTimePreferenceService = {
  /**
   * Zeitpräferenzen für Mitarbeiter
   */
  async listByEmployee(employeeId: string): Promise<TimePreference[]> {
    const response = await api.get(`/employees/${employeeId}/time-preferences`);
    return response.data.data;
  },

  async create(employeeId: string, input: CreateTimePreferenceInput): Promise<TimePreference> {
    const response = await api.post(`/employees/${employeeId}/time-preferences`, input);
    return response.data.data;
  },

  async update(id: string, input: Partial<CreateTimePreferenceInput>): Promise<TimePreference> {
    const response = await api.put(`/time-preferences/${id}`, input);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/time-preferences/${id}`);
  },

  /**
   * Zeit-Anfragen (Freiwünsche)
   */
  async listTimeRequestsByEmployee(employeeId: string): Promise<TimeRequest[]> {
    const response = await api.get(`/employees/${employeeId}/time-requests`);
    return response.data.data;
  },

  async createTimeRequest(employeeId: string, input: CreateTimeRequestInput): Promise<TimeRequest> {
    const response = await api.post(`/employees/${employeeId}/time-requests`, input);
    return response.data.data;
  },

  async approveTimeRequest(id: string, approved: boolean, rejectionReason?: string): Promise<TimeRequest> {
    const response = await api.post(`/time-requests/${id}/approve`, { approved, rejectionReason });
    return response.data.data;
  },
};
