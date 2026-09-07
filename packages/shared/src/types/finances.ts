export type StatutPaiement = 'EN_ATTENTE' | 'PARTIEL' | 'PAYE' | 'ANNULE' | 'REMBOURSE';
export type TypeFacture = 'INSCRIPTION' | 'MINERVAL' | 'TRANSPORT' | 'CANTINE' | 'BIBLIOTHEQUE' | 'AUTRE';
export type ModePaiement = 'ESPECE' | 'MOBILE_MONEY' | 'VIREMENT' | 'CHEQUE';

export interface Facture {
  id: string;
  tenantId: string;
  eleveId: string;
  type: TypeFacture;
  libelle: string;
  montant: number;
  montantPaye: number;
  montantDu: number;
  statut: StatutPaiement;
  echeance?: Date;
  createdAt: Date;
  paiements?: Paiement[];
}

export interface Paiement {
  id: string;
  factureId: string;
  eleveId: string;
  montant: number;
  modePaiement: ModePaiement;
  reference?: string;
  statut: StatutPaiement;
  recu?: string;
  createdAt: Date;
}
