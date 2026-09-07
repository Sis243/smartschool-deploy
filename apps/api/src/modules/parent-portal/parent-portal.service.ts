import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifParentService } from '../notif-parent/notif-parent.service';
import { FinancesService } from '../finances/finances.service';
import { StatutPreuve } from '@prisma/client';

@Injectable()
export class ParentPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notifService: NotifParentService,
    private readonly financesService: FinancesService,
  ) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  async activerPortail(tenantId: string, accessCode: string, telephone: string, pin: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { tenantId, accessCode, telephone },
    });
    if (!parent) throw new BadRequestException('Code d\'accès ou téléphone invalide');
    if (parent.portalActif) throw new BadRequestException('Portail déjà activé');

    const pinHash = await bcrypt.hash(pin, 10);
    await this.prisma.parent.update({
      where: { id: parent.id },
      data: { pin: pinHash, portalActif: true },
    });

    return { message: 'Portail activé avec succès' };
  }

  async login(tenantId: string, telephone: string, pin: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { tenantId, telephone },
    });
    if (!parent || !parent.portalActif || !parent.pin) {
      throw new UnauthorizedException('Téléphone ou PIN incorrect');
    }

    const valid = await bcrypt.compare(pin, parent.pin);
    if (!valid) throw new UnauthorizedException('Téléphone ou PIN incorrect');

    const payload = {
      sub: parent.id,
      tenantId: parent.tenantId,
      type: 'parent',
    };

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
    const parent = await this.prisma.parent.findFirst({ where: { id: parentId, tenantId } });
    if (!parent) throw new NotFoundException('Parent introuvable');

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await this.prisma.parent.update({
      where: { id: parentId },
      data: { accessCode: code, portalActif: false, pin: null },
    });

    // Notify by SMS
    await this.notifService.send({
      tenantId,
      parentId,
      canal: 'SMS',
      titre: 'Votre code d\'accès SmartSchool',
      message: `Votre code d'accès au portail parent SmartSchool est : ${code}. Activez votre compte sur l'application.`,
    });

    return { accessCode: code };
  }
}
