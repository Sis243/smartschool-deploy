import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RhService } from './rh.service';
import { CreatePersonnelDto } from './dto/personnel.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('RH')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rh')
export class RhController {
  constructor(private readonly rhService: RhService) {}

  @Get('personnel')
  @ApiOperation({ summary: 'Lister le personnel' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.rhService.findAllPersonnel(tenantId);
  }

  @Post('personnel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR')
  @ApiOperation({ summary: 'Ajouter un membre du personnel (admin/directeur uniquement)' })
  create(@CurrentTenant('id') tenantId: string, @Body() dto: CreatePersonnelDto) {
    return this.rhService.createPersonnel(tenantId, dto);
  }

  @Get('presences')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR')
  @ApiOperation({ summary: 'Présences du personnel (admin/directeur uniquement)' })
  getPresences(@CurrentTenant('id') tenantId: string, @Query('date') date?: string) {
    return this.rhService.getPresencesPersonnel(tenantId, date);
  }

  @Post('presences')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR')
  @ApiOperation({ summary: 'Marquer présence personnel (admin/directeur uniquement)' })
  marquerPresence(@CurrentTenant('id') tenantId: string, @Body() data: any) {
    return this.rhService.marquerPresencePersonnel(tenantId, data);
  }
}
