import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
