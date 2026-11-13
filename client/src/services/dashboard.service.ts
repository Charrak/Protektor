import api from './api';

export interface DashboardStats {
  activeEmployees: number;
  todayDeployments: number;
  sickToday: number;
  openDeployments: number;
  ownTimeRecordsToday: number;
}

export interface DashboardData {
  isEmployee: boolean;
  employeeRecordLinked: boolean;
  stats: DashboardStats;
  todayDeployments: TodayDeployment[];
}

export interface TodayDeployment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  object: {
    id: string;
    name: string;
    objectNumber?: string;
  };
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  customer?: {
    id: string;
    name: string;
  };
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

export const dashboardService = {
  /** Lädt ausschließlich serverseitig nach Rolle und Mitarbeiterkonto gefilterte Dashboard-Daten. */
  async getDashboard(): Promise<DashboardData> {
    const response = await api.get('/dashboard');
    return response.data;
  },

  /**
   * Lädt letzte Aktivitäten (basierend auf Notifications)
   */
  async getRecentActivities(limit: number = 5): Promise<RecentActivity[]> {
    try {
      const response = await api.get('/notifications', {
        params: { limit },
      });
      
      const notifications = response.data?.data || response.data || [];
      
      return notifications.map((n: any) => ({
        id: n.id,
        type: n.type,
        description: n.title || n.message,
        timestamp: n.createdAt,
        user: n.recipient,
      }));
    } catch (error) {
      console.error('Error loading recent activities:', error);
      return [];
    }
  },

  /**
   * Prüft Systemstatus
   */
  async getSystemStatus(): Promise<{
    backend: boolean;
    database: boolean;
    webSocket: boolean;
  }> {
    try {
      const response = await api.get('/health');
      return {
        backend: true,
        database: response.data?.database === 'connected' || response.data?.status === 'ok',
        webSocket: true, // Assume WebSocket is working if API is reachable
      };
    } catch (error) {
      return {
        backend: false,
        database: false,
        webSocket: false,
      };
    }
  },
};
