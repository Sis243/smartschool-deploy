import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransportService } from './transport.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Transport')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transport')
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Get('bus')
  @ApiOperation({ summary: 'Lister les bus' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.transportService.findAllBus(tenantId);
  }

  @Post('bus')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
  @ApiOperation({ summary: 'Ajouter un bus' })
  createBus(@CurrentTenant('id') tenantId: string, @Body() data: any) {
    return this.transportService.createBus(tenantId, data);
  }

  @Get('bus/:busId/itineraires')
  @ApiOperation({ summary: 'Itinéraires d\'un bus' })
  getItineraires(@CurrentTenant('id') tenantId: string, @Param('busId') busId: string) {
    return this.transportService.getItineraires(tenantId, busId);
  }

  @Get('abonnements')
  @ApiOperation({ summary: 'Lister les abonnements' })
  getAbonnements(@CurrentTenant('id') tenantId: string) {
    return this.transportService.getAbonnements(tenantId);
  }

  @Post('abonnements')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
  @ApiOperation({ summary: 'Abonner un élève à un bus' })
  abonner(@CurrentTenant('id') tenantId: string, @Body() data: { eleveId: string; busId: string }) {
    return this.transportService.abonnerEleve(tenantId, data.eleveId, data.busId);
  }

  @Delete('abonnements/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
  @ApiOperation({ summary: 'Désabonner un élève du transport' })
  desabonner(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.transportService.desabonnerEleve(tenantId, id);
  }
}
