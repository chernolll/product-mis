import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: 'http://192.168.2.81:8999',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const apiKey = useAuthStore.getState().apiKey;
  if (apiKey) {
    config.headers['AIRINS-Rag-Key'] = apiKey;
  }
  return config;
});

export interface ApiResponse<T = any> {
  data: T;
  isSuccess: boolean;
  message: string;
  status: number;
  timestamp: string;
}
