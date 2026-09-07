import { IsString, IsOptional, IsEmail, IsDateString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Le formulaire public envoie des chaînes vides pour les champs optionnels
// non remplis ; on les normalise en `undefined` pour que @IsOptional() les
// laisse passer (sinon @IsEmail()/@IsDateString() rejettent une simple '').
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export class SoumettreInscriptionDto {
  @ApiProperty()
  @IsString()
  prenomEnfant: string;

  @ApiProperty()
  @IsString()
  nomEnfant: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsDateString()
  dateNaissance?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  lieuNaissance?: string;

  @ApiPropertyOptional({ enum: ['MASCULIN', 'FEMININ'] })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(['MASCULIN', 'FEMININ'])
  genre?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  classeVisee?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  anneeScolaire?: string;

  @ApiProperty()
  @IsString()
  nomParent: string;

  @ApiProperty()
  @IsString()
  prenomParent: string;

  @ApiProperty()
  @IsString()
  telephone: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  adresse?: string;

  @ApiPropertyOptional({ enum: ['PERE', 'MERE', 'TUTEUR'] })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(['PERE', 'MERE', 'TUTEUR'])
  lienFiliation?: string;
}
