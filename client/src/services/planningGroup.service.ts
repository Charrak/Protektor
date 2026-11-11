import api from './api';

export interface PlanningGroup {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  color?: string;
  leadUserId?: string;
  leadDeputies: string[];
  leadUser?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  objects: PlanningGroupObject[];
  employees: PlanningGroupEmployee[];
}

export interface PlanningGroupObject {
  id: string;
  planningGroupId: string;
  objectId: string;
  sortOrder: number;
  object: {
    id: string;
    name: string;
    objectNumber: string;
    customerId: string;
    customer?: {
      id: string;
      companyName: string;
    };
  };
}

export interface PlanningGroupEmployee {
  id: string;
  planningGroupId: string;
  employeeId: string;
  isPrimary: boolean;
  sortOrder: number;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    personnelNumber: string;
  };
}

export interface CreatePlanningGroupInput {
  name: string;
  description?: string;
  color?: string;
  leadUserId?: string;
  leadDeputies?: string[];
  objectIds: string[];
  employeeIds: string[];
}

export interface UpdatePlanningGroupInput {
  name?: string;
  description?: string;
  color?: string;
  leadUserId?: string | null;
  leadDeputies?: string[];
  isActive?: boolean;
  objectIds?: string[];
  employeeIds?: string[];
}

export const planningGroupService = {
  /**
   * Erstellt eine neue Planungsgruppe
   */
  async create(input: CreatePlanningGroupInput): Promise<PlanningGroup> {
    const response = await api.post('/planning-groups', input);
    return response.data.data;
  },

  /**
   * Listet alle Planungsgruppen
   */
  async list(): Promise<PlanningGroup[]> {
    const response = await api.get('/planning-groups');
    return response.data.data;
  },

  /**
   * Holt eine einzelne Planungsgruppe
   */
  async getById(id: string): Promise<PlanningGroup> {
    const response = await api.get(`/planning-groups/${id}`);
    return response.data.data;
  },

  /**
   * Aktualisiert eine Planungsgruppe
   */
  async update(id: string, input: UpdatePlanningGroupInput): Promise<PlanningGroup> {
    const response = await api.put(`/planning-groups/${id}`, input);
    return response.data.data;
  },

  /**
   * Löscht eine Planungsgruppe
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/planning-groups/${id}`);
  },

  /**
   * Fügt Objekte zu einer Planungsgruppe hinzu
   */
  async addObjects(id: string, objectIds: string[]): Promise<PlanningGroup> {
    const response = await api.post(`/planning-groups/${id}/objects`, { objectIds });
    return response.data.data;
  },

  /**
   * Fügt Mitarbeiter zu einer Planungsgruppe hinzu
   */
  async addEmployees(id: string, employeeIds: string[]): Promise<PlanningGroup> {
    const response = await api.post(`/planning-groups/${id}/employees`, { employeeIds });
    return response.data.data;
  },

  /**
   * Entfernt Objekte aus einer Planungsgruppe
   */
  async removeObjects(id: string, objectIds: string[]): Promise<PlanningGroup> {
    const response = await api.delete(`/planning-groups/${id}/objects`, {
      data: { objectIds }
    });
    return response.data.data;
  },

  /**
   * Entfernt Mitarbeiter aus einer Planungsgruppe
   */
  async removeEmployees(id: string, employeeIds: string[]): Promise<PlanningGroup> {
    const response = await api.delete(`/planning-groups/${id}/employees`, {
      data: { employeeIds }
    });
    return response.data.data;
  }
};
