import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { saveAuthSnapshot } from '@/lib/offline-queue';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  twoFactorEnabled?: boolean;
}

// login peut aboutir directement (session ouverte) ou s'arrêter à mi-chemin
// si la vérification en 2 étapes est activée sur le compte — le formulaire
// de connexion doit alors afficher une étape supplémentaire avant d'avoir
// une vraie session.
type ResultatConnexion =
  | { requiresTwoFactor: true; pendingToken: string }
  | { requiresTwoFactor: false; accessToken: string; refreshToken?: string; user: User };

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<ResultatConnexion>;
  completerConnexion: (accessToken: string, refreshToken: string | undefined, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/api/v1/auth/login', { email, password });
        const resultat: ResultatConnexion = data.data;
        if (resultat.requiresTwoFactor === false) {
          get().completerConnexion(resultat.accessToken, resultat.refreshToken, resultat.user);
        }
        return resultat;
      },

      completerConnexion: (accessToken, refreshToken, user) => {
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        saveAuthSnapshot(accessToken);
        set({ user, accessToken, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, accessToken: null, isAuthenticated: false });
        window.location.href = '/login';
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'smartschool-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
