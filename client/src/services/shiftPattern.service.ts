import api from './api';

export interface ShiftPattern {
  id: string;
  objectId: string;
  name: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  breakMinutes: number;
  requiredPersonnel: number;
  notes?: string;
  isActive: boolean;
}

export interface ShiftPatternInput {
  name: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  requiredPersonnel?: number;
  notes?: string;
  isActive?: boolean;
}

export const shiftPatternService = {
  async listByObject(objectId: string): Promise<ShiftPattern[]> {
    const response = await api.get(`/objects/${objectId}/shift-patterns`);
    return response.data.data;
  },

  async create(objectId: string, input: ShiftPatternInput): Promise<ShiftPattern> {
    const response = await api.post(`/objects/${objectId}/shift-patterns`, input);
    return response.data.data;
  },

  async update(id: string, input: Partial<ShiftPatternInput>): Promise<ShiftPattern> {
    const response = await api.put(`/shift-patterns/${id}`, input);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/shift-patterns/${id}`);
  }
};
