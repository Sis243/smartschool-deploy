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

  @ApiPropertyOptional({ description: 'URL de la photo (voir POST /uploads/photo-eleve)' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ecolePrecedente?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  besoinsParticuliers?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactUrgenceNom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactUrgenceTelephone?: string;

  // Calculée côté navigateur (face-api.js) au moment de l'approbation d'une
  // inscription en ligne quand une photo a été fournie — évite qu'un élève
  // inscrit en ligne reste invisible au pointage facial tant que quelqu'un
  // n'a pas manuellement refait l'enrôlement depuis sa fiche.
  @ApiPropertyOptional({ type: [Number], description: 'Empreinte faciale (128 valeurs, face-api.js) — calculée depuis photoUrl si fournie' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  faceDescriptor?: number[];
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

  // Obligatoire : le code d'accès au portail parent est envoyé par e-mail
  // (voir ParentPortalService.genererAccessCode), pas par SMS.
  @ApiProperty({ example: 'alice.mutamba@example.com' })
  @IsEmail()
  email: string;

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
