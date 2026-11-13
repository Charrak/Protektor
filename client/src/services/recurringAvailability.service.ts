import api from './api';

export interface RecurringAvailability {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  validFrom: string;
  validUntil?: string | null;
  isActive: boolean;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

export interface CreateRecurringAvailabilityInput {
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  validFrom: string;
  validUntil?: string;
  notes?: string;
}

export const recurringAvailabilityService = {
  async listByEmployee(employeeId: string): Promise<RecurringAvailability[]> {
    const { data } = await api.get<RecurringAvailability[]>(`/recurring-availabilities/employee/${employeeId}`);
    return data;
  },
  async create(input: CreateRecurringAvailabilityInput): Promise<RecurringAvailability> {
    const { data } = await api.post<RecurringAvailability>('/recurring-availabilities', input);
    return data;
  },
  async approve(id: string, approved: boolean): Promise<RecurringAvailability> {
    const { data } = await api.put<RecurringAvailability>(`/recurring-availabilities/${id}/approve`, { approved });
    return data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/recurring-availabilities/${id}`);
  },
};
