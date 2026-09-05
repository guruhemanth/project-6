import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every outgoing request and log outgoing API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🌐 [API Request] ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`, config.data || '');
    return config;
  },
  (error) => {
    console.error('❌ [API Request Error]', error);
    return Promise.reject(error);
  }
);

// Handle responses and global errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API Response ${response.status}] ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const errorMsg = error.response?.data?.error || error.message;

    console.error(`🚨 [API Error ${status || 'NETWORK_FAILURE'}] ${url}:`, errorMsg, error);

    const isAuthEndpoint = url.includes('/api/auth/') || url.includes('/login') || url.includes('/register');
    const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';

    if (status === 401 && !isAuthEndpoint && !isLoginPage) {
      console.warn('🔒 [Auth Expired] 401 Unauthorized detected. Clearing session and redirecting to /login...');
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
