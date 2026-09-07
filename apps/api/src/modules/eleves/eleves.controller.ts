import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ElevesService } from './eleves.service';
import { CreateEleveDto, UpdateEleveDto, EnregistrerVisageDto } from './dto/eleve.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Eleves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('eleves')
export class ElevesController {
  constructor(private readonly elevesService: ElevesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT')
  @ApiOperation({ summary: 'Lister les élèves' })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @Query() query: { classeId?: string; search?: string; page?: number; limit?: number },
  ) {
    return this.elevesService.findAll(tenantId, query);
  }

  @Get('parents')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
  @ApiOperation({ summary: 'Lister les parents du tenant' })
  getParents(@CurrentTenant('id') tenantId: string) {
    return this.elevesService.getParents(tenantId);
  }

  @Get('avec-visage')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT')
  @ApiOperation({ summary: 'Élèves ayant une empreinte faciale enregistrée (pour le pointage)' })
  findAllAvecVisage(@CurrentTenant('id') tenantId: string, @Query('classeId') classeId?: string) {
    return this.elevesService.findAllAvecVisage(tenantId, classeId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT')
  @ApiOperation({ summary: 'Détails d\'un élève' })
  findOne(@Param('id') id: string, @CurrentTenant('id') tenantId: string) {
    return this.elevesService.findOne(id, tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
  @ApiOperation({ summary: 'Inscrire un élève' })
  create(@CurrentTenant('id') tenantId: string, @Body() dto: CreateEleveDto) {
    return this.elevesService.create(tenantId, dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
  @ApiOperation({ summary: 'Modifier un élève' })
  update(@Param('id') id: string, @CurrentTenant('id') tenantId: string, @Body() dto: UpdateEleveDto) {
    return this.elevesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
  @ApiOperation({ summary: 'Archiver un élève' })
  delete(@Param('id') id: string, @CurrentTenant('id') tenantId: string) {
    return this.elevesService.delete(id, tenantId);
  }

  @Patch(':id/reactiver')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
  @ApiOperation({ summary: 'Réactiver un élève archivé' })
  reactiver(@Param('id') id: string, @CurrentTenant('id') tenantId: string) {
    return this.elevesService.reactiver(id, tenantId);
  }

  @Patch(':id/visage')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT')
  @ApiOperation({ summary: 'Enregistrer la photo et l\'empreinte faciale de référence' })
  enregistrerVisage(
    @Param('id') id: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: EnregistrerVisageDto,
  ) {
    return this.elevesService.enregistrerVisage(id, tenantId, dto);
  }
}
