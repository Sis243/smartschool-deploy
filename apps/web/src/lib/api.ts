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

// Sur un 401, tente une seule fois de renouveler la session via le refresh
// token (durée de vie longue) avant de déconnecter — jusqu'ici le refresh
// token était généré à la connexion mais jamais utilisé, donc la session
// expirait après 7 jours au lieu de se renouveler silencieusement.
let refreshEnCours: Promise<string | null> | null = null;

async function tenterRefresh(): Promise<string | null> {
  if (!refreshEnCours) {
    refreshEnCours = (async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return null;
      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/refresh`,
          { refreshToken },
        );
        const nouveauAccessToken = data.data.accessToken;
        localStorage.setItem('access_token', nouveauAccessToken);
        if (data.data.refreshToken) localStorage.setItem('refresh_token', data.data.refreshToken);
        return nouveauAccessToken;
      } catch {
        return null;
      } finally {
        refreshEnCours = null;
      }
    })();
  }
  return refreshEnCours;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const estRouteAuth = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !estRouteAuth && !config?._retry) {
      config._retry = true;
      const nouveauToken = await tenterRefresh();
      if (nouveauToken) {
        config.headers.Authorization = `Bearer ${nouveauToken}`;
        return api(config);
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    } else if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
