import api from './api';

export interface Customer {
  id: string;
  customerNumber: string;
  companyName: string;
  department?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  taxNumber?: string;
  vatId?: string;
  paymentTerms?: number;
  notes?: string;
  status: 'active' | 'inactive' | 'prospect';
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListItem {
  id: string;
  customerNumber: string;
  companyName: string;
  city?: string;
  phone?: string;
  email?: string;
  status: string;
  objectCount: number;
  contactCount: number;
}

export interface CustomerListResponse {
  customers: CustomerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContactPerson {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  role?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  isPrimary: boolean;
  notes?: string;
}

export interface CustomerDetail extends Customer {
  contactPersons: ContactPerson[];
  objects: any[];
  rates: any[];
}

export const customerService = {
  async list(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<CustomerListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const { data } = await api.get<CustomerListResponse>(`/customers?${searchParams}`);
    return data;
  },

  async getById(id: string): Promise<CustomerDetail> {
    const { data } = await api.get<CustomerDetail>(`/customers/${id}`);
    return data;
  },

  async create(input: Partial<Customer>): Promise<Customer> {
    const { data } = await api.post<Customer>('/customers', input);
    return data;
  },

  async update(id: string, input: Partial<Customer>): Promise<Customer> {
    const { data } = await api.put<Customer>(`/customers/${id}`, input);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },

  async addContactPerson(customerId: string, input: Partial<ContactPerson>): Promise<ContactPerson> {
    const { data } = await api.post<ContactPerson>(`/customers/${customerId}/contacts`, input);
    return data;
  },

  async updateContactPerson(customerId: string, contactId: string, input: Partial<ContactPerson>): Promise<ContactPerson> {
    const { data } = await api.put<ContactPerson>(`/customers/${customerId}/contacts/${contactId}`, input);
    return data;
  },

  async deleteContactPerson(customerId: string, contactId: string): Promise<void> {
    await api.delete(`/customers/${customerId}/contacts/${contactId}`);
  },
};
