import { IsString, IsOptional, IsInt, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateBusDto {
  @ApiProperty({ example: 'CGO 1234' })
  @IsString()
  immatriculation: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marque?: string;

  @ApiProperty()
  @IsInt()
  capacite: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chauffeurId?: string;
}

export class CreateItineraireDto {
  @ApiProperty({ example: 'Rond-point Victoire' })
  @IsString()
  arret: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  ordre?: number;

  @ApiPropertyOptional({ example: '07:15' })
  @IsOptional()
  @IsString()
  heurePrevue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class UpdateItineraireDto extends PartialType(CreateItineraireDto) {}

export class AbonnerTransportDto {
  @ApiProperty()
  @IsString()
  eleveId: string;

  @ApiProperty()
  @IsString()
  busId: string;
}
