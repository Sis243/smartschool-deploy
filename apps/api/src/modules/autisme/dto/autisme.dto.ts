import { IsString, IsOptional, IsIn, IsDateString, IsArray, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TYPES_THERAPIE = ['ORTHOPHONIE', 'PSYCHOMOTRICITE', 'ERGOTHERAPIE', 'ABA', 'PSYCHOLOGIE', 'AUTRE'] as const;
const STATUTS_THERAPIE = ['PLANIFIE', 'REALISE', 'ANNULE'] as const;

export class EnregistrerSuiviDto {
  @ApiProperty()
  @IsString()
  eleveId: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  comportements: string[];

  @ApiProperty({ example: 'CALME' })
  @IsString()
  humeur: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  activitesRealisees: string[];

  @ApiProperty()
  @IsString()
  observations: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  therapeuteId?: string;
}

export class ProgrammerTherapieDto {
  @ApiProperty()
  @IsString()
  eleveId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  therapeuteId?: string;

  @ApiProperty({ enum: TYPES_THERAPIE })
  @IsIn(TYPES_THERAPIE)
  type: string;

  @ApiProperty()
  @IsDateString()
  dateSeance: string;

  @ApiPropertyOptional({ description: 'Durée en minutes' })
  @IsOptional()
  @IsInt()
  duree?: number;

  @ApiPropertyOptional({ enum: STATUTS_THERAPIE, default: 'PLANIFIE' })
  @IsOptional()
  @IsIn(STATUTS_THERAPIE)
  statut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectifs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  compteRendu?: string;
}
