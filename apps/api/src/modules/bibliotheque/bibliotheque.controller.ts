import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BibliothequeService } from './bibliotheque.service';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const ROLES_GESTION_BIBLIOTHEQUE = ['ADMIN', 'DIRECTEUR', 'BIBLIOTHECAIRE'] as const;

@ApiTags('Bibliotheque')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bibliotheque')
export class BibliothequeController {
  constructor(private readonly bibliothequeService: BibliothequeService) {}

  @Get('livres')
  @ApiOperation({ summary: 'Catalogue des livres' })
  findAll(@CurrentTenant('id') tenantId: string, @Query('search') search?: string) {
    return this.bibliothequeService.findAllLivres(tenantId, search);
  }

  @Post('livres')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION_BIBLIOTHEQUE)
  @ApiOperation({ summary: 'Ajouter un livre au catalogue' })
  createLivre(@CurrentTenant('id') tenantId: string, @Body() data: any) {
    return this.bibliothequeService.createLivre(tenantId, data);
  }

  @Get('emprunts')
  @ApiOperation({ summary: 'Lister les emprunts' })
  getEmprunts(@CurrentTenant('id') tenantId: string, @Query('statut') statut?: string) {
    return this.bibliothequeService.getEmprunts(tenantId, statut);
  }

  @Post('emprunts')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION_BIBLIOTHEQUE)
  @ApiOperation({ summary: 'Emprunter un livre' })
  emprunter(@CurrentTenant('id') tenantId: string, @Body() data: any) {
    return this.bibliothequeService.emprunterLivre(tenantId, data);
  }

  @Post('emprunts/:id/retour')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION_BIBLIOTHEQUE)
  @ApiOperation({ summary: 'Retourner un livre' })
  retourner(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.bibliothequeService.retournerLivre(tenantId, id);
  }
}
