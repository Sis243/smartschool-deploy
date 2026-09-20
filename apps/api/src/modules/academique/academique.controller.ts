import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AcademiqueService } from './academique.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CreateClasseDto,
  CreateMatiereDto,
  CreateAnneeScolaireDto,
  CreatePeriodeDto,
  CreateExamenDto,
  PointerPresenceFacialeDto,
  MarquerPresencesDto,
} from './dto/academique.dto';

// Gestion de la structure académique (classes/matières/années/périodes/examens)
// et pointage des présences : ouvert au personnel enseignant et administratif,
// pas aux rôles annexes (chauffeur, bibliothécaire, thérapeute...).
const ROLES_GESTION_ACADEMIQUE = ['ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT'] as const;

@ApiTags('Academique')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ROLES_GESTION_ACADEMIQUE)
@Controller('academique')
export class AcademiqueController {
  constructor(private readonly academiqueService: AcademiqueService) {}

  @Get('classes')
  findAllClasses(@CurrentTenant('id') tenantId: string) {
    return this.academiqueService.findAllClasses(tenantId);
  }

  @Post('classes')
  createClasse(@CurrentTenant('id') tenantId: string, @Body() dto: CreateClasseDto) {
    return this.academiqueService.createClasse(tenantId, dto);
  }

  @Get('matieres')
  findAllMatieres(@CurrentTenant('id') tenantId: string) {
    return this.academiqueService.findAllMatieres(tenantId);
  }

  @Post('matieres')
  createMatiere(@CurrentTenant('id') tenantId: string, @Body() dto: CreateMatiereDto) {
    return this.academiqueService.createMatiere(tenantId, dto);
  }

  @Get('horaires/:classeId')
  findHoraires(@CurrentTenant('id') tenantId: string, @Param('classeId') classeId: string) {
    return this.academiqueService.findHoraires(tenantId, classeId);
  }

  @Get('annees-scolaires')
  getAllAnneesScolaires(@CurrentTenant('id') tenantId: string) {
    return this.academiqueService.getAllAnneesScolaires(tenantId);
  }

  @Get('annee-scolaire/active')
  getAnneeScolaire(@CurrentTenant('id') tenantId: string) {
    return this.academiqueService.getAnneeScolaireActive(tenantId);
  }

  @Post('annee-scolaire')
  createAnneeScolaire(@CurrentTenant('id') tenantId: string, @Body() dto: CreateAnneeScolaireDto) {
    return this.academiqueService.createAnneeScolaire(tenantId, dto);
  }

  @Patch('annees-scolaires/:id/activer')
  activerAnneeScolaire(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.academiqueService.activerAnneeScolaire(tenantId, id);
  }

  @Get('periodes')
  getPeriodes(@CurrentTenant('id') tenantId: string) {
    return this.academiqueService.getPeriodes(tenantId);
  }

  @Post('periodes')
  createPeriode(@CurrentTenant('id') tenantId: string, @Body() dto: CreatePeriodeDto) {
    return this.academiqueService.createPeriode(tenantId, dto);
  }

  @Patch('periodes/:id/activer')
  activerPeriode(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.academiqueService.activerPeriode(tenantId, id);
  }

  @Get('examens')
  findExamens(
    @CurrentTenant('id') tenantId: string,
    @Query() query: { classeId?: string; matiereId?: string },
  ) {
    return this.academiqueService.findExamens(tenantId, query);
  }

  @Post('examens')
  createExamen(@CurrentTenant('id') tenantId: string, @Body() dto: CreateExamenDto) {
    return this.academiqueService.createExamen(tenantId, dto);
  }

  @Get('presences/bilan-semaine')
  getBilanSemaine(@CurrentTenant('id') tenantId: string) {
    return this.academiqueService.getBilanSemaine(tenantId);
  }

  @Get('presences')
  getPresences(
    @CurrentTenant('id') tenantId: string,
    @Query('classeId') classeId: string,
    @Query('date') date: string,
  ) {
    return this.academiqueService.getPresences(tenantId, classeId, date);
  }

  @Post('presences/scan')
  @ApiOperation({ summary: 'Pointer la présence d\'un élève reconnu par scan facial' })
  pointerPresenceFaciale(@CurrentTenant('id') tenantId: string, @Body() dto: PointerPresenceFacialeDto) {
    return this.academiqueService.pointerPresenceFaciale(tenantId, dto.eleveId);
  }

  @Put('presences')
  marquerPresences(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: MarquerPresencesDto,
  ) {
    return this.academiqueService.marquerPresences(tenantId, dto.presences, dto.date);
  }

  @Get('presences/statistiques')
  getStatistiquesPresence(
    @CurrentTenant('id') tenantId: string,
    @Query('classeId') classeId: string,
    @Query('dateDebut') dateDebut: string,
    @Query('dateFin') dateFin: string,
  ) {
    return this.academiqueService.getStatistiquesPresence(tenantId, classeId, dateDebut, dateFin);
  }
}
