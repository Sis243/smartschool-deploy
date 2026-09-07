import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaternelleService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuivis(tenantId: string, eleveId?: string, date?: string) {
    const where: any = { tenantId };
    if (eleveId) where.eleveId = eleveId;
    if (date) where.date = new Date(date);

    return this.prisma.suiviMaternelle.findMany({
      where,
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, matricule: true, classe: { select: { nom: true } } } },
      },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }

  async createSuivi(tenantId: string, data: {
    eleveId: string;
    date: string;
    aMangeQuoi?: string;
    aFaitSieste?: boolean;
    dureesSieste?: number;
    comportement?: string;
    activites?: string[];
    observations?: string;
  }) {
    const eleve = await this.prisma.eleve.findFirst({ where: { id: data.eleveId, tenantId } });
    if (!eleve) throw new NotFoundException('Élève introuvable pour cet établissement');

    return this.prisma.suiviMaternelle.create({
      data: {
        tenantId,
        eleveId: data.eleveId,
        date: new Date(data.date),
        aMangeQuoi: data.aMangeQuoi,
        aFaitSieste: data.aFaitSieste ?? false,
        dureesSieste: data.dureesSieste,
        comportement: data.comportement,
        activites: data.activites ?? [],
        observations: data.observations,
      },
      include: {
        eleve: { select: { id: true, nom: true, prenom: true } },
      },
    });
  }

  async getElevesMaternelle(tenantId: string) {
    return this.prisma.eleve.findMany({
      where: {
        tenantId,
        isActive: true,
        classe: { niveau: 'MATERNELLE' },
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        matricule: true,
        dateNaissance: true,
        classe: { select: { nom: true } },
      },
      orderBy: [{ classe: { nom: 'asc' } }, { nom: 'asc' }],
    });
  }
}
