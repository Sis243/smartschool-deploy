import { Controller, Get, Post, Patch, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/tenant.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Enregistrer un nouvel établissement' })
  create(@Body() dto: CreateTenantDto) {
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
  updateMyTenant(@CurrentTenant('id') tenantId: string, @Body() data: any) {
    return this.tenantService.updateSettings(tenantId, data);
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
  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activer/Désactiver un établissement (super admin)' })
  toggle(@Param('id') id: string) {
    return this.tenantService.toggleActive(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @Patch(':id/modules')
  @ApiOperation({ summary: 'Activer/désactiver les modules payants d\'un établissement (super admin)' })
  updateModules(@Param('id') id: string, @Body() body: { modules: string[] }) {
    return this.tenantService.updateModules(id, body.modules);
  }
}
