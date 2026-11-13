import api from './api';

export interface TimeRecord {
  id: string;
  employeeId: string;
  employee: { id: string; firstName: string; lastName: string; personnelNumber: string };
  object?: { name: string; objectNumber?: string } | null;
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
  status: 'open' | 'completed' | 'corrected' | 'approved' | 'released' | 'billed' | 'rejected' | 'locked' | 'voided';
  originalClockIn?: string | null;
  originalClockOut?: string | null;
  originalBreakDuration?: number | null;
  correctionReasonCategory?: string | null;
  voidReason?: string | null;
  deploymentId?: string;
  notes?: string;
  isLocked?: boolean;
  updatedAt?: string;
}

export interface TimeRecordListResponse {
  records: TimeRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function getStampLocation(direction: 'in' | 'out'): Promise<{ clockInLatitude?: number; clockInLongitude?: number; clockOutLatitude?: number; clockOutLongitude?: number }> {
  if (!navigator.geolocation) return {};
  const position = await new Promise<GeolocationPosition | null>(resolve => {
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
  });
  if (!position) return {};
  return direction === 'in'
    ? { clockInLatitude: position.coords.latitude, clockInLongitude: position.coords.longitude }
    : { clockOutLatitude: position.coords.latitude, clockOutLongitude: position.coords.longitude };
}

export const attendanceService = {
  async exportHours(params: { dateFrom: string; dateTo: string; groupBy: 'employee' | 'object'; format: 'csv' | 'pdf'; employeeId?: string; objectId?: string }) {
    const search = new URLSearchParams({ dateFrom: params.dateFrom, dateTo: params.dateTo, groupBy: params.groupBy, format: params.format });
    if (params.employeeId) search.set('employeeId', params.employeeId);
    if (params.objectId) search.set('objectId', params.objectId);
    const response = await api.get(`/time-records/export/hours?${search.toString()}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a'); link.href = url;
    link.download = `stunden-${params.groupBy === 'employee' ? 'mitarbeiter' : 'objekt'}.${params.format}`; link.click(); URL.revokeObjectURL(url);
  },

  async summary(params?: { startDate?: string; endDate?: string; employeeId?: string; objectId?: string }) {
    const search = new URLSearchParams();
    if (params?.startDate) search.set('startDate', params.startDate);
    if (params?.endDate) search.set('endDate', params.endDate);
    if (params?.employeeId) search.set('employeeId', params.employeeId);
    if (params?.objectId) search.set('objectId', params.objectId);
    const { data } = await api.get(`/time-records/summary?${search.toString()}`);
    return data as { total: number; totalHours: number; byStatus: Record<string, number>; employeeHours: Array<{ employeeId: string; employeeName: string; hours: number; plannedHours: number; varianceHours: number; records: number }>; objects: Array<{ id: string; name: string }>; warnings: Array<{ recordId: string; employeeName: string; date: string; type: string; message: string }> };
  },

  async list(params?: {
    employeeId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    objectId?: string;
    page?: number;
    limit?: number;
  }): Promise<TimeRecordListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.employeeId) searchParams.set('employeeId', params.employeeId);
    if (params?.date) searchParams.set('date', params.date);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.objectId) searchParams.set('objectId', params.objectId);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const { data } = await api.get<TimeRecordListResponse>(`/time-records?${searchParams}`);
    return data;
  },

  async clockIn(employeeId: string, deploymentId?: string): Promise<TimeRecord> {
    const location = await getStampLocation('in');
    const { data } = await api.post<TimeRecord>('/time-records/clock-in', { employeeId, deploymentId, clockIn: new Date().toISOString(), sourceType: 'app', sourceDevice: navigator.userAgent.slice(0, 100), ...location });
    return data;
  },

  async clockOut(recordId: string): Promise<TimeRecord> {
    const location = await getStampLocation('out');
    const { data } = await api.post<TimeRecord>(`/time-records/${recordId}/clock-out`, { clockOut: new Date().toISOString(), ...location });
    return data;
  },

  async audit(params?: { page?: number; limit?: number; search?: string; action?: string; dateFrom?: string; dateTo?: string; sort?: 'oldest' | 'newest' }) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)); });
    const { data } = await api.get(`/time-records/audit?${search.toString()}`);
    return data;
  },

  async listObjectAccess(params?: { userId?: string; objectId?: string }) {
    const search = new URLSearchParams();
    if (params?.userId) search.set('userId', params.userId);
    if (params?.objectId) search.set('objectId', params.objectId);
    const { data } = await api.get(`/time-records/access?${search.toString()}`);
    return data;
  },

  async setObjectAccess(input: { userId: string; objectId: string; canEdit: boolean; canApprove: boolean }) {
    const { data } = await api.put('/time-records/access', input);
    return data;
  },

  async removeObjectAccess(userId: string, objectId: string) {
    await api.delete(`/time-records/access/${encodeURIComponent(userId)}/${encodeURIComponent(objectId)}`);
  },

  async correctionRequests(status = 'pending') {
    const { data } = await api.get(`/time-records/correction-requests?status=${encodeURIComponent(status)}`);
    return data;
  },

  async resolveCorrectionRequest(recordId: string, correctionId: string, approve: boolean, comment: string) {
    const { data } = await api.put(`/time-records/${recordId}/correction-requests/${correctionId}`, { approve, comment });
    return data;
  },

  async history(recordId: string) {
    const { data } = await api.get(`/time-records/${recordId}/history`);
    return data;
  },

  async exportAudit(params?: { format?: 'csv' | 'pdf'; search?: string; employeeId?: string; objectId?: string; action?: string; dateFrom?: string; dateTo?: string; sort?: 'oldest' | 'newest' }) {
    const format = params?.format || 'csv';
    const search = new URLSearchParams({ format });
    Object.entries(params || {}).forEach(([key, value]) => { if (value) search.set(key, value); });
    const response = await api.get(`/time-records/audit?${search.toString()}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeiterfassung-protokoll.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  },

  async approve(recordId: string): Promise<TimeRecord> {
    const { data } = await api.post<TimeRecord>(`/time-records/${recordId}/approve`);
    return data;
  },

  async requestCorrection(recordId: string, request: { changes: Array<{ field: 'clockIn' | 'clockOut' | 'breakDuration' | 'notes'; value: string | number | null }>; comment: string; reasonCategory?: string }) {
    const { data } = await api.post(`/time-records/${recordId}/correction-request`, request);
    return data;
  },

  async correct(recordId: string, corrections: { field?: 'clockIn' | 'clockOut' | 'breakDuration' | 'notes'; value?: string | number | null; changes?: Array<{ field: 'clockIn' | 'clockOut' | 'breakDuration' | 'notes'; value: string | number | null }>; reason: string; reasonCategory?: string }): Promise<{ timeRecord: TimeRecord }> {
    const { data } = await api.post<{ timeRecord: TimeRecord }>(`/time-records/${recordId}/correct`, corrections);
    return data;
  },
};
