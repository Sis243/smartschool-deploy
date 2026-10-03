import { IsString, IsOptional, IsIn, IsDateString, IsArray, IsInt, IsBoolean, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
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

const CATEGORIES_PICTOGRAMME = ['ACTIONS', 'EMOTIONS', 'ALIMENTS', 'OBJETS', 'LIEUX'] as const;

export class CreatePictogrammeDto {
  @ApiProperty({ example: 'Boire' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'URL de l\'image (voir POST /uploads/pictogramme)' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ enum: CATEGORIES_PICTOGRAMME })
  @IsOptional()
  @IsIn(CATEGORIES_PICTOGRAMME)
  categorie?: string;
}

export class EtapeRoutineDto {
  @ApiProperty()
  @IsInt()
  ordre: number;

  @ApiProperty({ example: 'Se laver les mains' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'URL d\'un pictogramme illustrant l\'étape' })
  @IsOptional()
  @IsString()
  pictogrammeUrl?: string;

  @ApiPropertyOptional({ description: 'Durée en secondes' })
  @IsOptional()
  @IsInt()
  duree?: number;
}

export class CreateRoutineDto {
  @ApiProperty()
  @IsString()
  eleveId: string;

  @ApiProperty({ example: 'Routine du matin' })
  @IsString()
  nom: string;

  @ApiProperty({ type: [EtapeRoutineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EtapeRoutineDto)
  etapes: EtapeRoutineDto[];
}

export class UpdateRoutineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [EtapeRoutineDto], description: 'Si fourni, remplace entièrement les étapes existantes' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EtapeRoutineDto)
  etapes?: EtapeRoutineDto[];
}
