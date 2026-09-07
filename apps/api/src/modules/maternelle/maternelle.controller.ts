import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MaternelleService } from './maternelle.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ModuleActifGuard } from '../../common/guards/module-actif.guard';
import { RequireModule } from '../../common/decorators/module.decorator';

@ApiTags('Maternelle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleActifGuard)
@RequireModule('MATERNELLE')
@Controller('maternelle')
export class MaternelleController {
  constructor(private readonly maternelleService: MaternelleService) {}

  @Get('eleves')
  @ApiOperation({ summary: 'Lister les élèves de maternelle' })
  getEleves(@CurrentTenant('id') tenantId: string) {
    return this.maternelleService.getElevesMaternelle(tenantId);
  }

  @Get('suivis')
  @ApiOperation({ summary: 'Lister les suivis journaliers' })
  getSuivis(
    @CurrentTenant('id') tenantId: string,
    @Query('eleveId') eleveId?: string,
    @Query('date') date?: string,
  ) {
    return this.maternelleService.getSuivis(tenantId, eleveId, date);
  }

  @Post('suivis')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'ENSEIGNANT')
  @ApiOperation({ summary: 'Enregistrer un suivi journalier' })
  createSuivi(@CurrentTenant('id') tenantId: string, @Body() data: any) {
    return this.maternelleService.createSuivi(tenantId, data);
  }
}
