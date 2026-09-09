import { IsString, IsOptional, IsIn, IsDateString, IsArray, IsNumber, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateEleveDto {
  @ApiProperty({ example: 'Amani' })
  @IsString()
  prenom: string;

  @ApiProperty({ example: 'Mutamba' })
  @IsString()
  nom: string;

  @ApiPropertyOptional({ enum: ['MASCULIN', 'FEMININ'] })
  @IsOptional()
  @IsIn(['MASCULIN', 'FEMININ'])
  genre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateNaissance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lieuNaissance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adresse?: string;

  // Stocké dans DossierMedical, pas sur Eleve directement.
  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  groupeSanguin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateEleveDto extends PartialType(CreateEleveDto) {}

export class CreateParentDto {
  @ApiProperty({ example: 'Mutamba' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Alice' })
  @IsString()
  prenom: string;

  @ApiProperty({ example: '+243812345678' })
  @IsString()
  telephone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adresse?: string;
}

export class EnregistrerVisageDto {
  @ApiProperty({ description: 'URL de la photo de référence (voir POST /uploads/photo-eleve)' })
  @IsString()
  photoUrl: string;

  @ApiProperty({ type: [Number], description: 'Empreinte faciale (128 valeurs, face-api.js)' })
  @IsArray()
  @IsNumber({}, { each: true })
  faceDescriptor: number[];
}
