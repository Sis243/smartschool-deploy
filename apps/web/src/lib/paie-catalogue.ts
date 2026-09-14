// Catalogue de types de primes/déductions courants en RD Congo.
// Miroir backend : apps/api/src/common/constants/paie-catalogue.ts (garder synchronisé).
export interface CataloguePaieItem {
  cle: string;
  libelle: string;
  type: 'PRIME' | 'DEDUCTION';
}

export const CATALOGUE_PAIE: CataloguePaieItem[] = [
  { cle: 'INSS_EMPLOYE', libelle: 'INSS (part employé)', type: 'DEDUCTION' },
  { cle: 'IPR', libelle: 'IPR (impôt professionnel sur la rémunération)', type: 'DEDUCTION' },
  { cle: 'INPP', libelle: "INPP (Institut National de Préparation Professionnelle)", type: 'DEDUCTION' },
  { cle: 'ONEM', libelle: "ONEM (Office National de l'Emploi)", type: 'DEDUCTION' },
  { cle: 'AVANCE_SALAIRE', libelle: 'Avance sur salaire', type: 'DEDUCTION' },
  { cle: 'PRET', libelle: 'Remboursement de prêt', type: 'DEDUCTION' },
  { cle: 'CONGE_CIRCONSTANCIEL', libelle: 'Congé circonstanciel', type: 'DEDUCTION' },
  { cle: 'PRIME_TRANSPORT', libelle: 'Prime de transport', type: 'PRIME' },
  { cle: 'PRIME_LOGEMENT', libelle: 'Prime de logement', type: 'PRIME' },
  { cle: 'PRIME_ANCIENNETE', libelle: "Prime d'ancienneté", type: 'PRIME' },
  { cle: 'PRIME_RISQUE', libelle: 'Prime de risque', type: 'PRIME' },
  { cle: 'PRIME_FIN_ANNEE', libelle: "Prime de fin d'année (13ème mois)", type: 'PRIME' },
  { cle: 'ALLOCATION_FAMILIALE', libelle: 'Allocation familiale', type: 'PRIME' },
  { cle: 'ALLOCATION_CONJOINT', libelle: 'Allocation conjoint(e)', type: 'PRIME' },
  { cle: 'PRIME_ASSIDUITE', libelle: "Prime d'assiduité", type: 'PRIME' },
  { cle: 'INDEMNITE_REPRESENTATION', libelle: 'Indemnité de représentation', type: 'PRIME' },
  { cle: 'PRIME_RENDEMENT', libelle: 'Prime de rendement', type: 'PRIME' },
  { cle: 'PRIME_RENTABILITE', libelle: 'Prime de rentabilité', type: 'PRIME' },
  { cle: 'PRIME_REGULARITE', libelle: 'Prime de régularité', type: 'PRIME' },
  { cle: 'SOINS_MEDICAUX', libelle: 'Soins médicaux', type: 'PRIME' },
  { cle: 'CONGE_PAYE', libelle: 'Indemnité de congé payé', type: 'PRIME' },
];
