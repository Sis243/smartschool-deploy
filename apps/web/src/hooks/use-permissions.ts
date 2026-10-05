import { useAuthStore } from '@/store/auth.store';

// Miroir côté client des groupes de rôles utilisés par les @Roles() du
// backend (voir apps/api/src/common/decorators/roles.decorator.ts et son
// usage par contrôleur) — sert uniquement à masquer proprement les écrans/
// widgets inaccessibles ; la vraie autorisation est toujours appliquée par
// l'API, ceci n'est qu'une amélioration d'UX.
const GROUPES_ROLES = {
  finances: ['ADMIN', 'DIRECTEUR', 'COMPTABLE', 'SECRETAIRE'],
  rhGestion: ['ADMIN', 'DIRECTEUR'],
  paie: ['ADMIN', 'DIRECTEUR', 'COMPTABLE'],
  autisme: ['ADMIN', 'DIRECTEUR', 'THERAPEUTE'],
  inscriptions: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE'],
  // `eleves`/`academique` : contrôleurs API entièrement fermés à ce groupe
  // de rôles, y compris en lecture (pas seulement les mutations) — sans ce
  // filtre, un chauffeur/bibliothécaire/thérapeute/comptable/personnel
  // d'appui voit ces liens dans le menu et atterrit sur une page où chaque
  // appel API renvoie 403.
  elevesEtAcademique: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT'],
  // Sous-ensemble de elevesEtAcademique : un enseignant peut voir la liste et
  // enregistrer un visage, mais pas inscrire/modifier/archiver un élève ni
  // générer un code d'accès portail parent (@Roles côté API l'exclut de ces
  // routes précises, bien qu'il voie la page élèves dans son ensemble).
  gererEleves: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE'],
  encoderNotes: ['ADMIN', 'DIRECTEUR', 'ENSEIGNANT'],
  gererTransport: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE'],
  gererBibliotheque: ['ADMIN', 'DIRECTEUR', 'BIBLIOTHECAIRE'],
  envoyerCommunication: ['ADMIN', 'DIRECTEUR', 'SECRETAIRE'],
  gererMaternelle: ['ADMIN', 'DIRECTEUR', 'ENSEIGNANT'],
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
    canGererPaie: hasRole(GROUPES_ROLES.paie),
    canVoirAutisme: hasRole(GROUPES_ROLES.autisme),
    canVoirInscriptions: hasRole(GROUPES_ROLES.inscriptions),
    canVoirElevesEtAcademique: hasRole(GROUPES_ROLES.elevesEtAcademique),
    canGererEleves: hasRole(GROUPES_ROLES.gererEleves),
    canEncoderNotes: hasRole(GROUPES_ROLES.encoderNotes),
    canGererTransport: hasRole(GROUPES_ROLES.gererTransport),
    canGererBibliotheque: hasRole(GROUPES_ROLES.gererBibliotheque),
    canEnvoyerCommunication: hasRole(GROUPES_ROLES.envoyerCommunication),
    canGererMaternelle: hasRole(GROUPES_ROLES.gererMaternelle),
  };
}
