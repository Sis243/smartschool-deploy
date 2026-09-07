// Tarification de la licence SmartSchool ERP, par établissement.
// Miroir côté frontend : apps/web/src/lib/abonnement.ts (garder synchronisé).
export const PRIX_MENSUEL_USD = 200;
export const REMISE_ANNUELLE = 0.3; // 30% de remise sur le cumul mensuel
export const PRIX_ANNUEL_USD = Math.round(PRIX_MENSUEL_USD * 12 * (1 - REMISE_ANNUELLE)); // 1680

export const LABELS_CYCLE: Record<'MENSUEL' | 'ANNUEL' | 'A_VIE', string> = {
  MENSUEL: 'Mensuel',
  ANNUEL: 'Annuel',
  A_VIE: 'Licence à vie',
};
