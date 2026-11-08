import api from './api';

export interface TimeRecord {
  id: string;
  employeeId: string;
  employee: { id: string; name: string; personnelNumber: string };
  date: string;
  clockIn: string;
  clockOut?: string;
  breakDuration: number;
  regularHours?: number;
  nightHours?: number;
  sundayHours?: number;
  holidayHours?: number;
  overtimeHours?: number;
  totalHours?: number;
  status: 'open' | 'completed' | 'approved' | 'rejected';
  deploymentId?: string;
}

export interface TimeRecordListResponse {
  records: TimeRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const attendanceService = {
  async list(params?: {
    employeeId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<TimeRecordListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.employeeId) searchParams.set('employeeId', params.employeeId);
    if (params?.date) searchParams.set('date', params.date);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const { data } = await api.get<TimeRecordListResponse>(`/time-records?${searchParams}`);
    return data;
  },

  async clockIn(employeeId: string, deploymentId?: string): Promise<TimeRecord> {
    const { data } = await api.post<TimeRecord>('/time-records/clock-in', { employeeId, deploymentId });
    return data;
  },

  async clockOut(recordId: string): Promise<TimeRecord> {
    const { data } = await api.post<TimeRecord>(`/time-records/${recordId}/clock-out`);
    return data;
  },

  async approve(recordId: string): Promise<TimeRecord> {
    const { data } = await api.post<TimeRecord>(`/time-records/${recordId}/approve`);
    return data;
  },

  async correct(recordId: string, corrections: any): Promise<TimeRecord> {
    const { data } = await api.post<TimeRecord>(`/time-records/${recordId}/correct`, corrections);
    return data;
  },
};
