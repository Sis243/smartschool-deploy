import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantSettingsDto, UpdateTenantAsSuperAdminDto } from './dto/tenant.dto';
import { MODULES_ACTIVABLES } from '../../common/constants/modules';
import { CATALOGUE_PAIE_CLES } from '../../common/constants/paie-catalogue';
import { AuthService } from '../auth/auth.service';
import { BrevoService } from '../../common/services/brevo.service';
import { buildEmailHtml } from '../../common/services/email-template';
import { CycleAbonnement } from '@prisma/client';

// Paliers de rappel avant expiration, du plus lointain au plus proche —
// "1" couvre le rappel à 24h. 0 = le jour même de l'expiration (informatif :
// l'accès est déjà bloqué en temps réel par verifierAbonnementActif, ce
// rappel explique juste pourquoi).
const SEUILS_RAPPEL_JOURS = [15, 7, 3, 1, 0];

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
            phone: dto.adminPhone,
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

  // Vue d'ensemble d'une école pour la console super admin — jamais un accès
  // aux écrans internes de l'école (élèves, notes...), juste assez de
  // chiffres pour comprendre son activité sans "se connecter à sa place".
  async getStats(tenantId: string) {
    const tenant = await this.findOne(tenantId);
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      nbEleves, nbParents, nbClasses, personnelParRole, responsable,
      totalRecettes, recettesMois, impayes,
      demandesEnAttente, paiementsRecents, inscriptionsRecentes,
    ] = await Promise.all([
      this.prisma.eleve.count({ where: { tenantId, isActive: true } }),
      this.prisma.parent.count({ where: { tenantId } }),
      this.prisma.classe.count({ where: { tenantId } }),
      this.prisma.user.groupBy({ by: ['role'], where: { tenantId, isActive: true }, _count: true }),
      // Le "responsable" affiché au super admin — premier ADMIN, sinon
      // premier DIRECTEUR ; c'est le contact qui reçoit aussi les rappels
      // d'expiration d'abonnement (voir envoyerRappelsAbonnement).
      this.prisma.user.findFirst({
        where: { tenantId, role: { in: ['ADMIN', 'DIRECTEUR'] }, isActive: true },
        orderBy: { role: 'asc' },
        select: { firstName: true, lastName: true, email: true, phone: true, role: true },
      }),
      this.prisma.paiement.aggregate({ where: { tenantId }, _sum: { montant: true } }),
      this.prisma.paiement.aggregate({ where: { tenantId, createdAt: { gte: debutMois } }, _sum: { montant: true } }),
      this.prisma.facture.aggregate({
        where: { tenantId, statut: { in: ['EN_ATTENTE', 'PARTIEL'] } },
        _sum: { montantDu: true },
        _count: true,
      }),
      this.prisma.demandeInscription.count({ where: { tenantId, statut: 'EN_ATTENTE' } }),
      this.prisma.paiement.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { eleve: { select: { nom: true, prenom: true } } },
      }),
      this.prisma.demandeInscription.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, prenomEnfant: true, nomEnfant: true, statut: true, createdAt: true },
      }),
    ]);

    return {
      tenant,
      responsable,
      nbEleves,
      nbParents,
      nbClasses,
      personnelParRole: personnelParRole.map((p) => ({ role: p.role, total: p._count })),
      totalRecettes: totalRecettes._sum.montant || 0,
      recettesMois: recettesMois._sum.montant || 0,
      montantImpaye: impayes._sum.montantDu || 0,
      nombreImpaye: impayes._count,
      demandesInscriptionEnAttente: demandesEnAttente,
      paiementsRecents,
      inscriptionsRecentes,
    };
  }

  // Édition des coordonnées d'un établissement par le super admin — distinct
  // de updateSettings (PUT /tenants/me), réservé à l'école elle-même.
  // responsablePhone est volontairement le seul champ modifiable du contact
  // ADMIN/DIRECTEUR : changer son email toucherait à son identifiant de
  // connexion, ce qui reste du ressort de l'école elle-même (Paramètres > Utilisateurs).
  async updateAsSuperAdmin(tenantId: string, data: UpdateTenantAsSuperAdminDto) {
    await this.findOne(tenantId);

    const [tenant] = await Promise.all([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { name: data.name, phone: data.phone, address: data.address, email: data.email },
      }),
      data.responsablePhone !== undefined
        ? this.prisma.user.updateMany({
            where: { tenantId, role: { in: ['ADMIN', 'DIRECTEUR'] }, isActive: true },
            data: { phone: data.responsablePhone },
          })
        : Promise.resolve(),
    ]);

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
      data: { subscriptionCycle: cycle, subscriptionEnd, dernierRappelAbonnement: null, rappelsAbonnementEnvoyes: [] },
      select: { id: true, name: true, subscriptionCycle: true, subscriptionEnd: true },
    });
  }

  // Rappels automatiques avant expiration, à 15j / 7j / 3j / 24h et le jour
  // même — chaque palier n'est envoyé qu'une fois par échéance (suivi via
  // rappelsAbonnementEnvoyes, remis à vide à chaque activerAbonnement). Le
  // cron tourne une fois par jour ; si un run est manqué (serveur down...),
  // tous les paliers dus mais pas encore envoyés partent au run suivant.
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async envoyerRappelsAbonnement() {
    const plusProcheSeuil = Math.max(...SEUILS_RAPPEL_JOURS);
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + plusProcheSeuil);

    const tenants = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        subscriptionCycle: { not: 'A_VIE' },
        subscriptionEnd: { not: null, lte: dateLimite },
      },
      include: { users: { where: { role: { in: ['ADMIN', 'DIRECTEUR'] }, isActive: true }, select: { email: true, firstName: true, phone: true } } },
    });

    for (const tenant of tenants) {
      const joursRestants = Math.max(
        0,
        Math.ceil((tenant.subscriptionEnd!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      );
      // Paliers dus (>= jours restants) et pas encore notifiés cette échéance.
      const seuilsDus = SEUILS_RAPPEL_JOURS.filter(
        (s) => s >= joursRestants && !tenant.rappelsAbonnementEnvoyes.includes(s),
      );
      if (seuilsDus.length === 0) continue;

      const expire = joursRestants === 0;
      const html = buildEmailHtml({
        titre: expire ? 'Votre abonnement expire aujourd\'hui' : `Votre abonnement expire dans ${joursRestants} jour(s)`,
        etablissement: tenant.name,
        paragraphes: [
          `Bonjour,`,
          `L'abonnement SmartSchool ERP de <strong>${tenant.name}</strong> ${expire ? 'expire aujourd\'hui' : `expire le ${tenant.subscriptionEnd!.toLocaleDateString('fr-FR')}`}.`,
          `Contactez SmartSchool pour renouveler et éviter toute interruption d'accès.`,
        ],
        note: expire
          ? "L'accès à la plateforme est désormais bloqué jusqu'au renouvellement."
          : 'Une fois expiré, l\'accès à la plateforme sera bloqué jusqu\'au renouvellement.',
      });
      const texte = (u: { firstName: string }) =>
        `Bonjour ${u.firstName}, l'abonnement de ${tenant.name} ${expire ? 'expire aujourd\'hui' : `expire dans ${joursRestants} jour(s)`}. Merci de le renouveler.`;

      await Promise.all(
        tenant.users.flatMap((u) => [
          this.brevo.sendEmail(
            u.email,
            expire ? 'Abonnement SmartSchool ERP expiré' : 'Rappel : abonnement SmartSchool ERP bientôt expiré',
            texte(u),
            tenant.name,
            html,
          ),
          u.phone ? this.brevo.sendWhatsapp(u.phone, texte(u)) : Promise.resolve(false),
        ]),
      );
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          dernierRappelAbonnement: new Date(),
          rappelsAbonnementEnvoyes: [...tenant.rappelsAbonnementEnvoyes, ...seuilsDus],
        },
      });
      this.logger.log(`Rappel(s) d'abonnement envoyé(s) pour ${tenant.name} (${joursRestants}j restants, palier(s) ${seuilsDus.join(',')})`);
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

  async updateSettings(tenantId: string, data: UpdateTenantSettingsDto) {
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
