import { IsString, IsIn, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CIBLES = ['personnel', 'parents'] as const;
const CANAUX = ['SMS', 'EMAIL', 'PUSH', 'WHATSAPP'] as const;

export class EnvoyerNotificationDto {
  @ApiProperty()
  @IsString()
  titre: string;

  @ApiProperty()
  @IsString()
  contenu: string;

  @ApiProperty({ type: [String], description: 'IDs des utilisateurs (personnel) ou parents ciblés' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  destinataires: string[];

  @ApiProperty({ enum: CANAUX, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(CANAUX, { each: true })
  canaux: ('SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP')[];

  @ApiProperty({ enum: CIBLES })
  @IsIn(CIBLES)
  cible: 'personnel' | 'parents';
}
