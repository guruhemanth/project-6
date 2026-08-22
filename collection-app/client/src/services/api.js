import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses globally for protected API calls
// Do NOT redirect if the request is to an authentication endpoint (/api/auth/) or already on /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/api/auth/') || url.includes('/login') || url.includes('/register');
    const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';

    if (error.response?.status === 401 && !isAuthEndpoint && !isLoginPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      localStorage.removeItem('adminId');
      localStorage.removeItem('societyName');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
