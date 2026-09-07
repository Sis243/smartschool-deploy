import { useAuthStore } from '@/store/auth.store';

// Miroir côté client des groupes de rôles utilisés par les @Roles() du
// backend (voir apps/api/src/common/decorators/roles.decorator.ts et son
// usage par contrôleur) — sert uniquement à masquer proprement les écrans/
// widgets inaccessibles ; la vraie autorisation est toujours appliquée par
// l'API, ceci n'est qu'une amélioration d'UX.
const GROUPES_ROLES = {
  finances: ['ADMIN', 'DIRECTEUR', 'COMPTABLE', 'SECRETAIRE'],
  rhGestion: ['ADMIN', 'DIRECTEUR'],
  autisme: ['ADMIN', 'DIRECTEUR', 'THERAPEUTE'],
  inscriptions: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE'],
} as const;

export function usePermissions() {
  const { user } = useAuthStore();
  const role = (user as any)?.role as string | undefined;
  const isSuperAdmin = !!user?.isSuperAdmin;

  const hasRole = (roles: readonly string[]) => isSuperAdmin || (!!role && roles.includes(role));

  return {
    role,
    isSuperAdmin,
    canVoirFinances: hasRole(GROUPES_ROLES.finances),
    canGererRh: hasRole(GROUPES_ROLES.rhGestion),
    canVoirAutisme: hasRole(GROUPES_ROLES.autisme),
    canVoirInscriptions: hasRole(GROUPES_ROLES.inscriptions),
  };
}
