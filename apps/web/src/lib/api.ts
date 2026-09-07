import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Production: résolution via sous-domaine (bondepart.smartschool.cd).
    // Ignoré sur les domaines *.vercel.app (déploiement direct, pas encore de
    // vrais sous-domaines par établissement) : sinon le nom du déploiement
    // lui-même (ex: "smartschool-deploy-web") est envoyé comme si c'était un
    // slug d'établissement, et bloque toute connexion avec une 404 "établissement
    // introuvable" puisqu'aucun tenant ne porte ce nom.
    const hostname = window.location.hostname;
    const isVercelHost = hostname.endsWith('.vercel.app');
    const subdomain = hostname.split('.')[0];
    if (!isVercelHost && subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      config.headers['X-Tenant-Id'] = subdomain;
    } else {
      // Développement: on envoie le tenantId (UUID) depuis le store persisté
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
