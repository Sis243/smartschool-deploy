import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';

// SUPER_ADMIN (accès plateforme, hors tenant) et PARENT (compte géré via le
// modèle Parent / portail parent) sont volontairement exclus : un utilisateur
// ne doit jamais pouvoir se les auto-attribuer via cet endpoint.
const ROLES_ASSIGNABLES = [
  'ADMIN',
  'DIRECTEUR',
  'ENSEIGNANT',
  'SECRETAIRE',
  'COMPTABLE',
  'THERAPEUTE',
  'CHAUFFEUR',
  'BIBLIOTHECAIRE',
] as const;

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: ROLES_ASSIGNABLES })
  @IsIn(ROLES_ASSIGNABLES)
  role: (typeof ROLES_ASSIGNABLES)[number];
}

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['email'] as const)) {}
