import { IsString, IsNumber, IsOptional, IsEnum, IsPositive, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeFacture, ModePaiement } from '@prisma/client';

export class CreateFactureDto {
  @ApiProperty()
  @IsString()
  eleveId: string;

  @ApiProperty({ enum: TypeFacture })
  @IsEnum(TypeFacture)
  type: TypeFacture;

  @ApiPropertyOptional({ example: 'Frais de minerval - Trimestre 1' })
  @IsOptional()
  @IsString()
  libelle?: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @IsPositive()
  montant: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  echeance?: string;
}

export class EnregistrerPaiementDto {
  @ApiProperty()
  @IsString()
  factureId: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @IsPositive()
  montant: number;

  @ApiProperty({ enum: ModePaiement })
  @IsEnum(ModePaiement)
  modePaiement: ModePaiement;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
