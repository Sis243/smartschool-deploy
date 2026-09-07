// Modules payants activables/désactivables par école.
// Miroir backend : apps/api/src/common/constants/modules.ts (garder synchronisé).
export const MODULES_ACTIVABLES = [
  'FINANCES',
  'RH',
  'PAIE',
  'BIBLIOTHEQUE',
  'TRANSPORT',
  'AUTISME',
  'MATERNELLE',
  'COMMUNICATION',
  'PARENT_PORTAL',
] as const;

export type ModuleCle = (typeof MODULES_ACTIVABLES)[number];

export const MODULES_LABELS: Record<ModuleCle, string> = {
  FINANCES: 'Finances & comptabilité',
  RH: 'Ressources humaines',
  PAIE: 'Paie',
  BIBLIOTHEQUE: 'Bibliothèque',
  TRANSPORT: 'Transport scolaire',
  AUTISME: 'Besoins spécifiques (autisme, trisomie...)',
  MATERNELLE: 'Maternelle',
  COMMUNICATION: 'Communication',
  PARENT_PORTAL: 'Portail parent',
};
