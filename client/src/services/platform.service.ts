import axios from 'axios';

const api = axios.create({
  baseURL: '/api/platform',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - Token hinzufügen
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('platformToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor - 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('platformToken');
      window.location.href = '/platform/login';
    }
    return Promise.reject(error);
  }
);

export interface PlatformUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface PlatformAdmin extends PlatformUser {}

export interface Tenant {
  id: string;
  tenantId: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  licenseStatus: string;
  isActive: boolean;
  employeeCount: number;
  employeeLimit: number;
  userCount: number;
  createdAt: string;
  currentSubscription?: {
    planName: string;
    status: string;
    billingInterval: string;
    currentPeriodEnd: string;
  };
}

export interface Subscription {
  id: string;
  tenantId: string;
  tenant: {
    tenantId: string;
    companyName: string;
  };
  plan: {
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
  };
  status: string;
  billingInterval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  monthlyRevenue: number;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  employeeLimit?: number;
  features: any;
  isActive: boolean;
  subscriptionCount: number;
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
  // Auth
  async login(username: string, password: string) {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('platformToken', data.accessToken);
    return data;
  },

  async logout() {
    await api.post('/auth/logout');
    localStorage.removeItem('platformToken');
  },

  async getMe(): Promise<PlatformUser> {
    const { data } = await api.get('/auth/me');
    return data;
  },

  // Dashboard
  async getDashboard(): Promise<DashboardStats> {
    const { data } = await api.get('/dashboard');
    return data;
  },

  // Tenants
  async listTenants(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const { data } = await api.get('/tenants', { params });
    return data;
  },

  async getTenant(id: string): Promise<Tenant> {
    const { data } = await api.get(`/tenants/${id}`);
    return data;
  },

  async createTenant(input: {
    companyName: string;
    contactEmail: string;
    contactPhone?: string;
    employeeLimit?: number;
    planId?: string;
    trialDays?: number;
  }) {
    const { data } = await api.post('/tenants', input);
    return data;
  },

  async updateTenant(id: string, input: Partial<Tenant>) {
    const { data } = await api.put(`/tenants/${id}`, input);
    return data;
  },

  async updateLicenseStatus(id: string, status: string) {
    const { data } = await api.put(`/tenants/${id}/license`, { licenseStatus: status });
    return data;
  },

  // Subscriptions
  async listSubscriptions(params?: { tenantId?: string; status?: string }) {
    const { data } = await api.get('/subscriptions', { params });
    return data;
  },

  async createSubscription(input: {
    tenantId: string;
    planId: string;
    billingInterval: 'MONTHLY' | 'YEARLY';
    trialDays?: number;
  }) {
    const { data } = await api.post('/subscriptions', input);
    return data;
  },

  async cancelSubscription(id: string, atPeriodEnd: boolean = true) {
    const { data } = await api.post(`/subscriptions/${id}/cancel`, { atPeriodEnd });
    return data;
  },

  async reactivateSubscription(id: string) {
    const { data } = await api.post(`/subscriptions/${id}/reactivate`);
    return data;
  },

  // Plans
  async listPlans(activeOnly: boolean = false) {
    const { data } = await api.get('/plans', { params: { activeOnly } });
    return data;
  },

  async createPlan(input: {
    name: string;
    slug: string;
    description?: string;
    monthlyPrice: number;
    yearlyPrice: number;
    employeeLimit?: number;
    features?: any;
  }) {
    const { data } = await api.post('/plans', input);
    return data;
  },

  async updatePlan(id: string, input: Partial<Plan>) {
    const { data } = await api.put(`/plans/${id}`, input);
    return data;
  },

  async apiCall(endpoint: string, options: any = {}) {
    const response = await api.request({ url: endpoint, ...options });
    return response.data;
  },
  async deletePlan(id: string) {
    await api.delete(`/plans/${id}`);
  },
};
