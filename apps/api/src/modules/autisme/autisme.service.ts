import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EnregistrerSuiviDto,
  ProgrammerTherapieDto,
  CreatePictogrammeDto,
  CreateRoutineDto,
  UpdateRoutineDto,
} from './dto/autisme.dto';

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

  async enregistrerSuivi(tenantId: string, data: EnregistrerSuiviDto) {
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

  async programmerTherapie(tenantId: string, data: ProgrammerTherapieDto) {
    await this.verifierReferences(tenantId, data.eleveId, data.therapeuteId);

    return this.prisma.therapie.create({
      data: { ...data, type: data.type as any, statut: data.statut as any, tenantId, dateSeance: new Date(data.dateSeance) },
    });
  }

  async getPictogrammes(tenantId: string, categorie?: string) {
    return this.prisma.pictogramme.findMany({
      where: { tenantId: { in: [tenantId, 'GLOBAL'] }, categorie },
      orderBy: [{ categorie: 'asc' }, { label: 'asc' }],
    });
  }

  async createPictogramme(tenantId: string, data: CreatePictogrammeDto) {
    return this.prisma.pictogramme.create({ data: { ...data, tenantId } });
  }

  async deletePictogramme(tenantId: string, id: string) {
    // Les pictogrammes "GLOBAL" sont partagés entre écoles — une école ne
    // peut supprimer que les siens, jamais un pictogramme partagé.
    const pictogramme = await this.prisma.pictogramme.findFirst({ where: { id, tenantId } });
    if (!pictogramme) throw new NotFoundException('Pictogramme introuvable pour cet établissement');
    await this.prisma.pictogramme.delete({ where: { id } });
    return { message: 'Pictogramme supprimé' };
  }

  async getRoutines(tenantId: string, eleveId: string) {
    return this.prisma.routine.findMany({
      where: { tenantId, eleveId, isActive: true },
      include: { etapes: { orderBy: { ordre: 'asc' } } },
    });
  }

  async createRoutine(tenantId: string, data: CreateRoutineDto) {
    const eleve = await this.prisma.eleve.findFirst({ where: { id: data.eleveId, tenantId } });
    if (!eleve) throw new NotFoundException('Élève introuvable pour cet établissement');

    return this.prisma.routine.create({
      data: {
        tenantId,
        eleveId: data.eleveId,
        nom: data.nom,
        etapes: { createMany: { data: data.etapes } },
      },
      include: { etapes: { orderBy: { ordre: 'asc' } } },
    });
  }

  async updateRoutine(tenantId: string, routineId: string, data: UpdateRoutineDto) {
    const routine = await this.prisma.routine.findFirst({ where: { id: routineId, tenantId } });
    if (!routine) throw new NotFoundException('Routine introuvable');

    if (data.etapes) {
      // Remplacement intégral plutôt qu'un diff étape par étape : plus simple
      // et sans risque d'incohérence d'ordre, acceptable pour une liste de
      // quelques étapes réécrite en entier depuis le formulaire d'édition.
      await this.prisma.etapeRoutine.deleteMany({ where: { routineId } });
    }

    return this.prisma.routine.update({
      where: { id: routineId },
      data: {
        nom: data.nom,
        isActive: data.isActive,
        ...(data.etapes ? { etapes: { createMany: { data: data.etapes } } } : {}),
      },
      include: { etapes: { orderBy: { ordre: 'asc' } } },
    });
  }

  async deleteRoutine(tenantId: string, routineId: string) {
    const routine = await this.prisma.routine.findFirst({ where: { id: routineId, tenantId } });
    if (!routine) throw new NotFoundException('Routine introuvable');
    await this.prisma.routine.delete({ where: { id: routineId } });
    return { message: 'Routine supprimée' };
  }
}
