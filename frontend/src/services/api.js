import axios from 'axios';
import { getToken, removeToken } from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const chatWithAI = (question, provider = null) => {
  return api.post('/chat/', { question, provider });
};

export const generateAIReport = (prompt, period, provider = null) => {
  return api.post('/chat/report/', { prompt, period, provider });
};

export const getAIProviders = () => {
  return api.get('/ai/providers/');
};