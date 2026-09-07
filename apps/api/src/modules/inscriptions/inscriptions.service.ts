import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ElevesService } from '../eleves/eleves.service';
import { SoumettreInscriptionDto } from './dto/inscription.dto';

@Injectable()
export class InscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly elevesService: ElevesService,
  ) {}

  // Public — aucune auth requise
  async soumettreInscription(tenantSlug: string, data: SoumettreInscriptionDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
      select: { id: true, name: true },
    });
    if (!tenant) throw new NotFoundException('Établissement introuvable');

    return this.prisma.demandeInscription.create({
      data: {
        tenantId: tenant.id,
        prenomEnfant: data.prenomEnfant,
        nomEnfant: data.nomEnfant,
        dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : undefined,
        lieuNaissance: data.lieuNaissance,
        genre: data.genre,
        classeVisee: data.classeVisee,
        anneeScolaire: data.anneeScolaire,
        nomParent: data.nomParent,
        prenomParent: data.prenomParent,
        telephone: data.telephone,
        email: data.email,
        adresse: data.adresse,
        lienFiliation: data.lienFiliation,
      },
    });
  }

  // Public — infos de l'établissement pour afficher sur le formulaire
  async getTenantPublicInfo(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
      select: { id: true, name: true, logoUrl: true, email: true, phone: true },
    });
    if (!tenant) throw new NotFoundException('Établissement introuvable');
    return tenant;
  }

  // Privé — secrétaire/admin
  async getDemandes(tenantId: string, statut?: string) {
    const where: any = { tenantId };
    if (statut) where.statut = statut;
    return this.prisma.demandeInscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async approuver(tenantId: string, demandeId: string, data: {
    classeId?: string;
    noteSecretaire?: string;
  }) {
    const demande = await this.prisma.demandeInscription.findFirst({
      where: { id: demandeId, tenantId },
    });
    if (!demande) throw new NotFoundException('Demande introuvable');
    if (demande.statut !== 'EN_ATTENTE') throw new BadRequestException('Demande déjà traitée');

    // Réutiliser le parent existant (même téléphone) plutôt que d'en créer un
    // doublon — sinon un second enfant de la même famille fragmente les factures
    // et le portail parent sur deux comptes distincts.
    let parent = await this.prisma.parent.findFirst({
      where: { tenantId, telephone: demande.telephone },
    });
    if (!parent) {
      parent = await this.prisma.parent.create({
        data: {
          tenantId,
          nom: demande.nomParent,
          prenom: demande.prenomParent,
          telephone: demande.telephone,
          email: demande.email ?? undefined,
          adresse: demande.adresse ?? undefined,
        },
      });
    }

    // Créer l'élève via ElevesService pour bénéficier de la génération de
    // matricule (obligatoire en base) et de la validation du tenant sur la classe.
    const eleve = await this.elevesService.create(tenantId, {
      nom: demande.nomEnfant,
      prenom: demande.prenomEnfant,
      dateNaissance: demande.dateNaissance ? demande.dateNaissance.toISOString() : undefined,
      lieuNaissance: demande.lieuNaissance ?? undefined,
      genre: demande.genre ?? undefined,
      classeId: data.classeId,
      parentId: parent.id,
    });

    // Marquer la demande comme approuvée
    return this.prisma.demandeInscription.update({
      where: { id: demandeId },
      data: {
        statut: 'APPROUVEE',
        eleveCreId: eleve.id,
        noteSecretaire: data.noteSecretaire,
      },
    });
  }

  async rejeter(tenantId: string, demandeId: string, note?: string) {
    const demande = await this.prisma.demandeInscription.findFirst({
      where: { id: demandeId, tenantId },
    });
    if (!demande) throw new NotFoundException('Demande introuvable');
    if (demande.statut !== 'EN_ATTENTE') throw new BadRequestException('Demande déjà traitée');

    return this.prisma.demandeInscription.update({
      where: { id: demandeId },
      data: { statut: 'REJETEE', noteSecretaire: note },
    });
  }
}
