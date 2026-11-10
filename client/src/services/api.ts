import axios from 'axios';

// API Base URL - nutze VITE_API_URL wenn gesetzt, sonst relative URLs (für Proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request-Interceptor: AccessToken hinzufügen
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor für Token-Erneuerung
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.response?.data?.error === 'TOKEN_EXPIRED') {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          return api(error.config);
        }
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Wrapper-Funktion für apiCall
export async function apiCall<T = any>(
  url: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const response = await api({
    url,
    method: options?.method || 'GET',
    data: options?.body,
    headers: options?.headers,
  });
  return response.data;
}

export default api;
