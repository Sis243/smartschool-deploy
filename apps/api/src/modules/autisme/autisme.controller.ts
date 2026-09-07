import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AutismeService } from './autisme.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// Données sensibles (suivi comportemental, thérapies) : réservées à
// l'administration et aux thérapeutes, y compris en lecture.
@ApiTags('Autisme')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DIRECTEUR', 'THERAPEUTE')
@Controller('autisme')
export class AutismeController {
  constructor(private readonly autismeService: AutismeService) {}

  @Get('eleves/:eleveId/suivi-comportemental')
  @ApiOperation({ summary: 'Suivi comportemental d\'un élève' })
  getSuivi(@CurrentTenant('id') tenantId: string, @Param('eleveId') eleveId: string) {
    return this.autismeService.getSuiviComportemental(tenantId, eleveId);
  }

  @Post('suivi-comportemental')
  @ApiOperation({ summary: 'Enregistrer un suivi comportemental' })
  enregistrerSuivi(@CurrentTenant('id') tenantId: string, @Body() data: any) {
    return this.autismeService.enregistrerSuivi(tenantId, data);
  }

  @Get('eleves/:eleveId/therapies')
  @ApiOperation({ summary: 'Séances de thérapie d\'un élève' })
  getTherapies(@CurrentTenant('id') tenantId: string, @Param('eleveId') eleveId: string) {
    return this.autismeService.getTherapies(tenantId, eleveId);
  }

  @Post('therapies')
  @ApiOperation({ summary: 'Programmer une séance de thérapie' })
  programmerTherapie(@CurrentTenant('id') tenantId: string, @Body() data: any) {
    return this.autismeService.programmerTherapie(tenantId, data);
  }

  @Get('pictogrammes')
  @ApiOperation({ summary: 'Catalogue des pictogrammes' })
  getPictogrammes(@CurrentTenant('id') tenantId: string, @Query('categorie') categorie?: string) {
    return this.autismeService.getPictogrammes(tenantId, categorie);
  }

  @Get('eleves/:eleveId/routines')
  @ApiOperation({ summary: 'Routines d\'un élève' })
  getRoutines(@CurrentTenant('id') tenantId: string, @Param('eleveId') eleveId: string) {
    return this.autismeService.getRoutines(tenantId, eleveId);
  }
}
