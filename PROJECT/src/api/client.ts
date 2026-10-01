import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT token from localStorage or sessionStorage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear expired auth session
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('algoflow_token');
      localStorage.removeItem('algoflow_user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('algoflow_token');
      sessionStorage.removeItem('algoflow_user');
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
