import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLivreDto {
  @ApiProperty({ example: 'Le Petit Prince' })
  @IsString()
  titre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  auteur?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isbn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  editeur?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  anneeEdition?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorie?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  quantiteTotale?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  quantiteDisponible?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couvertureUrl?: string;
}

export class EmprunterLivreDto {
  @ApiProperty()
  @IsString()
  livreId: string;

  @ApiProperty()
  @IsString()
  eleveId: string;

  @ApiProperty()
  @IsDateString()
  dateRetourPrevue: string;
}
