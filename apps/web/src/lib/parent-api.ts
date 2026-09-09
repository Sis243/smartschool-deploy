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

    // Toutes les routes du portail parent (publiques comme authentifiées)
    // résolvent le tenant elles-mêmes côté serveur (accessCode/téléphone
    // uniques, ou tenantId du JWT) — jamais depuis ce header. Un ancien
    // tenantId trainant dans le localStorage du compte STAFF (smartschool-auth)
    // n'a d'ailleurs aucun sens ici et cassait des requêtes parent au hasard.
    const hostname = window.location.hostname;
    const isVercelHost = hostname.endsWith('.vercel.app');
    const subdomain = hostname.split('.')[0];
    if (!isVercelHost && subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      config.headers['X-Tenant-Id'] = subdomain;
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
