import api from './api';

export interface DashboardStats {
  activeEmployees: number;
  todayDeployments: number;
  sickToday: number;
  openDeployments: number;
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
  /**
   * Lädt Dashboard-Statistiken
   */
  async getStats(): Promise<DashboardStats> {
    const today = new Date().toISOString().split('T')[0];
    
    // Parallele Anfragen für alle Statistiken
    const [employeesResponse, deploymentsResponse, attendancesResponse] = await Promise.all([
      api.get('/employees', { params: { status: 'active', limit: 1000 } }),
      api.get('/deployments', { params: { from: today, to: today } }),
      api.get('/attendance', { params: { date: today, type: 'sick' } }),
    ]);

    const employees = employeesResponse.data?.data || employeesResponse.data || [];
    const deployments = deploymentsResponse.data?.data || deploymentsResponse.data || [];
    const sickAttendances = attendancesResponse.data?.data || attendancesResponse.data || [];

    return {
      activeEmployees: Array.isArray(employees) ? employees.length : 0,
      todayDeployments: Array.isArray(deployments) ? deployments.length : 0,
      sickToday: Array.isArray(sickAttendances) ? sickAttendances.length : 0,
      openDeployments: Array.isArray(deployments) 
        ? deployments.filter((d: any) => d.status === 'planned' || d.status === 'released').length 
        : 0,
    };
  },

  /**
   * Lädt heutige Einsätze
   */
  async getTodayDeployments(): Promise<TodayDeployment[]> {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get('/deployments', {
      params: { 
        from: today, 
        to: today,
        include: 'object,employee,customer'
      },
    });
    
    return response.data?.data || response.data || [];
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
