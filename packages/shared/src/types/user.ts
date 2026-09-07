export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DIRECTEUR' | 'ENSEIGNANT' | 'SECRETAIRE' | 'COMPTABLE' | 'THERAPEUTE' | 'PARENT' | 'CHAUFFEUR' | 'BIBLIOTHECAIRE';

export interface User {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photoUrl?: string;
  role: UserRole;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'createdAt'>;
}
