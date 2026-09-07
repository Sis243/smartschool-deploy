export interface Eleve {
  id: string;
  tenantId: string;
  matricule: string;
  nom: string;
  prenom: string;
  dateNaissance?: Date;
  lieuNaissance?: string;
  genre?: string;
  photoUrl?: string;
  qrCode?: string;
  classeId?: string;
  parentId?: string;
  adresse?: string;
  isActive: boolean;
  createdAt: Date;
  classe?: { id: string; nom: string; niveau: string };
  parent?: { id: string; nom: string; telephone: string };
}

export interface DossierMedical {
  id: string;
  eleveId: string;
  groupeSanguin?: string;
  allergies: string[];
  antecedents?: string;
  medicaments?: string;
  handicap?: string;
  notes?: string;
}

export type StatutPresence = 'PRESENT' | 'ABSENT' | 'RETARD' | 'EXCUSE';

export interface Presence {
  id: string;
  eleveId: string;
  date: Date;
  statut: StatutPresence;
  motif?: string;
}
