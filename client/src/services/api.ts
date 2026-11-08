import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor für Token-Erneuerung
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.response?.data?.error === 'TOKEN_EXPIRED') {
      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        // Original-Request wiederholen
        return api(error.config);
      } catch {
        // Refresh fehlgeschlagen → zur Login-Seite
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
