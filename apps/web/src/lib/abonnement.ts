// Tarification de la licence SmartSchool ERP, par établissement.
// Miroir backend : apps/api/src/common/constants/abonnement.ts (garder synchronisé).
export const PRIX_MENSUEL_USD = 200;
export const REMISE_ANNUELLE = 0.3;
export const PRIX_ANNUEL_USD = Math.round(PRIX_MENSUEL_USD * 12 * (1 - REMISE_ANNUELLE)); // 1680

export const LABELS_CYCLE: Record<'MENSUEL' | 'ANNUEL' | 'A_VIE', string> = {
  MENSUEL: 'Mensuel',
  ANNUEL: 'Annuel',
  A_VIE: 'Licence à vie',
};
