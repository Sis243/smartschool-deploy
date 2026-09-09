import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifParentService } from '../notif-parent/notif-parent.service';
import { FinancesService } from '../finances/finances.service';
import { BrevoService } from '../../common/services/brevo.service';
import { buildEmailHtml } from '../../common/services/email-template';
import { StatutPreuve } from '@prisma/client';

@Injectable()
export class ParentPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notifService: NotifParentService,
    private readonly financesService: FinancesService,
    private readonly brevo: BrevoService,
    private readonly configService: ConfigService,
  ) {}

  // ── Auth ──────────────────────────────────────────────────────────────────
  // Aucune de ces deux routes ne dépend d'un tenant résolu par le serveur
  // (sous-domaine/en-tête) : l'application tourne sur un seul domaine partagé
  // (pas encore de sous-domaine par école), donc le tenant est retrouvé à
  // partir des identifiants eux-mêmes — accessCode est unique globalement,
  // et pour le login on recherche parmi tous les parents ayant ce téléphone.

  async activerPortail(accessCode: string, telephone: string, pin: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { accessCode, telephone },
      include: { tenant: { select: { modulesActifs: true } } },
    });
    if (!parent) throw new BadRequestException('Code d\'accès ou téléphone invalide');
    if (!parent.tenant.modulesActifs.includes('PARENT_PORTAL')) {
      throw new BadRequestException("Le portail parent n'est pas activé pour cet établissement");
    }
    if (parent.portalActif) throw new BadRequestException('Portail déjà activé');

    const pinHash = await bcrypt.hash(pin, 10);
    await this.prisma.parent.update({
      where: { id: parent.id },
      data: { pin: pinHash, portalActif: true },
    });

    return { message: 'Portail activé avec succès' };
  }

  async login(telephone: string, pin: string) {
    const candidats = await this.prisma.parent.findMany({
      where: { telephone, portalActif: true, pin: { not: null } },
      include: { tenant: { select: { modulesActifs: true, isActive: true } } },
    });

    for (const parent of candidats) {
      if (!parent.pin) continue;
      const valid = await bcrypt.compare(pin, parent.pin);
      if (!valid) continue;
      if (!parent.tenant.isActive || !parent.tenant.modulesActifs.includes('PARENT_PORTAL')) {
        throw new UnauthorizedException("Le portail parent n'est plus accessible pour cet établissement");
      }

      const payload = { sub: parent.id, tenantId: parent.tenantId, type: 'parent' };
      return {
        accessToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
        parent: {
          id: parent.id,
          nom: parent.nom,
          prenom: parent.prenom,
          telephone: parent.telephone,
        },
      };
    }

    throw new UnauthorizedException('Téléphone ou PIN incorrect');
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboard(tenantId: string, parentId: string) {
    const [eleves, factures, nonLues] = await Promise.all([
      this.prisma.eleve.findMany({
        where: { tenantId, parentId, isActive: true },
        include: { classe: { select: { nom: true, niveau: true } } },
      }),
      this.prisma.facture.findMany({
        where: {
          tenantId,
          eleve: { parentId },
          statut: { in: ['EN_ATTENTE', 'PARTIEL'] },
        },
        include: { eleve: { select: { nom: true, prenom: true } } },
        orderBy: { echeance: 'asc' },
        take: 5,
      }),
      this.prisma.notifParent.count({ where: { tenantId, parentId, lu: false } }),
    ]);

    return { eleves, facturesEnAttente: factures, notifNonLues: nonLues };
  }

  // ── Factures ──────────────────────────────────────────────────────────────

  async getFactures(tenantId: string, parentId: string) {
    return this.prisma.facture.findMany({
      where: { tenantId, eleve: { parentId } },
      include: {
        eleve: { select: { nom: true, prenom: true, matricule: true } },
        paiements: { orderBy: { createdAt: 'desc' }, take: 3 },
        preuves: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Soumettre preuve de paiement ──────────────────────────────────────────

  async soumettrePreuve(
    tenantId: string,
    parentId: string,
    data: {
      factureId: string;
      montant: number;
      modePaiement: string;
      reference?: string;
      fichierUrl?: string;
      fichierNom?: string;
    },
  ) {
    const facture = await this.prisma.facture.findFirst({
      where: { id: data.factureId, tenantId, eleve: { parentId } },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');

    const preuve = await this.prisma.preuvePaiement.create({
      data: {
        tenantId,
        factureId: data.factureId,
        parentId,
        montant: data.montant,
        modePaiement: data.modePaiement as any,
        reference: data.reference,
        fichierUrl: data.fichierUrl,
        fichierNom: data.fichierNom,
        statut: 'EN_ATTENTE',
      },
    });

    // Notify parent: receipt received
    await this.notifService.send({
      tenantId,
      parentId,
      canal: 'SMS',
      titre: 'Preuve de paiement reçue',
      message: `Votre preuve de paiement de ${data.montant} CDF a été reçue et est en cours de validation.`,
    });

    return preuve;
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  async getNotifications(tenantId: string, parentId: string, page = 1, limit = 20) {
    return this.notifService.findByParent(tenantId, parentId, page, limit);
  }

  async marquerLu(tenantId: string, id: string, parentId: string) {
    return this.notifService.marquerLu(tenantId, id, parentId);
  }

  // ── Admin: lister preuves en attente ──────────────────────────────────────

  async getPreuvesEnAttente(tenantId: string) {
    return this.prisma.preuvePaiement.findMany({
      where: { tenantId, statut: 'EN_ATTENTE' },
      include: {
        facture: { include: { eleve: { select: { nom: true, prenom: true, matricule: true } } } },
        parent: { select: { nom: true, prenom: true, telephone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async validerPreuve(
    tenantId: string,
    preuveId: string,
    adminId: string,
    action: 'VALIDE' | 'REJETE',
    noteAdmin?: string,
  ) {
    const preuve = await this.prisma.preuvePaiement.findFirst({
      where: { id: preuveId, tenantId },
      include: { facture: true, parent: true },
    });
    if (!preuve) throw new NotFoundException('Preuve introuvable');

    let paiementId: string | undefined;

    if (action === 'VALIDE') {
      // Délègue à FinancesService pour réutiliser la même logique (transaction
      // atomique, calcul du solde, numéro de reçu) que les paiements enregistrés
      // directement par l'administration — évite toute divergence entre les deux
      // parcours de paiement.
      const paiement = await this.financesService.enregistrerPaiement(tenantId, {
        factureId: preuve.factureId,
        montant: preuve.montant,
        modePaiement: preuve.modePaiement,
        reference: preuve.reference ?? undefined,
        notes: 'Preuve de paiement soumise via le portail parent',
      });

      paiementId = paiement.id;
    }

    await this.prisma.preuvePaiement.update({
      where: { id: preuveId },
      data: {
        statut: action as StatutPreuve,
        validePar: adminId,
        valideAt: new Date(),
        noteAdmin,
        paiementId,
      },
    });

    // Notify parent
    if (preuve.parentId) {
      const msg =
        action === 'VALIDE'
          ? `Votre paiement de ${preuve.montant} CDF a été validé. Merci !`
          : `Votre preuve de paiement a été rejetée. ${noteAdmin ?? ''}. Veuillez contacter l'école.`;

      await this.notifService.sendAll(
        tenantId,
        preuve.parentId,
        action === 'VALIDE' ? 'Paiement validé ✓' : 'Preuve rejetée',
        msg,
      );
    }

    return { message: `Preuve ${action === 'VALIDE' ? 'validée' : 'rejetée'} avec succès` };
  }

  // ── Admin: générer code d'accès pour un parent ────────────────────────────

  async genererAccessCode(tenantId: string, parentId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { id: parentId, tenantId },
      include: { tenant: { select: { name: true } } },
    });
    if (!parent) throw new NotFoundException('Parent introuvable');
    if (!parent.email) {
      throw new BadRequestException(
        "Ce parent n'a pas d'adresse e-mail enregistrée — le code d'accès est envoyé par e-mail, ajoutez-en une d'abord.",
      );
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await this.prisma.parent.update({
      where: { id: parentId },
      data: { accessCode: code, portalActif: false, pin: null },
    });

    const frontendUrl = this.configService.get<string>('frontendUrl');
    const lien = `${frontendUrl}/parent/login?mode=activer&code=${code}`;
    const html = buildEmailHtml({
      titre: 'Accédez au suivi scolaire de votre enfant',
      etablissement: parent.tenant.name,
      paragraphes: [
        `Bonjour ${parent.prenom},`,
        `${parent.tenant.name} vous invite à activer votre accès au portail parent SmartSchool : notes, présences, factures et notifications de votre enfant, directement depuis votre téléphone.`,
        `Cliquez sur le bouton ci-dessous, indiquez votre numéro de téléphone et choisissez un code PIN personnel pour terminer l'activation.`,
      ],
      ctaLabel: 'Activer mon accès parent',
      ctaUrl: lien,
      note: `Votre code d'accès : ${code}. Une fois la page ouverte, vous pourrez aussi installer l'application sur votre téléphone en un clic.`,
    });

    const envoye = await this.brevo.sendEmail(
      parent.email,
      `Votre accès au portail parent — ${parent.tenant.name}`,
      `Bonjour ${parent.prenom},\n\n${parent.tenant.name} vous invite à activer votre accès au portail parent SmartSchool.\nVotre code d'accès : ${code}\nActivez votre compte ici : ${lien}`,
      parent.tenant.name,
      html,
    );

    return { accessCode: code, envoye };
  }
}
