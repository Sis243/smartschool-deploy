import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('classe/:classeId')
  @ApiOperation({ summary: 'Notes d\'une classe par période' })
  findByClasse(
    @CurrentTenant('id') tenantId: string,
    @Param('classeId') classeId: string,
    @Query('periodeId') periodeId: string,
  ) {
    return this.notesService.findByClasse(tenantId, classeId, periodeId);
  }

  @Post('encoder')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'ENSEIGNANT')
  @ApiOperation({ summary: 'Encoder les notes en masse' })
  encoderNotes(@CurrentTenant('id') tenantId: string, @Body() body: { notes: any[] }) {
    return this.notesService.encoderNotes(tenantId, body.notes);
  }

  @Get('bulletin/:eleveId')
  @ApiOperation({ summary: 'Bulletin d\'un élève' })
  getBulletin(
    @CurrentTenant('id') tenantId: string,
    @Param('eleveId') eleveId: string,
    @Query('periodeId') periodeId: string,
  ) {
    return this.notesService.getBulletin(tenantId, eleveId, periodeId);
  }

  @Get('rapport/classe/:classeId')
  @ApiOperation({ summary: 'Rapport de notes d\'une classe' })
  getRapportClasse(
    @CurrentTenant('id') tenantId: string,
    @Param('classeId') classeId: string,
    @Query('periodeId') periodeId: string,
  ) {
    return this.notesService.getRapportClasse(tenantId, classeId, periodeId);
  }
}
