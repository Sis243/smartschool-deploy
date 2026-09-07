import axios from 'axios';
import { getParentToken, clearParentSession } from './parent-auth';

const parentApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

parentApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getParentToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Voir lib/api.ts pour le détail : ignoré sur *.vercel.app pour ne pas
    // envoyer le nom du déploiement comme s'il s'agissait d'un slug d'établissement.
    const hostname = window.location.hostname;
    const isVercelHost = hostname.endsWith('.vercel.app');
    const subdomain = hostname.split('.')[0];
    if (!isVercelHost && subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      config.headers['X-Tenant-Id'] = subdomain;
    } else {
      try {
        const stored = localStorage.getItem('smartschool-auth');
        if (stored) {
          const tenantId = JSON.parse(stored)?.state?.user?.tenantId;
          if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
        }
      } catch {}
    }
  }
  return config;
});

parentApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearParentSession();
      window.location.href = '/parent/login';
    }
    return Promise.reject(error);
  },
);

export default parentApi;
