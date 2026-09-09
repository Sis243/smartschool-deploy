import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ParentPortalService } from './parent-portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ModuleActifGuard } from '../../common/guards/module-actif.guard';
import { RequireModule } from '../../common/decorators/module.decorator';

// Guard that validates JWT and checks type === 'parent'
import { ParentJwtGuard } from './parent-jwt.guard';

// ModuleActifGuard est posé route par route (jamais au niveau classe) : ce
// contrôleur mélange routes publiques (tenant résolu par le middleware),
// routes parent (ParentJwtGuard) et routes admin (JwtAuthGuard) — le guard
// doit toujours s'exécuter APRÈS l'éventuel guard d'authentification pour
// lire request.user une fois peuplé.
@ApiTags('Parent Portal')
@Controller('parent')
export class ParentPortalController {
  constructor(private readonly service: ParentPortalService) {}

  // ── Public auth endpoints ─────────────────────────────────────────────────

  // Pas de tenant résolu ici (pas de sous-domaine par école pour l'instant) —
  // le service retrouve l'école à partir de l'accessCode/téléphone lui-même
  // et vérifie que le module PARENT_PORTAL y est actif (voir ParentPortalService).

  @Post('auth/activer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activer le portail parent avec le code d\'accès' })
  activer(@Body() body: { accessCode: string; telephone: string; pin: string }) {
    return this.service.activerPortail(body.accessCode, body.telephone, body.pin);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion parent par téléphone + PIN' })
  login(@Body() body: { telephone: string; pin: string }) {
    return this.service.login(body.telephone, body.pin);
  }

  // ── Authenticated parent endpoints ────────────────────────────────────────

  @Get('dashboard')
  @UseGuards(ParentJwtGuard, ModuleActifGuard)
  @RequireModule('PARENT_PORTAL')
  dashboard(@Request() req: any) {
    return this.service.getDashboard(req.user.tenantId, req.user.id);
  }

  @Get('factures')
  @UseGuards(ParentJwtGuard, ModuleActifGuard)
  @RequireModule('PARENT_PORTAL')
  factures(@Request() req: any) {
    return this.service.getFactures(req.user.tenantId, req.user.id);
  }

  @Post('paiements/preuve')
  @UseGuards(ParentJwtGuard, ModuleActifGuard)
  @RequireModule('PARENT_PORTAL')
  soumettrePreuve(
    @Request() req: any,
    @Body()
    body: {
      factureId: string;
      montant: number;
      modePaiement: string;
      reference?: string;
      fichierUrl?: string;
      fichierNom?: string;
    },
  ) {
    return this.service.soumettrePreuve(req.user.tenantId, req.user.id, body);
  }

  @Get('notifications')
  @UseGuards(ParentJwtGuard, ModuleActifGuard)
  @RequireModule('PARENT_PORTAL')
  notifications(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.getNotifications(req.user.tenantId, req.user.id, Number(page), Number(limit));
  }

  @Patch('notifications/:id/lu')
  @UseGuards(ParentJwtGuard, ModuleActifGuard)
  @RequireModule('PARENT_PORTAL')
  marquerLu(@Request() req: any, @Param('id') id: string) {
    return this.service.marquerLu(req.user.tenantId, id, req.user.id);
  }

  // ── Admin endpoints (requires admin JWT) ─────────────────────────────────

  @Get('admin/preuves')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModuleActifGuard, RolesGuard)
  @RequireModule('PARENT_PORTAL')
  @Roles('ADMIN', 'DIRECTEUR', 'COMPTABLE', 'SECRETAIRE')
  getPreuves(@CurrentTenant('id') tenantId: string) {
    return this.service.getPreuvesEnAttente(tenantId);
  }

  @Patch('admin/preuves/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModuleActifGuard, RolesGuard)
  @RequireModule('PARENT_PORTAL')
  @Roles('ADMIN', 'DIRECTEUR', 'COMPTABLE', 'SECRETAIRE')
  validerPreuve(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { action: 'VALIDE' | 'REJETE'; noteAdmin?: string },
  ) {
    return this.service.validerPreuve(tenantId, id, req.user.id, body.action, body.noteAdmin);
  }

  @Post('admin/parents/:parentId/access-code')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModuleActifGuard, RolesGuard)
  @RequireModule('PARENT_PORTAL')
  @Roles('ADMIN', 'DIRECTEUR', 'SECRETAIRE')
  genererCode(
    @CurrentTenant('id') tenantId: string,
    @Param('parentId') parentId: string,
  ) {
    return this.service.genererAccessCode(tenantId, parentId);
  }
}
