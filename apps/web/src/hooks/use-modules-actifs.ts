import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ModuleCle } from '@/lib/modules';

// Un super admin (hors tenant) voit toujours tout — la restriction ne
// s'applique qu'aux comptes rattachés à une école.
export function useModulesActifs() {
  const { user } = useAuthStore();
  const actif = !user?.isSuperAdmin && !!user?.tenantId;

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: async () => (await api.get('/api/v1/tenants/me')).data.data,
    enabled: actif,
    staleTime: 5 * 60 * 1000,
  });

  const modulesActifs: ModuleCle[] | null = actif ? (tenant?.modulesActifs ?? null) : null;

  const estActif = (module: ModuleCle) => {
    if (!actif) return true;
    if (!modulesActifs) return true; // pas encore chargé — on n'affame pas l'écran par défaut
    return modulesActifs.includes(module);
  };

  return { modulesActifs, estActif, isLoading: actif && isLoading };
}
