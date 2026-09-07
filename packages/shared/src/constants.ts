export const SUBSCRIPTION_FEATURES = {
  BASIC: {
    maxEleves: 200,
    modules: ['eleves', 'academique', 'notes', 'finances', 'communication'],
    qrCode: false,
    biometrie: false,
    ia: false,
  },
  STANDARD: {
    maxEleves: 500,
    modules: ['eleves', 'academique', 'notes', 'finances', 'rh', 'communication', 'transport', 'bibliotheque'],
    qrCode: true,
    biometrie: false,
    ia: false,
  },
  PREMIUM: {
    maxEleves: 2000,
    modules: ['eleves', 'academique', 'notes', 'finances', 'rh', 'communication', 'transport', 'bibliotheque', 'autisme', 'maternelle'],
    qrCode: true,
    biometrie: true,
    ia: true,
  },
  ENTERPRISE: {
    maxEleves: -1, // illimité
    modules: ['all'],
    qrCode: true,
    biometrie: true,
    ia: true,
  },
} as const;

export const SCHOOL_TYPE_LABELS: Record<string, string> = {
  MATERNELLE: 'École Maternelle',
  PRIMAIRE: 'École Primaire',
  SECONDAIRE: 'École Secondaire / Humanités',
  TECHNIQUE: 'École Technique',
  SPECIALISE: 'École Spécialisée',
  THERAPEUTIQUE: 'Centre Thérapeutique',
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrateur',
  ADMIN: 'Administrateur',
  DIRECTEUR: 'Directeur',
  ENSEIGNANT: 'Enseignant',
  SECRETAIRE: 'Secrétaire',
  COMPTABLE: 'Comptable',
  THERAPEUTE: 'Thérapeute',
  PARENT: 'Parent',
  CHAUFFEUR: 'Chauffeur',
  BIBLIOTHECAIRE: 'Bibliothécaire',
};

export const MENTION_SEUILS = [
  { seuil: 90, mention: 'Excellence' },
  { seuil: 80, mention: 'Très bien' },
  { seuil: 70, mention: 'Bien' },
  { seuil: 60, mention: 'Assez bien' },
  { seuil: 50, mention: 'Passable' },
  { seuil: 0, mention: 'Insuffisant' },
];

export const API_ROUTES = {
  AUTH: '/api/v1/auth',
  TENANTS: '/api/v1/tenants',
  USERS: '/api/v1/users',
  ELEVES: '/api/v1/eleves',
  ACADEMIQUE: '/api/v1/academique',
  NOTES: '/api/v1/notes',
  FINANCES: '/api/v1/finances',
  RH: '/api/v1/rh',
  COMMUNICATION: '/api/v1/communication',
  TRANSPORT: '/api/v1/transport',
  BIBLIOTHEQUE: '/api/v1/bibliotheque',
  AUTISME: '/api/v1/autisme',
} as const;
