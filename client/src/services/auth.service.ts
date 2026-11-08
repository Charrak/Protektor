import api from './api';
import type { User } from '../types';

interface LoginResponse {
  user: User;
  sessionId: string;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { username, password });
    localStorage.setItem('sessionId', data.sessionId);
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    localStorage.removeItem('sessionId');
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/password', { currentPassword, newPassword });
  },

  getSessionId(): string | null {
    return localStorage.getItem('sessionId');
  },
};
