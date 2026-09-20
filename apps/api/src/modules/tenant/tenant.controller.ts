import { Controller, Get, Post, Patch, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import {
  CreateTenantDto,
  UpdateTenantSettingsDto,
  UpdateTenantAsSuperAdminDto,
  UpdateTypesPrimeActifsDto,
  UpdateModulesDto,
  ActiverAbonnementDto,
} from './dto/tenant.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // Pas d'auto-inscription publique : seule la super administration crée les
  // établissements (voir creerEcole ci-dessous) — un client ne peut pas créer
  // sa propre école depuis le site.

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: "Créer un établissement pour le compte d'un client (super admin)" })
  creerEcole(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Paramètres de mon établissement' })
  getMyTenant(@CurrentTenant('id') tenantId: string) {
    return this.tenantService.findOne(tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR')
  @ApiBearerAuth()
  @Put('me')
  @ApiOperation({ summary: 'Mettre à jour les paramètres de l\'établissement (admin/directeur uniquement)' })
  updateMyTenant(@CurrentTenant('id') tenantId: string, @Body() dto: UpdateTenantSettingsDto) {
    return this.tenantService.updateSettings(tenantId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR')
  @ApiBearerAuth()
  @Patch('me/types-prime')
  @ApiOperation({ summary: 'Choisir les types de primes/déductions utilisés par l\'école' })
  updateMesTypesPrimeActifs(@CurrentTenant('id') tenantId: string, @Body() dto: UpdateTypesPrimeActifsDto) {
    return this.tenantService.updateTypesPrimeActifs(tenantId, dto.types);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Lister tous les établissements (super admin)' })
  findAll() {
    return this.tenantService.findAll();
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un établissement (super admin)' })
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Get(':id/stats')
  @ApiOperation({ summary: "Tableau de bord d'un établissement — élèves, personnel, finances (super admin)" })
  getStats(@Param('id') id: string) {
    return this.tenantService.getStats(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: "Modifier les coordonnées d'un établissement et de son responsable (super admin)" })
  updateAsSuperAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateTenantAsSuperAdminDto,
  ) {
    return this.tenantService.updateAsSuperAdmin(id, dto);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activer/Désactiver un établissement (super admin)' })
  toggle(@Param('id') id: string) {
    return this.tenantService.toggleActive(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Patch(':id/modules')
  @ApiOperation({ summary: 'Activer/désactiver les modules payants d\'un établissement (super admin)' })
  updateModules(@Param('id') id: string, @Body() dto: UpdateModulesDto) {
    return this.tenantService.updateModules(id, dto.modules);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Patch(':id/abonnement')
  @ApiOperation({ summary: "Activer/renouveler la licence d'un établissement (super admin)" })
  activerAbonnement(
    @Param('id') id: string,
    @Body() dto: ActiverAbonnementDto,
  ) {
    return this.tenantService.activerAbonnement(id, dto.cycle, dto.dateDebut);
  }
}
