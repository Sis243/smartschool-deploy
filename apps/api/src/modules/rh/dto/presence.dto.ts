import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const STATUTS_PRESENCE = ['PRESENT', 'ABSENT', 'RETARD', 'EXCUSE'] as const;

export class MarquerPresencePersonnelDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: STATUTS_PRESENCE })
  @IsIn(STATUTS_PRESENCE)
  statut: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}
