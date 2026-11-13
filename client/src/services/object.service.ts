import api from './api';

export interface SMSObject {
  id: string;
  objectNumber: string;
  customerId: string;
  name: string;
  street?: string;
  zipCode?: string;
  city?: string;
  description?: string;
  objectType?: string;
  contactPersonId?: string;
  alarmNumber?: string;
  keyDepot?: string;
  accessCode?: string;
  accessRegulations?: string;
  specialInstructions?: string;
  requiredPersonnel?: number;
  equipmentRequirements?: string;
  alarmPlan?: string;
  serviceType?: 'objectProtection' | 'guardService' | 'entryControl' | 'patrolService' | 'eventSecurity';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectListItem {
  id: string;
  objectNumber: string;
  name: string;
  city?: string;
  objectType?: string;
  isActive: boolean;
  customer: {
    id: string;
    companyName: string;
    customerNumber: string;
  };
  requirementCount: number;
  deploymentCount: number;
}

export interface ObjectListResponse {
  objects: ObjectListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ObjectRequirement {
  id?: string;
  qualificationId: string;
  isMandatory: boolean;
  notes?: string | null;
  qualification?: { id: string; name: string; category?: string | null; color?: string | null };
}

export interface ObjectDetail extends SMSObject {
  customer: any;
  contactPerson?: any;
  requirements: ObjectRequirement[];
  deployments?: any[];
}

export const objectService = {
  async list(params?: {
    search?: string;
    customerId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ObjectListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const { data } = await api.get<ObjectListResponse>(`/objects?${searchParams}`);
    return data;
  },

  async getById(id: string): Promise<ObjectDetail> {
    const { data } = await api.get<ObjectDetail>(`/objects/${id}`);
    return data;
  },

  async create(input: Partial<SMSObject>): Promise<SMSObject> {
    const { data } = await api.post<SMSObject>('/objects', input);
    return data;
  },

  async update(id: string, input: Partial<SMSObject>): Promise<SMSObject> {
    const { data } = await api.put<SMSObject>(`/objects/${id}`, input);
    return data;
  },

  async setRequirements(id: string, requirements: ObjectRequirement[]): Promise<void> {
    await api.put(`/objects/${id}/requirements`, { requirements });
  },
};
