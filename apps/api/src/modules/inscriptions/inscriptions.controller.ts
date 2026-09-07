import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InscriptionsService } from './inscriptions.service';
import { SoumettreInscriptionDto } from './dto/inscription.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// ─── Routes publiques (sans auth) ─────────────────────────────────────────────
@ApiTags('Inscriptions')
@Controller('inscriptions')
export class InscriptionsPublicController {
  constructor(private readonly inscriptionsService: InscriptionsService) {}

  @Get('etablissement/:slug')
  @ApiOperation({ summary: 'Infos publiques de l\'établissement' })
  getTenantInfo(@Param('slug') slug: string) {
    return this.inscriptionsService.getTenantPublicInfo(slug);
  }

  @Post('soumettre/:slug')
  @ApiOperation({ summary: 'Soumettre une demande d\'inscription (public)' })
  soumettre(@Param('slug') slug: string, @Body() data: SoumettreInscriptionDto) {
    return this.inscriptionsService.soumettreInscription(slug, data);
  }
}

// ─── Routes privées (secrétaire/admin) ────────────────────────────────────────
@ApiTags('Inscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
@Controller('inscriptions/admin')
export class InscriptionsAdminController {
  constructor(private readonly inscriptionsService: InscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les demandes d\'inscription' })
  getDemandes(
    @CurrentTenant('id') tenantId: string,
    @Query('statut') statut?: string,
  ) {
    return this.inscriptionsService.getDemandes(tenantId, statut);
  }

  @Patch(':id/approuver')
  @ApiOperation({ summary: 'Approuver une demande et créer l\'élève' })
  approuver(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body() data: { classeId?: string; noteSecretaire?: string },
  ) {
    return this.inscriptionsService.approuver(tenantId, id, data);
  }

  @Patch(':id/rejeter')
  @ApiOperation({ summary: 'Rejeter une demande' })
  rejeter(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body() data: { note?: string },
  ) {
    return this.inscriptionsService.rejeter(tenantId, id, data.note);
  }
}
