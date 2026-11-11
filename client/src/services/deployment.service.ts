import api from './api';

export interface Deployment {
  id: string;
  objectId: string;
  object: { id: string; name: string; customerName: string };
  employeeId: string;
  employee: { id: string; firstName: string; lastName: string; personnelNumber: string };
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isNightShift: boolean;
  isSunday: boolean;
  isHoliday: boolean;
  status: 'planned' | 'released' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'no_show';
  version: number;
  shift?: { id: string; name: string } | null;
  notes?: string;
}

export interface DeploymentListResponse {
  deployments: Deployment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const deploymentService = {
  async list(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    objectId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<DeploymentListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set('date', params.date);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.employeeId) searchParams.set('employeeId', params.employeeId);
    if (params?.objectId) searchParams.set('objectId', params.objectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const { data } = await api.get<DeploymentListResponse>(`/deployments?${searchParams}`);
    return data;
  },

  async getById(id: string): Promise<Deployment> {
    const { data } = await api.get<Deployment>(`/deployments/${id}`);
    return data;
  },

  async create(input: Partial<Deployment>): Promise<Deployment> {
    const { data } = await api.post<Deployment>('/deployments', input);
    return data;
  },

  async update(id: string, input: Partial<Deployment>): Promise<Deployment> {
    const { data } = await api.put<Deployment>(`/deployments/${id}`, input);
    return data;
  },

  async cancel(id: string, reason: string): Promise<Deployment> {
    const { data } = await api.post<Deployment>(`/deployments/${id}/cancel`, { reason });
    return data;
  },

  async confirm(id: string): Promise<Deployment> {
    const { data } = await api.post<Deployment>(`/deployments/${id}/confirm`);
    return data;
  },

  async decline(id: string, reason?: string): Promise<Deployment> {
    const { data } = await api.post<Deployment>(`/deployments/${id}/decline`, { reason });
    return data;
  },

  async release(ids: string[]): Promise<{ success: boolean; count: number }> {
    const { data } = await api.post<{ success: boolean; count: number }>('/deployments/release', { ids });
    return data;
  },

  async getForDateRange(startDate: string, endDate: string): Promise<Deployment[]> {
    const { data } = await api.get<Deployment[]>(`/deployments/range?startDate=${startDate}&endDate=${endDate}`);
    return data;
  },
};
