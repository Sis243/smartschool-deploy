import { IsString, IsNumber, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Le barème (0-20) est aussi revérifié dans NotesService.encoderNotes — le
// garder ici permet un rejet 400 immédiat et lisible avant même d'atteindre
// la logique métier, sans dispenser le service de sa propre vérification
// (défense en profondeur : le DTO protège l'API HTTP, le service protège
// aussi tout futur appelant interne).
export class NoteDto {
  @ApiProperty()
  @IsString()
  eleveId: string;

  @ApiProperty()
  @IsString()
  matiereId: string;

  @ApiProperty()
  @IsString()
  periodeId: string;

  @ApiProperty({ minimum: 0, maximum: 20 })
  @IsNumber()
  @Min(0)
  @Max(20)
  valeur: number;
}

export class EncoderNotesDto {
  @ApiProperty({ type: [NoteDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteDto)
  notes: NoteDto[];
}
