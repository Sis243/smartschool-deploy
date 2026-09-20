import { IsString, IsOptional, IsIn, IsNumber, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Ces trois DTOs couvrent des routes PUBLIQUES (pas de JWT, pas de tenant
// résolu au préalable — voir parent-portal.controller.ts) : la surface
// d'attaque est plus grande qu'un endpoint authentifié, d'où l'intérêt
// particulier de rejeter tout corps malformé ici plutôt que de laisser
// filer un `any` jusqu'au service.
export class ActiverPortailDto {
  @ApiProperty({ example: 'ABC123' })
  @IsString()
  accessCode: string;

  @ApiProperty()
  @IsString()
  telephone: string;

  @ApiProperty({ minLength: 4 })
  @IsString()
  @MinLength(4)
  pin: string;
}

export class LoginParentDto {
  @ApiProperty()
  @IsString()
  telephone: string;

  @ApiProperty()
  @IsString()
  pin: string;
}

export class MotDePasseOublieDto {
  @ApiProperty()
  @IsString()
  telephone: string;
}

const MODES_PAIEMENT = ['ESPECE', 'MOBILE_MONEY', 'VIREMENT', 'CHEQUE'] as const;

export class SoumettrePreuveDto {
  @ApiProperty()
  @IsString()
  factureId: string;

  @ApiProperty()
  @IsNumber()
  montant: number;

  @ApiProperty({ enum: MODES_PAIEMENT })
  @IsIn(MODES_PAIEMENT)
  modePaiement: string;

  @ApiPropertyOptional({ description: 'Référence Mobile Money ou virement' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'URL du reçu uploadé (voir POST /uploads)' })
  @IsOptional()
  @IsString()
  fichierUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fichierNom?: string;
}

const ACTIONS_PREUVE = ['VALIDE', 'REJETE'] as const;

export class ValiderPreuveDto {
  @ApiProperty({ enum: ACTIONS_PREUVE })
  @IsIn(ACTIONS_PREUVE)
  action: 'VALIDE' | 'REJETE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noteAdmin?: string;
}
