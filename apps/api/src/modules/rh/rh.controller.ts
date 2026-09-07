import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { RhService } from './rh.service';
import { CreatePersonnelDto } from './dto/personnel.dto';
import { CreateFichePaieDto } from './dto/paie.dto';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ModuleActifGuard } from '../../common/guards/module-actif.guard';
import { RequireModule } from '../../common/decorators/module.decorator';
import { CATALOGUE_PAIE } from '../../common/constants/paie-catalogue';

const ROLES_PAIE = ['ADMIN', 'DIRECTEUR', 'COMPTABLE'] as const;

@ApiTags('RH')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleActifGuard)
@RequireModule('RH')
@Controller('rh')
export class RhController {
  constructor(private readonly rhService: RhService) {}

  @Get('personnel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DIRECTEUR')
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

  // ── Paie ──────────────────────────────────────────────────────────────────
  // Réservé à ADMIN/DIRECTEUR/COMPTABLE, en lecture comme en écriture —
  // données salariales sensibles.

  @Get('paie/catalogue')
  @RequireModule('PAIE')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PAIE)
  @ApiOperation({ summary: 'Catalogue des types de primes/déductions courants (RDC)' })
  getCataloguePaie() {
    return CATALOGUE_PAIE;
  }

  @Post('paie/importer')
  @RequireModule('PAIE')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PAIE)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importer les fiches de paie en masse depuis un fichier CSV' })
  importerFichesPaie(
    @CurrentTenant('id') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('periode') periode: string,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    if (!periode) throw new BadRequestException('Période requise');
    return this.rhService.importerFichesPaie(tenantId, periode, file.buffer);
  }

  @Get('paie')
  @RequireModule('PAIE')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PAIE)
  @ApiOperation({ summary: 'Lister les fiches de paie' })
  getFichesPaie(
    @CurrentTenant('id') tenantId: string,
    @Query('userId') userId?: string,
    @Query('periode') periode?: string,
  ) {
    return this.rhService.getFichesPaie(tenantId, { userId, periode });
  }

  @Get('paie/:id')
  @RequireModule('PAIE')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PAIE)
  @ApiOperation({ summary: "Détail d'une fiche de paie" })
  getFichePaieById(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.rhService.getFichePaieById(tenantId, id);
  }

  @Post('paie')
  @RequireModule('PAIE')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PAIE)
  @ApiOperation({ summary: 'Créer une fiche de paie' })
  createFichePaie(@CurrentTenant('id') tenantId: string, @Body() dto: CreateFichePaieDto) {
    return this.rhService.createFichePaie(tenantId, dto);
  }

  @Patch('paie/:id/statut')
  @RequireModule('PAIE')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PAIE)
  @ApiOperation({ summary: "Changer le statut d'une fiche de paie (brouillon/validée/payée)" })
  changerStatutFichePaie(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body() body: { statut: 'BROUILLON' | 'VALIDEE' | 'PAYEE' },
  ) {
    return this.rhService.changerStatutFichePaie(tenantId, id, body.statut);
  }

  @Delete('paie/:id')
  @RequireModule('PAIE')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PAIE)
  @ApiOperation({ summary: 'Supprimer une fiche de paie (si non payée)' })
  deleteFichePaie(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.rhService.deleteFichePaie(tenantId, id);
  }
}
