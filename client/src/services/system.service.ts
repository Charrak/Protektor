import api from './api';

interface HealthStatus {
  status: string;
  timestamp: string;
}

export const systemService = {
  async getHealth(): Promise<HealthStatus> {
    const { data } = await api.get<HealthStatus>('/health');
    return data;
  },
};
