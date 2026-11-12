import api from './api';

export type ShiftSwapStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

export interface ShiftSwap {
  id: string;
  deploymentId: string;
  originalEmployeeId: string;
  reason: string;
  status: ShiftSwapStatus;
  requestedById: string;
  resolvedById?: string;
  replacementEmployeeId?: string;
  replacementDeploymentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  deployment: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    tenantId: string;
    objectId: string;
    employeeId: string;
    object?: {
      id: string;
      name: string;
      objectNumber?: string;
    };
    employee?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  originalEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    personnelNumber?: string;
  };
  replacementEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    personnelNumber?: string;
  };
  requestedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  resolvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateShiftSwapInput {
  deploymentId: string;
  reason: string;
  notes?: string;
}

export interface ApproveShiftSwapInput {
  replacementEmployeeId: string;
}

export const shiftSwapService = {
  /**
   * Erstellt eine neue Schichtwechsel-Anfrage
   */
  async createShiftSwap(input: CreateShiftSwapInput): Promise<ShiftSwap> {
    const response = await api.post<ShiftSwap>('/shift-swaps', input);
    return response.data;
  },

  /**
   * Holt alle Schichtwechsel-Anfragen
   */
  async getShiftSwaps(params?: {
    status?: ShiftSwapStatus;
    employeeId?: string;
    limit?: number;
  }): Promise<ShiftSwap[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.status) {
      queryParams.append('status', params.status);
    }
    if (params?.employeeId) {
      queryParams.append('employeeId', params.employeeId);
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    const response = await api.get<{ success: boolean; data: ShiftSwap[] }>(
      `/shift-swaps?${queryParams.toString()}`
    );
    return response.data.data;
  },

  /**
   * Holt eine einzelne Schichtwechsel-Anfrage
   */
  async getShiftSwapById(id: string): Promise<ShiftSwap> {
    const response = await api.get<{ success: boolean; data: ShiftSwap }>(`/shift-swaps/${id}`);
    return response.data.data;
  },

  /**
   * Genehmigt eine Schichtwechsel-Anfrage
   */
  async approveShiftSwap(id: string, input: ApproveShiftSwapInput): Promise<ShiftSwap> {
    const response = await api.post<ShiftSwap>(`/shift-swaps/${id}/approve`, input);
    return response.data;
  },

  /**
   * Lehnt eine Schichtwechsel-Anfrage ab
   */
  async declineShiftSwap(id: string, reason?: string): Promise<ShiftSwap> {
    const response = await api.post<ShiftSwap>(`/shift-swaps/${id}/decline`, { reason });
    return response.data;
  },

  /**
   * Storniert eine Schichtwechsel-Anfrage
   */
  async cancelShiftSwap(id: string): Promise<ShiftSwap> {
    const response = await api.post<ShiftSwap>(`/shift-swaps/${id}/cancel`);
    return response.data;
  },

  /**
   * Findet potenzielle Ersatz-Mitarbeiter für einen Einsatz
   */
  async findCandidates(deploymentId: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    personnelNumber?: string;
    qualifications: number;
  }[]> {
    const response = await api.get<{ success: boolean; data: any[] }>(
      `/shift-swaps/${deploymentId}/candidates`
    );
    return response.data.data;
  },
};
