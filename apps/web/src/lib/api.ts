import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Résolution via sous-domaine (bondepart.smartschool.cd) UNIQUEMENT.
    // Ignoré sur *.vercel.app (pas encore de vrais sous-domaines par
    // établissement) — le tenant vient alors exclusivement du JWT
    // (JwtAuthGuard), jamais d'un id stocké côté client : un ancien tenantId
    // laissé dans le localStorage d'une session précédente est un cuid, pas
    // un slug — le middleware le cherche dans la mauvaise colonne et
    // renvoie 404 "établissement introuvable" sur CHAQUE requête (y compris
    // /auth/login), ce qui bloquait la connexion et toutes les actions tant
    // qu'un ancien identifiant traînait dans le navigateur.
    const hostname = window.location.hostname;
    const isVercelHost = hostname.endsWith('.vercel.app');
    const subdomain = hostname.split('.')[0];
    if (!isVercelHost && subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      config.headers['X-Tenant-Id'] = subdomain;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
