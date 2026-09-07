import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AutismeService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifierReferences(tenantId: string, eleveId: string, therapeuteId?: string) {
    const eleve = await this.prisma.eleve.findFirst({ where: { id: eleveId, tenantId } });
    if (!eleve) throw new NotFoundException('Élève introuvable pour cet établissement');
    if (therapeuteId) {
      const therapeute = await this.prisma.user.findFirst({ where: { id: therapeuteId, tenantId } });
      if (!therapeute) throw new NotFoundException('Thérapeute introuvable pour cet établissement');
    }
  }

  async getSuiviComportemental(tenantId: string, eleveId: string) {
    return this.prisma.suiviComportemental.findMany({
      where: { tenantId, eleveId },
      orderBy: { date: 'desc' },
      take: 30,
    });
  }

  async enregistrerSuivi(tenantId: string, data: {
    eleveId: string;
    date: string;
    comportements: string[];
    humeur: string;
    activitesRealisees: string[];
    observations: string;
    therapeuteId?: string;
  }) {
    await this.verifierReferences(tenantId, data.eleveId, data.therapeuteId);

    return this.prisma.suiviComportemental.create({
      data: {
        ...data,
        date: new Date(data.date),
        tenantId,
        comportements: data.comportements,
        activitesRealisees: data.activitesRealisees,
      },
    });
  }

  async getTherapies(tenantId: string, eleveId: string) {
    return this.prisma.therapie.findMany({
      where: { tenantId, eleveId },
      include: {
        therapeute: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dateSeance: 'desc' },
    });
  }

  async programmerTherapie(tenantId: string, data: any) {
    await this.verifierReferences(tenantId, data.eleveId, data.therapeuteId);

    return this.prisma.therapie.create({
      data: { ...data, tenantId },
    });
  }

  async getPictogrammes(tenantId: string, categorie?: string) {
    return this.prisma.pictogramme.findMany({
      where: { tenantId: { in: [tenantId, 'GLOBAL'] }, categorie },
      orderBy: [{ categorie: 'asc' }, { label: 'asc' }],
    });
  }

  async getRoutines(tenantId: string, eleveId: string) {
    return this.prisma.routine.findMany({
      where: { tenantId, eleveId, isActive: true },
      include: { etapes: { orderBy: { ordre: 'asc' } } },
    });
  }
}
