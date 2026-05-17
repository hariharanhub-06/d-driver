import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2024/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401 — skip for auth endpoints so login/refresh errors surface normally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2024/api/v1'}/auth/refresh`,
          { refresh_token: refreshToken }
        );
        const { access_token } = res.data;
        localStorage.setItem('access_token', access_token);
        original.headers.Authorization = `Bearer ${access_token}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
