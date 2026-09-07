import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/tenant.dto';
import { MODULES_ACTIVABLES } from '../../common/constants/modules';
import { CATALOGUE_PAIE_CLES } from '../../common/constants/paie-catalogue';
import { AuthService } from '../auth/auth.service';
import { BrevoService } from '../../common/services/brevo.service';
import { buildEmailHtml } from '../../common/services/email-template';
import { CycleAbonnement } from '@prisma/client';

const JOURS_RAPPEL_AVANT_EXPIRATION = 7;

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly brevo: BrevoService,
  ) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: dto.slug }, { email: dto.email }] },
    });

    if (existing) {
      throw new ConflictException('Un établissement avec ce slug ou email existe déjà');
    }

    // Auto-inscription publique : la personne choisit son mot de passe.
    // Création par un super admin (adminPassword omis) : mot de passe
    // inconnu de tous, l'admin de l'école l'active via un e-mail d'invitation.
    const motDePasseFourni = !!dto.adminPassword;
    const hashedPassword = await bcrypt.hash(dto.adminPassword || randomBytes(24).toString('hex'), 12);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        schoolType: dto.schoolType || 'GENERALE',
        subscriptionPlan: dto.subscriptionPlan || 'BASIC',
        users: {
          create: {
            email: dto.adminEmail,
            password: hashedPassword,
            firstName: dto.adminFirstName,
            lastName: dto.adminLastName,
            role: 'ADMIN',
          },
        },
      },
      include: { users: { select: { id: true, email: true, role: true } } },
    });

    let invitationEnvoyee = false;
    if (!motDePasseFourni) {
      invitationEnvoyee = await this.authService.envoyerInvitation(tenant.users[0].id);
    }

    return { ...tenant, invitationEnvoyee };
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        schoolType: true,
        subscriptionPlan: true,
        subscriptionCycle: true,
        subscriptionEnd: true,
        isActive: true,
        modulesActifs: true,
        createdAt: true,
        _count: { select: { users: true, eleves: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, eleves: true, classes: true } },
      },
    });

    if (!tenant) throw new NotFoundException('Établissement introuvable');
    return tenant;
  }

  async updateModules(tenantId: string, modules: string[]) {
    const invalides = modules.filter((m) => !MODULES_ACTIVABLES.includes(m as any));
    if (invalides.length > 0) {
      throw new BadRequestException(`Module(s) inconnu(s) : ${invalides.join(', ')}`);
    }
    await this.findOne(tenantId);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { modulesActifs: modules },
      select: { id: true, name: true, modulesActifs: true },
    });
  }

  async toggleActive(id: string) {
    const tenant = await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
    });
  }

  // Calcule la nouvelle date d'expiration à partir d'une date de départ (par
  // défaut aujourd'hui, ou la date d'expiration actuelle si elle est encore
  // dans le futur — pour prolonger un abonnement en cours plutôt que de
  // repartir de zéro). A_VIE n'a jamais d'expiration.
  async activerAbonnement(tenantId: string, cycle: CycleAbonnement, dateDebut?: string) {
    const tenant = await this.findOne(tenantId);

    let subscriptionEnd: Date | null = null;
    if (cycle !== 'A_VIE') {
      const base = dateDebut
        ? new Date(dateDebut)
        : tenant.subscriptionEnd && tenant.subscriptionEnd > new Date() && tenant.subscriptionCycle !== 'A_VIE'
          ? tenant.subscriptionEnd
          : new Date();
      subscriptionEnd = new Date(base);
      if (cycle === 'MENSUEL') subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      if (cycle === 'ANNUEL') subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { subscriptionCycle: cycle, subscriptionEnd, dernierRappelAbonnement: null },
      select: { id: true, name: true, subscriptionCycle: true, subscriptionEnd: true },
    });
  }

  // Rappel automatique avant expiration (une seule fois par échéance, suivi
  // via dernierRappelAbonnement — remis à null à chaque activerAbonnement).
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async envoyerRappelsAbonnement() {
    const dansXJours = new Date();
    dansXJours.setDate(dansXJours.getDate() + JOURS_RAPPEL_AVANT_EXPIRATION);

    const tenants = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        subscriptionCycle: { not: 'A_VIE' },
        subscriptionEnd: { not: null, lte: dansXJours },
        dernierRappelAbonnement: null,
      },
      include: { users: { where: { role: { in: ['ADMIN', 'DIRECTEUR'] } }, select: { email: true, firstName: true } } },
    });

    for (const tenant of tenants) {
      const joursRestants = Math.max(
        0,
        Math.ceil((tenant.subscriptionEnd!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      );
      const expire = joursRestants === 0;
      const html = buildEmailHtml({
        titre: expire ? 'Votre abonnement expire aujourd\'hui' : `Votre abonnement expire dans ${joursRestants} jour(s)`,
        etablissement: tenant.name,
        paragraphes: [
          `Bonjour,`,
          `L'abonnement SmartSchool ERP de <strong>${tenant.name}</strong> ${expire ? 'expire aujourd\'hui' : `expire le ${tenant.subscriptionEnd!.toLocaleDateString('fr-FR')}`}.`,
          `Contactez SmartSchool pour renouveler et éviter toute interruption d'accès.`,
        ],
        note: 'Une fois expiré, l\'accès à la plateforme sera bloqué jusqu\'au renouvellement.',
      });

      await Promise.all(
        tenant.users.map((u) =>
          this.brevo.sendEmail(
            u.email,
            expire ? 'Abonnement SmartSchool ERP expiré' : 'Rappel : abonnement SmartSchool ERP bientôt expiré',
            `Bonjour ${u.firstName}, l'abonnement de ${tenant.name} ${expire ? 'expire aujourd\'hui' : `expire dans ${joursRestants} jour(s)`}. Merci de le renouveler.`,
            tenant.name,
            html,
          ),
        ),
      );
      await this.prisma.tenant.update({ where: { id: tenant.id }, data: { dernierRappelAbonnement: new Date() } });
      this.logger.log(`Rappel d'abonnement envoyé pour ${tenant.name} (${joursRestants}j restants)`);
    }
  }

  // Chaque école choisit elle-même, parmi le catalogue de primes/déductions
  // courantes en RDC, celles qu'elle utilise — présélection réutilisée à la
  // création des fiches de paie (voir RhService).
  async updateTypesPrimeActifs(tenantId: string, types: string[]) {
    const invalides = types.filter((t) => !CATALOGUE_PAIE_CLES.includes(t));
    if (invalides.length > 0) {
      throw new BadRequestException(`Type(s) de prime inconnu(s) : ${invalides.join(', ')}`);
    }
    await this.findOne(tenantId);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { typesPrimeActifs: types },
      select: { id: true, typesPrimeActifs: true },
    });
  }

  async updateSettings(tenantId: string, data: {
    name?: string;
    phone?: string;
    address?: string;
    email?: string;
    logoUrl?: string;
  }) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        email: data.email,
        logoUrl: data.logoUrl,
      },
      select: {
        id: true, name: true, slug: true, email: true,
        phone: true, address: true, schoolType: true,
        subscriptionPlan: true, subscriptionCycle: true, subscriptionEnd: true, logoUrl: true,
      },
    });
  }
}
