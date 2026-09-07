import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinancesService } from './finances.service';
import { CreateFactureDto, EnregistrerPaiementDto } from './dto/finances.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// Module financier réservé au personnel administratif/comptable : données
// sensibles (recettes, impayés) en lecture comme en écriture.
@ApiTags('Finances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DIRECTEUR', 'COMPTABLE', 'SECRETAIRE')
@Controller('finances')
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord financier' })
  getDashboard(@CurrentTenant('id') tenantId: string) {
    return this.financesService.getDashboard(tenantId);
  }

  @Post('factures')
  @ApiOperation({ summary: 'Créer une facture' })
  createFacture(@CurrentTenant('id') tenantId: string, @Body() dto: CreateFactureDto) {
    return this.financesService.createFacture(tenantId, dto);
  }

  @Post('paiements')
  @ApiOperation({ summary: 'Enregistrer un paiement' })
  enregistrerPaiement(@CurrentTenant('id') tenantId: string, @Body() dto: EnregistrerPaiementDto) {
    return this.financesService.enregistrerPaiement(tenantId, dto);
  }

  @Get('factures')
  @ApiOperation({ summary: 'Lister toutes les factures' })
  getAllFactures(
    @CurrentTenant('id') tenantId: string,
    @Query() query: { page?: number; limit?: number; statut?: string; search?: string },
  ) {
    return this.financesService.getAllFactures(tenantId, query);
  }

  @Get('factures/:id')
  @ApiOperation({ summary: 'Détails d\'une facture' })
  getFactureById(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.financesService.getFactureById(tenantId, id);
  }

  @Patch('factures/:id/annuler')
  @ApiOperation({ summary: 'Annuler une facture (si aucun paiement reçu)' })
  annulerFacture(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.financesService.annulerFacture(tenantId, id);
  }

  @Get('paiements')
  @ApiOperation({ summary: 'Lister tous les paiements' })
  getAllPaiements(@CurrentTenant('id') tenantId: string, @Query() query: { page?: number; limit?: number }) {
    return this.financesService.getAllPaiements(tenantId, query);
  }

  @Get('factures/eleve/:eleveId')
  @ApiOperation({ summary: 'Factures d\'un élève' })
  getFacturesEleve(@CurrentTenant('id') tenantId: string, @Param('eleveId') eleveId: string) {
    return this.financesService.getFacturesEleve(tenantId, eleveId);
  }

  @Get('revenus-mensuels')
  @ApiOperation({ summary: 'Revenus mensuels de l\'année en cours' })
  getRevenuesMensuels(@CurrentTenant('id') tenantId: string) {
    return this.financesService.getRevenuesMensuels(tenantId);
  }
}
