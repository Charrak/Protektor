import api from './api';

export interface PayrollResult {
  employeeId: string;
  employeeName: string;
  period: { startDate: string; endDate: string };
  totalHours: string;
  regularPay: string;
  nightPay: string;
  sundayPay: string;
  holidayPay: string;
  totalPay: string;
  records: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: { companyName: string; customerNumber: string };
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  positionCount: number;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const billingService = {
  async calculatePayroll(employeeId: string, startDate: string, endDate: string): Promise<PayrollResult> {
    const { data } = await api.get<PayrollResult>(`/billing/payroll?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`);
    return data;
  },

  async generateInvoice(customerId: string, startDate: string, endDate: string): Promise<any> {
    const { data } = await api.post('/billing/invoices/generate', { customerId, startDate, endDate });
    return data;
  },

  async listInvoices(params?: {
    customerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<InvoiceListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const { data } = await api.get<InvoiceListResponse>(`/billing/invoices?${searchParams}`);
    return data;
  },
};
