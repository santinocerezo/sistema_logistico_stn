import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // envía la cookie httpOnly del refresh token
  headers: {
    'Content-Type': 'application/json',
  },
});

// Agrega el access token a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejo de 401: intenta refrescar el token antes de mandar al login
let refreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Solo intercepta 401 que no sean del propio endpoint de refresh
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/token/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      original._retry = true;

      if (refreshing) {
        // Espera a que el refresh en curso termine
        return new Promise((resolve) => {
          refreshQueue.push((newToken: string) => {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(original));
          });
        });
      }

      refreshing = true;

      try {
        const response = await axios.post(
          `${API_URL}/auth/token/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = response.data.accessToken;
        localStorage.setItem('token', newToken);

        // Actualiza el store sin tocar el user
        const store = useAuthStore.getState();
        if (store.user) {
          store.setAuth(store.user, newToken);
        }

        // Resuelve requests que estaban esperando
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // Refresh falló — logout y redirige al login
        refreshQueue = [];
        localStorage.removeItem('token');
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
