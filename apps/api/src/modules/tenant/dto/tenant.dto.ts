import { IsString, IsEmail, IsOptional, IsEnum, MinLength, IsArray, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MODULES_ACTIVABLES } from '../../../common/constants/modules';

export enum SchoolType {
  GENERALE = 'GENERALE',
  MATERNELLE = 'MATERNELLE',
  PRIMAIRE = 'PRIMAIRE',
  SECONDAIRE = 'SECONDAIRE',
  TECHNIQUE = 'TECHNIQUE',
  SPECIALISE = 'SPECIALISE',
  THERAPEUTIQUE = 'THERAPEUTIQUE',
}

export enum SubscriptionPlan {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export class CreateTenantDto {
  @ApiProperty({ example: 'École Bon Départ' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'bondepart' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'info@bondepart.cd' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    enum: SchoolType,
    description: "GENERALE par défaut — la spécialisation réelle (maternelle, autisme...) se fait via les modules activables, pas ce champ.",
  })
  @IsOptional()
  @IsEnum(SchoolType)
  schoolType?: SchoolType;

  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  subscriptionPlan?: SubscriptionPlan;

  @ApiProperty({ example: 'Admin' })
  @IsString()
  adminFirstName: string;

  @ApiProperty({ example: 'Directeur' })
  @IsString()
  adminLastName: string;

  @ApiProperty({ example: 'admin@bondepart.cd' })
  @IsEmail()
  adminEmail: string;

  @ApiPropertyOptional({ description: "Téléphone du responsable — utilisé pour l'invitation WhatsApp en plus de l'email." })
  @IsOptional()
  @IsString()
  adminPhone?: string;

  @ApiPropertyOptional({
    description:
      "Requis pour l'auto-inscription publique (la personne choisit son mot de passe). " +
      "Omis quand un super admin crée l'école : un e-mail d'activation est envoyé à l'administrateur à la place.",
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  adminPassword?: string;
}

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateTenantAsSuperAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Téléphone du responsable de l\'établissement' })
  @IsOptional()
  @IsString()
  responsablePhone?: string;
}

export class UpdateTypesPrimeActifsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  types: string[];
}

export class UpdateModulesDto {
  @ApiProperty({ enum: MODULES_ACTIVABLES, isArray: true })
  @IsArray()
  @IsIn(MODULES_ACTIVABLES, { each: true })
  modules: string[];
}

const CYCLES_ABONNEMENT = ['MENSUEL', 'ANNUEL', 'A_VIE'] as const;

export class ActiverAbonnementDto {
  @ApiProperty({ enum: CYCLES_ABONNEMENT })
  @IsIn(CYCLES_ABONNEMENT)
  cycle: 'MENSUEL' | 'ANNUEL' | 'A_VIE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDebut?: string;
}
