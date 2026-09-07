import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SchoolType {
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

  @ApiProperty({ enum: SchoolType })
  @IsEnum(SchoolType)
  schoolType: SchoolType;

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

  @ApiProperty()
  @IsString()
  @MinLength(8)
  adminPassword: string;
}
