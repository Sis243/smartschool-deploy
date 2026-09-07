import { IsString, IsNumber, IsOptional, IsIn, IsArray, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Aucune ligne n'est imposée par l'application : chaque établissement décrit
// ses propres primes et déductions avec le libellé et le montant de son choix.
export class LignePaieDto {
  @ApiProperty({ enum: ['PRIME', 'DEDUCTION'] })
  @IsIn(['PRIME', 'DEDUCTION'])
  type: 'PRIME' | 'DEDUCTION';

  @ApiProperty({ example: 'Prime de transport' })
  @IsString()
  libelle: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  montant: number;
}

export class CreateFichePaieDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ example: '2026-09', description: 'Période au format AAAA-MM' })
  @Matches(/^\d{4}-\d{2}$/, { message: 'La période doit être au format AAAA-MM' })
  periode: string;

  @ApiProperty({ example: 350000 })
  @IsNumber()
  salaireBase: number;

  @ApiPropertyOptional({ type: [LignePaieDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LignePaieDto)
  lignes?: LignePaieDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
