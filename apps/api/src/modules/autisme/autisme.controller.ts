import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AutismeService } from './autisme.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ModuleActifGuard } from '../../common/guards/module-actif.guard';
import { RequireModule } from '../../common/decorators/module.decorator';
import {
  EnregistrerSuiviDto,
  ProgrammerTherapieDto,
  CreatePictogrammeDto,
  CreateRoutineDto,
  UpdateRoutineDto,
} from './dto/autisme.dto';

// Données sensibles (suivi comportemental, thérapies) : réservées à
// l'administration et aux thérapeutes, y compris en lecture.
@ApiTags('Autisme')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleActifGuard, RolesGuard)
@RequireModule('AUTISME')
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
  enregistrerSuivi(@CurrentTenant('id') tenantId: string, @Body() dto: EnregistrerSuiviDto) {
    return this.autismeService.enregistrerSuivi(tenantId, dto);
  }

  @Get('eleves/:eleveId/therapies')
  @ApiOperation({ summary: 'Séances de thérapie d\'un élève' })
  getTherapies(@CurrentTenant('id') tenantId: string, @Param('eleveId') eleveId: string) {
    return this.autismeService.getTherapies(tenantId, eleveId);
  }

  @Post('therapies')
  @ApiOperation({ summary: 'Programmer une séance de thérapie' })
  programmerTherapie(@CurrentTenant('id') tenantId: string, @Body() dto: ProgrammerTherapieDto) {
    return this.autismeService.programmerTherapie(tenantId, dto);
  }

  @Get('pictogrammes')
  @ApiOperation({ summary: 'Catalogue des pictogrammes' })
  getPictogrammes(@CurrentTenant('id') tenantId: string, @Query('categorie') categorie?: string) {
    return this.autismeService.getPictogrammes(tenantId, categorie);
  }

  @Post('pictogrammes')
  @ApiOperation({ summary: 'Ajouter un pictogramme au catalogue de l\'établissement' })
  createPictogramme(@CurrentTenant('id') tenantId: string, @Body() dto: CreatePictogrammeDto) {
    return this.autismeService.createPictogramme(tenantId, dto);
  }

  @Delete('pictogrammes/:id')
  @ApiOperation({ summary: 'Supprimer un pictogramme de l\'établissement' })
  deletePictogramme(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.autismeService.deletePictogramme(tenantId, id);
  }

  @Get('eleves/:eleveId/routines')
  @ApiOperation({ summary: 'Routines d\'un élève' })
  getRoutines(@CurrentTenant('id') tenantId: string, @Param('eleveId') eleveId: string) {
    return this.autismeService.getRoutines(tenantId, eleveId);
  }

  @Post('routines')
  @ApiOperation({ summary: 'Créer une routine personnalisée pour un élève' })
  createRoutine(@CurrentTenant('id') tenantId: string, @Body() dto: CreateRoutineDto) {
    return this.autismeService.createRoutine(tenantId, dto);
  }

  @Patch('routines/:id')
  @ApiOperation({ summary: 'Modifier une routine (nom, activation, étapes)' })
  updateRoutine(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    return this.autismeService.updateRoutine(tenantId, id, dto);
  }

  @Delete('routines/:id')
  @ApiOperation({ summary: 'Supprimer une routine' })
  deleteRoutine(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.autismeService.deleteRoutine(tenantId, id);
  }
}
