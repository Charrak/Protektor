import api from './api';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export const notificationService = {
  /**
   * Holt alle Notifications für den aktuellen User
   */
  async getNotifications(limit: number = 50): Promise<Notification[]> {
    const response = await api.get<Notification[]>(`/notifications?limit=${limit}`);
    return response.data;
  },

  /**
   * Holt ungelesene Notifications
   */
  async getUnreadNotifications(): Promise<Notification[]> {
    const response = await api.get<Notification[]>('/notifications/unread');
    return response.data;
  },

  /**
   * Zählt ungelesene Notifications
   */
  async countUnread(): Promise<number> {
    const response = await api.get<{ count: number }>('/notifications/count');
    return response.data.count;
  },

  /**
   * Markiert eine Notification als gelesen
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await api.put<Notification>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Markiert alle Notifications als gelesen
   */
  async markAllAsRead(): Promise<{ count: number }> {
    const response = await api.put<{ count: number }>('/notifications/read-all');
    return response.data;
  },

  /**
   * Löscht eine Notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  },

  /**
   * Navigiert zur Resource einer Notification
   */
  navigateToResource(notification: Notification): void {
    if (!notification.resourceType || !notification.resourceId) return;

    switch (notification.resourceType) {
      case 'deployment':
        window.location.href = `/scheduling?deployment=${notification.resourceId}`;
        break;
      case 'vacation':
        window.location.href = `/employees?tab=vacations&id=${notification.resourceId}`;
        break;
      case 'shift_swap':
        window.location.href = `/scheduling?swap=${notification.resourceId}`;
        break;
      default:
        console.log('Unbekannter Resource-Typ:', notification.resourceType);
    }
  },

  /**
   * Formatiert das Datum einer Notification
   */
  formatNotificationDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Minute${diffMins === 1 ? '' : 'n'}`;
    if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours === 1 ? '' : 'n'}`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`;
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  /**
   * Gibt das Icon für einen Notification-Typ zurück
   */
  getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      deployment_assigned: '📅',
      deployment_released: '✅',
      deployment_cancelled: '❌',
      deployment_confirmed: '✓',
      deployment_declined: '✗',
      shift_swap_request: '🔄',
      shift_swap_approved: '✅',
      shift_swap_declined: '❌',
      vacation_request: '🏖️',
      vacation_approved: '✅',
      vacation_declined: '❌',
      time_request_approved: '✅',
      time_request_declined: '❌',
      general: '📢',
    };
    return iconMap[type] || '📢';
  },
};
