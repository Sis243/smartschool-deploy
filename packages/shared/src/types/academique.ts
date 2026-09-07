export interface Classe {
  id: string;
  tenantId: string;
  nom: string;
  niveau: string;
  section?: string;
  option?: string;
  effectifMax: number;
  titulaireId?: string;
  isActive: boolean;
}

export interface Matiere {
  id: string;
  tenantId: string;
  nom: string;
  code?: string;
  coefficient: number;
  heuresHebdo?: number;
}

export interface Note {
  id: string;
  eleveId: string;
  matiereId: string;
  periodeId: string;
  valeur: number;
  surNote: number;
  matiere?: Matiere;
}

export interface Bulletin {
  notes: (Note & { matiere: Matiere })[];
  total: number;
  totalCoefficients: number;
  moyenne: number;
  mention: string;
}
