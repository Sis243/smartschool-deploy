import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsArray,
  IsNumber,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const STATUTS_PRESENCE = ['PRESENT', 'ABSENT', 'RETARD', 'EXCUSE'] as const;

export class CreateClasseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  anneeScolaireId?: string;

  @ApiProperty({ example: '6ème A' })
  @IsString()
  nom: string;

  @ApiProperty({ example: '6ème' })
  @IsString()
  niveau: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ description: 'Option pour les humanités' })
  @IsOptional()
  @IsString()
  option?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  effectifMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titulaireId?: string;
}

export class CreateMatiereDto {
  @ApiProperty({ example: 'Mathématiques' })
  @IsString()
  nom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  coefficient?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  heuresHebdo?: number;
}

export class CreateAnneeScolaireDto {
  @ApiProperty({ example: '2026-2027' })
  @IsString()
  libelle: string;

  @ApiProperty()
  @IsDateString()
  dateDebut: string;

  @ApiProperty()
  @IsDateString()
  dateFin: string;
}

export class CreatePeriodeDto {
  @ApiProperty({ example: '1er trimestre' })
  @IsString()
  libelle: string;

  @ApiProperty()
  @IsDateString()
  dateDebut: string;

  @ApiProperty()
  @IsDateString()
  dateFin: string;

  @ApiProperty()
  @IsInt()
  ordre: number;
}

export class CreateExamenDto {
  @ApiProperty()
  @IsString()
  classeId: string;

  @ApiProperty()
  @IsString()
  matiereId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  periodeId?: string;

  @ApiProperty({ example: 'Interrogation chapitre 3' })
  @IsString()
  libelle: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Durée en minutes' })
  @IsOptional()
  @IsInt()
  duree?: number;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsNumber()
  surNote?: number;
}

export class PointerPresenceFacialeDto {
  @ApiProperty()
  @IsString()
  eleveId: string;
}

export class PresenceItemDto {
  @ApiProperty()
  @IsString()
  eleveId: string;

  @ApiProperty({ enum: STATUTS_PRESENCE })
  @IsIn(STATUTS_PRESENCE)
  statut: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motif?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarque?: string;
}

export class MarquerPresencesDto {
  @ApiProperty({ type: [PresenceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresenceItemDto)
  presences: PresenceItemDto[];

  @ApiProperty()
  @IsDateString()
  date: string;
}
