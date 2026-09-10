import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// SUPER_ADMIN (accès plateforme, hors tenant) et PARENT (compte géré via le
// modèle Parent / portail parent, pas via ce endpoint RH) sont volontairement
// exclus : un utilisateur ne doit jamais pouvoir se les auto-attribuer ici.
const ROLES_ASSIGNABLES = [
  'ADMIN',
  'DIRECTEUR',
  'ENSEIGNANT',
  'SECRETAIRE',
  'COMPTABLE',
  'THERAPEUTE',
  'CHAUFFEUR',
  'BIBLIOTHECAIRE',
  // Personnel d'appui (jardinier, gardien, technicien de surface...) : une
  // fiche RH sans compte de connexion — voir `poste` pour l'intitulé exact.
  'PERSONNEL_APPUI',
] as const;

export class CreatePersonnelDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  // Optionnel : le personnel d'appui n'a pas de compte de connexion, donc pas
  // d'email — le service refuse de créer un email pour ces rôles-là plutôt
  // que de faire confiance à ce que le front n'en envoie pas.
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: ROLES_ASSIGNABLES })
  @IsIn(ROLES_ASSIGNABLES)
  role: (typeof ROLES_ASSIGNABLES)[number];

  // Intitulé de poste libre (ex: "Jardinier", "Gardien de nuit") — surtout
  // utile pour PERSONNEL_APPUI, mais ouvert à tous les rôles.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poste?: string;
}
