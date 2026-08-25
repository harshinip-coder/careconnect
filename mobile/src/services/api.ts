import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStorage } from './authStorage';

export const DEFAULT_API_BASE_URL = 'http://172.17.33.215:8000/api';
const SERVER_URL_KEY = 'careconnect_custom_api_url';

let currentBaseUrl = DEFAULT_API_BASE_URL;

export const getApiBaseUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (saved && saved.trim()) {
      currentBaseUrl = saved.trim();
      api.defaults.baseURL = currentBaseUrl;
      return currentBaseUrl;
    }
  } catch (e) {
    console.error('Error reading custom API URL', e);
  }
  return currentBaseUrl;
};

export const setApiBaseUrl = async (url: string): Promise<void> => {
  let formatted = url.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `http://${formatted}`;
  }
  if (!formatted.endsWith('/api') && !formatted.endsWith('/api/')) {
    formatted = formatted.endsWith('/') ? `${formatted}api` : `${formatted}/api`;
  }
  if (formatted.endsWith('/')) {
    formatted = formatted.slice(0, -1);
  }
  currentBaseUrl = formatted;
  api.defaults.baseURL = currentBaseUrl;
  await AsyncStorage.setItem(SERVER_URL_KEY, currentBaseUrl);
};

const api = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
  timeout: 10000,
});

// Initialize saved URL asynchronously
getApiBaseUrl().then((url) => {
  api.defaults.baseURL = url;
});

api.interceptors.request.use(
  async (config: any) => {
    const savedUrl = await getApiBaseUrl();
    config.baseURL = savedUrl;
    const token = await authStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    if (error.response?.status === 503 || error.response?.status === 502) {
      // Clear dead cached URL on 503/502 error and reset to DEFAULT_API_BASE_URL
      await AsyncStorage.removeItem(SERVER_URL_KEY);
      api.defaults.baseURL = DEFAULT_API_BASE_URL;
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: any) => api.post('/auth/login/', data),
  register: (data: any) => api.post('/auth/register/', data),
  getMe: () => api.get('/auth/me/'),
  updateProfile: (data: any) => api.patch('/auth/me/', data),
  uploadAvatar: (formData: any) => api.post('/auth/avatar/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  setAvatarUrl: (avatarUrl: string) => api.post('/auth/avatar/', { avatar_url: avatarUrl }),
  removeAvatar: () => api.delete('/auth/avatar/'),
  changePassword: (data: any) => api.post('/auth/change-password/', data),
  forgotPassword: (data: any) => api.post('/auth/forgot-password/', data),
  verifyResetCode: (data: any) => api.post('/auth/verify-reset-code/', data),
  resetPassword: (data: any) => api.post('/auth/reset-password/', data),
  logout: (data?: any) => api.post('/auth/logout/', data || {}),
};

export const emergencyAPI = {
  createSOS: (data: { category: string; message: string; latitude: number; longitude: number; location_address: string }) =>
    api.post('/emergency/sos/', data),
  getIncidents: () => api.get('/emergency/incidents/'),
  getStats: () => api.get('/emergency/incidents/stats/'),
  getIncidentDetail: (id: string) => api.get(`/emergency/incidents/${id}/`),
  acceptIncident: (id: string) => api.post(`/emergency/incidents/${id}/accept/`),
  declineIncident: (id: string) => api.post(`/emergency/incidents/${id}/decline/`),
  resolveIncident: (id: string, data: { resolution_note: string }) => api.post(`/emergency/incidents/${id}/resolve/`, data),
  cancelSOS: (id: string) => api.post(`/emergency/incidents/${id}/cancel/`),
};

export const guardianAPI = {
  getGuardians: () => api.get('/guardians/'),
  addGuardian: (data: { guardian_id: number; relationship_type: string }) => api.post('/guardians/', data),
  setPrimary: (id: number) => api.post(`/guardians/${id}/set-primary/`),
  setSecondary: (id: number) => api.post(`/guardians/${id}/set-secondary/`),
  deleteGuardian: (id: number) => api.delete(`/guardians/${id}/`),
};

export const volunteerAPI = {
  updateAvailability: (status: 'AVAILABLE' | 'UNAVAILABLE') =>
    api.post('/volunteer/availability/', { availability_status: status }),
};

export const notificationAPI = {
  getNotifications: (typeFilter?: string) => api.get('/notifications/', { params: { type: typeFilter } }),
  getUnreadCount: () => api.get('/notifications/unread-count/'),
  markRead: (id: number) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/mark-all-read/'),
  deleteNotification: (id: number) => api.delete(`/notifications/${id}/`),
};

export const chatAPI = {
  getChat: (incidentId: string) => api.get(`/chat/${incidentId}/`),
  sendMessage: (incidentId: string, text: string) => api.post(`/chat/${incidentId}/`, { message_text: text }),
};

export const adminAPI = {
  getUsers: (params?: any) => api.get('/admin/users/', { params }),
  createUser: (data: any) => api.post('/admin/users/', data),
  toggleUserActive: (id: number) => api.post(`/admin/users/${id}/toggle-active/`),
  getSocieties: () => api.get('/societies/'),
  createSociety: (data: any) => api.post('/societies/', data),
  getBlocks: (societyId?: number) => api.get('/blocks/', { params: { society_id: societyId } }),
  createBlock: (data: any) => api.post('/blocks/', data),
  getFlats: (blockId?: number) => api.get('/flats/', { params: { block_id: blockId } }),
  createFlat: (data: any) => api.post('/flats/', data),
  getAuditLogs: () => api.get('/audit-logs/'),
  getReports: () => api.get('/admin/reports/'),
};

export const systemAPI = {
  checkHealth: (customUrl?: string) =>
    customUrl
      ? axios.get(`${customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl}/health/`, { timeout: 5000 })
      : api.get('/health/'),
};

export default api;
