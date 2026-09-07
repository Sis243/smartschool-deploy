import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BibliothequeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllLivres(tenantId: string, search?: string) {
    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { auteur: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search } },
      ];
    }
    return this.prisma.livre.findMany({
      where,
      orderBy: { titre: 'asc' },
    });
  }

  async createLivre(tenantId: string, data: any) {
    return this.prisma.livre.create({ data: { ...data, tenantId } });
  }

  async getEmprunts(tenantId: string, statut?: string) {
    const where: any = { tenantId };
    if (statut) where.statut = statut;
    return this.prisma.emprunt.findMany({
      where,
      include: {
        livre: { select: { id: true, titre: true, auteur: true } },
        eleve: { select: { id: true, nom: true, prenom: true, matricule: true } },
      },
      orderBy: { dateEmprunt: 'desc' },
    });
  }

  async emprunterLivre(tenantId: string, data: { livreId: string; eleveId: string; dateRetourPrevue: string }) {
    const eleve = await this.prisma.eleve.findFirst({ where: { id: data.eleveId, tenantId } });
    if (!eleve) throw new NotFoundException('Élève introuvable');

    // Décrémente la quantité disponible de façon atomique (updateMany avec
    // condition gt:0) pour éviter qu'un emprunt concurrent ne fasse passer le
    // stock sous zéro (deux requêtes simultanées liraient toutes les deux
    // "1 exemplaire disponible" si le contrôle se faisait avant la transaction).
    const emprunt = await this.prisma.$transaction(async (tx) => {
      const decrement = await tx.livre.updateMany({
        where: { id: data.livreId, tenantId, quantiteDisponible: { gt: 0 } },
        data: { quantiteDisponible: { decrement: 1 } },
      });
      if (decrement.count === 0) {
        throw new BadRequestException('Livre non disponible');
      }

      return tx.emprunt.create({
        data: {
          tenantId,
          livreId: data.livreId,
          eleveId: data.eleveId,
          dateRetourPrevue: new Date(data.dateRetourPrevue),
          statut: 'EN_COURS',
        },
      });
    });

    return emprunt;
  }

  async retournerLivre(tenantId: string, empruntId: string) {
    return this.prisma.$transaction(async (tx) => {
      const majEmprunt = await tx.emprunt.updateMany({
        where: { id: empruntId, tenantId, statut: 'EN_COURS' },
        data: { statut: 'RETOURNE', dateRetourEffective: new Date() },
      });
      if (majEmprunt.count === 0) {
        throw new BadRequestException('Emprunt introuvable ou déjà retourné');
      }

      const emprunt = await tx.emprunt.findUniqueOrThrow({ where: { id: empruntId } });
      const retard = emprunt.dateRetourPrevue < emprunt.dateRetourEffective!;
      const joursRetard = retard
        ? Math.ceil(
            (emprunt.dateRetourEffective!.getTime() - emprunt.dateRetourPrevue.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;
      const penalite = joursRetard * 500; // 500 FC par jour de retard

      await tx.emprunt.update({ where: { id: empruntId }, data: { penalite } });
      await tx.livre.update({
        where: { id: emprunt.livreId },
        data: { quantiteDisponible: { increment: 1 } },
      });

      return { message: 'Livre retourné', penalite, joursRetard };
    });
  }
}
