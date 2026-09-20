import { IsString, IsOptional, IsBoolean, IsInt, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSuiviMaternelleDto {
  @ApiProperty()
  @IsString()
  eleveId: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aMangeQuoi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aFaitSieste?: boolean;

  @ApiPropertyOptional({ description: 'Durée de la sieste en minutes' })
  @IsOptional()
  @IsInt()
  dureesSieste?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comportement?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activites?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}
