import api from './api';

export interface PlatformAdmin {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Tenant {
  id: string;
  tenantId: string;
  companyName: string;
  contactEmail: string;
  licenseStatus: 'TEST' | 'ACTIVE' | 'PAYMENT_PENDING' | 'GRACE_PERIOD' | 'RESTRICTED' | 'SUSPENDED' | 'CANCELLED';
  isActive: boolean;
  employeeCount: number;
  userCount: number;
  employeeLimit?: number;
  currentSubscription?: {
    planName: string;
    status: string;
    billingInterval: string;
    currentPeriodEnd: string;
  };
  createdAt: string;
}

export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  yearlyRecurringRevenue: number;
}

export const platformService = {
  // ─── Authentifizierung ───
  async login(username: string, password: string): Promise<{ admin: PlatformAdmin; sessionId: string }> {
    const { data } = await api.post('/platform/auth/login', { username, password });
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/platform/auth/logout');
  },

  async getMe(): Promise<PlatformAdmin> {
    const { data } = await api.get('/platform/auth/me');
    return data;
  },

  // ─── Dashboard ───
  async getDashboard(): Promise<DashboardStats> {
    const { data } = await api.get('/platform/dashboard');
    return data;
  },

  // ─── Mandanten ───
  async listTenants(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<TenantListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const { data } = await api.get<TenantListResponse>(`/platform/tenants?${searchParams}`);
    return data;
  },

  async getTenant(id: string): Promise<any> {
    const { data } = await api.get(`/platform/tenants/${id}`);
    return data;
  },

  async createTenant(input: {
    companyName: string;
    contactEmail: string;
    contactPhone?: string;
    employeeLimit?: number;
    planId?: string;
    trialDays?: number;
  }): Promise<any> {
    const { data } = await api.post('/platform/tenants', input);
    return data;
  },

  async updateTenant(id: string, input: any): Promise<any> {
    const { data } = await api.put(`/platform/tenants/${id}`, input);
    return data;
  },

  async updateLicenseStatus(id: string, status: string): Promise<any> {
    const { data } = await api.put(`/platform/tenants/${id}/license`, { status });
    return data;
  },
};
