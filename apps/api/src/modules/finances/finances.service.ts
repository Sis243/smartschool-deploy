import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TypeFacture, StatutPaiement } from '@prisma/client';
import { CreateFactureDto, EnregistrerPaiementDto } from './dto/finances.dto';

const LIBELLE_PAR_TYPE: Record<TypeFacture, string> = {
  INSCRIPTION: "Frais d'inscription",
  MINERVAL: 'Minerval',
  TRANSPORT: 'Frais de transport',
  CANTINE: 'Frais de cantine',
  BIBLIOTHEQUE: 'Frais de bibliothèque',
  AUTRE: 'Frais divers',
};

@Injectable()
export class FinancesService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalRecettes, recettesMois, impayes, totalFactures, totalPayees, paiementsRecents] =
      await Promise.all([
        this.prisma.paiement.aggregate({ where: { tenantId }, _sum: { montant: true } }),
        this.prisma.paiement.aggregate({ where: { tenantId, createdAt: { gte: debutMois } }, _sum: { montant: true } }),
        this.prisma.facture.aggregate({
          where: { tenantId, statut: { in: ['EN_ATTENTE', 'PARTIEL'] } },
          _sum: { montantDu: true },
          _count: true,
        }),
        this.prisma.facture.count({ where: { tenantId } }),
        this.prisma.facture.count({ where: { tenantId, statut: 'PAYE' } }),
        this.prisma.paiement.findMany({
          where: { tenantId },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            eleve: { select: { nom: true, prenom: true, matricule: true } },
            facture: { select: { type: true, montant: true } },
          },
        }),
      ]);

    return {
      totalRecettes: totalRecettes._sum.montant || 0,
      recettesMois: recettesMois._sum.montant || 0,
      montantImpaye: impayes._sum.montantDu || 0,
      nombreImpaye: impayes._count,
      tauxRecouvrement: totalFactures > 0 ? (totalPayees / totalFactures) * 100 : 0,
      paiementsRecents,
    };
  }

  async getAllFactures(
    tenantId: string,
    query: { page?: number; limit?: number; statut?: string; search?: string },
  ) {
    // page/limit arrivent en chaînes depuis la query string HTTP ; Prisma exige
    // des entiers pour skip/take, d'où la conversion explicite.
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { statut, search } = query;
    const where: any = { tenantId };
    if (statut) where.statut = statut;
    if (search) {
      where.eleve = {
        OR: [
          { nom: { contains: search, mode: 'insensitive' } },
          { prenom: { contains: search, mode: 'insensitive' } },
          { matricule: { contains: search, mode: 'insensitive' } },
        ],
      };
    }
    const [data, total] = await Promise.all([
      this.prisma.facture.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          eleve: { select: { id: true, nom: true, prenom: true, matricule: true } },
          paiements: { select: { id: true, montant: true, modePaiement: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.facture.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getFactureById(tenantId: string, id: string) {
    const facture = await this.prisma.facture.findFirst({
      where: { id, tenantId },
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, matricule: true } },
        paiements: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    return facture;
  }

  async getAllPaiements(tenantId: string, query: { page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const [data, total] = await Promise.all([
      this.prisma.paiement.findMany({
        where: { tenantId },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          eleve: { select: { nom: true, prenom: true, matricule: true } },
          facture: { select: { type: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paiement.count({ where: { tenantId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createFacture(tenantId: string, dto: CreateFactureDto) {
    const eleve = await this.prisma.eleve.findFirst({ where: { id: dto.eleveId, tenantId } });
    if (!eleve) throw new NotFoundException('Élève introuvable');

    return this.prisma.facture.create({
      data: {
        tenantId,
        eleveId: dto.eleveId,
        type: dto.type,
        libelle: dto.libelle?.trim() || LIBELLE_PAR_TYPE[dto.type],
        montant: dto.montant,
        montantPaye: 0,
        montantDu: dto.montant,
        statut: 'EN_ATTENTE',
        echeance: dto.echeance ? new Date(dto.echeance) : undefined,
      },
    });
  }

  async annulerFacture(tenantId: string, id: string) {
    const facture = await this.prisma.facture.findFirst({ where: { id, tenantId } });
    if (!facture) throw new NotFoundException('Facture introuvable');
    if (facture.montantPaye > 0) {
      throw new BadRequestException(
        'Impossible d\'annuler une facture ayant déjà reçu un paiement',
      );
    }
    return this.prisma.facture.update({ where: { id }, data: { statut: 'ANNULE' } });
  }

  async enregistrerPaiement(tenantId: string, dto: EnregistrerPaiementDto) {
    return this.prisma.$transaction(async (tx) => {
      const facture = await tx.facture.findFirst({
        where: { id: dto.factureId, tenantId },
      });
      if (!facture) throw new NotFoundException('Facture introuvable');
      if (facture.statut === 'ANNULE') {
        throw new BadRequestException('Cette facture est annulée');
      }
      if (facture.statut === 'PAYE') {
        throw new BadRequestException('Cette facture est déjà entièrement payée');
      }

      const recu = `REC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

      const paiement = await tx.paiement.create({
        data: {
          tenantId,
          factureId: dto.factureId,
          eleveId: facture.eleveId,
          montant: dto.montant,
          modePaiement: dto.modePaiement,
          reference: dto.reference,
          notes: dto.notes,
          recu,
          statut: StatutPaiement.PAYE,
        },
      });

      const montantPaye = facture.montantPaye + dto.montant;
      const montantDu = Math.max(0, facture.montant - montantPaye);
      const nouveauStatut: StatutPaiement = montantPaye >= facture.montant ? 'PAYE' : 'PARTIEL';

      await tx.facture.update({
        where: { id: dto.factureId },
        data: { montantPaye, montantDu, statut: nouveauStatut },
      });

      return paiement;
    });
  }

  async getRevenuesMensuels(tenantId: string) {
    const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const annee = new Date().getFullYear();

    const paiements = await this.prisma.paiement.findMany({
      where: {
        tenantId,
        createdAt: { gte: new Date(`${annee}-01-01`), lte: new Date(`${annee}-12-31T23:59:59`) },
      },
      select: { montant: true, createdAt: true },
    });

    const parMois = Array.from({ length: 12 }, (_, i) => ({ mois: moisLabels[i], montant: 0 }));
    paiements.forEach((p) => {
      const m = new Date(p.createdAt).getMonth();
      parMois[m].montant += p.montant;
    });
    return parMois;
  }

  async getFacturesEleve(tenantId: string, eleveId: string) {
    return this.prisma.facture.findMany({
      where: { tenantId, eleveId },
      include: { paiements: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
