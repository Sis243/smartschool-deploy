import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEleveDto, UpdateEleveDto, EnregistrerVisageDto } from './dto/eleve.dto';

@Injectable()
export class ElevesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: { classeId?: string; search?: string; page?: number; limit?: number }) {
    const { classeId, search } = query;
    // page/limit arrivent en chaînes depuis la query string HTTP ; Prisma exige
    // des entiers pour skip/take, d'où la conversion explicite.
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isActive: true };
    if (classeId) where.classeId = classeId;
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { matricule: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [eleves, total] = await Promise.all([
      this.prisma.eleve.findMany({
        where,
        skip,
        take: limit,
        include: {
          classe: { select: { id: true, nom: true, niveau: true } },
          parent: { select: { id: true, nom: true, telephone: true } },
        },
        orderBy: { nom: 'asc' },
      }),
      this.prisma.eleve.count({ where }),
    ]);

    return {
      data: eleves,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId: string) {
    const eleve = await this.prisma.eleve.findFirst({
      where: { id, tenantId },
      include: {
        classe: true,
        parent: true,
        dossierMedical: true,
        documents: true,
        presences: { take: 30, orderBy: { date: 'desc' } },
      },
    });

    if (!eleve) throw new NotFoundException('Élève introuvable');
    return eleve;
  }

  private async verifierReferences(tenantId: string, classeId?: string, parentId?: string) {
    if (classeId) {
      const classe = await this.prisma.classe.findFirst({ where: { id: classeId, tenantId } });
      if (!classe) throw new BadRequestException('Classe introuvable pour cet établissement');
    }
    if (parentId) {
      const parent = await this.prisma.parent.findFirst({ where: { id: parentId, tenantId } });
      if (!parent) throw new BadRequestException('Parent introuvable pour cet établissement');
    }
  }

  async create(tenantId: string, dto: CreateEleveDto) {
    await this.verifierReferences(tenantId, dto.classeId, dto.parentId);
    const matricule = await this.generateMatricule(tenantId);
    const { groupeSanguin, dateNaissance, ...rest } = dto;

    return this.prisma.eleve.create({
      data: {
        ...rest,
        dateNaissance: dateNaissance ? new Date(dateNaissance) : undefined,
        tenantId,
        matricule,
        dossierMedical: groupeSanguin ? { create: { groupeSanguin } } : undefined,
      },
      include: { classe: true, parent: true, dossierMedical: true },
    });
  }

  async update(id: string, tenantId: string, dto: UpdateEleveDto) {
    await this.findOne(id, tenantId);
    await this.verifierReferences(tenantId, dto.classeId, dto.parentId);
    const { groupeSanguin, dateNaissance, ...rest } = dto;

    return this.prisma.eleve.update({
      where: { id },
      data: {
        ...rest,
        dateNaissance: dateNaissance ? new Date(dateNaissance) : undefined,
        dossierMedical:
          groupeSanguin !== undefined
            ? { upsert: { create: { groupeSanguin }, update: { groupeSanguin } } }
            : undefined,
      },
      include: { classe: true, parent: true, dossierMedical: true },
    });
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.eleve.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reactiver(id: string, tenantId: string) {
    const eleve = await this.prisma.eleve.findFirst({ where: { id, tenantId } });
    if (!eleve) throw new NotFoundException('Élève introuvable');
    return this.prisma.eleve.update({ where: { id }, data: { isActive: true } });
  }

  async enregistrerVisage(id: string, tenantId: string, dto: EnregistrerVisageDto) {
    await this.findOne(id, tenantId);
    return this.prisma.eleve.update({
      where: { id },
      data: { photoUrl: dto.photoUrl, faceDescriptor: dto.faceDescriptor },
      select: { id: true, nom: true, prenom: true, photoUrl: true },
    });
  }

  // Pour la page de pointage : la comparaison faciale se fait dans le
  // navigateur (face-api.js), donc on renvoie l'empreinte de chaque élève
  // au client plutôt que de faire matcher côté serveur.
  async findAllAvecVisage(tenantId: string, classeId?: string) {
    const eleves = await this.prisma.eleve.findMany({
      where: {
        tenantId,
        isActive: true,
        classeId: classeId || undefined,
        faceDescriptor: { not: null as any },
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        matricule: true,
        photoUrl: true,
        faceDescriptor: true,
        classe: { select: { id: true, nom: true } },
      },
    });
    return eleves;
  }

  async getParents(tenantId: string) {
    return this.prisma.parent.findMany({
      where: { tenantId },
      select: { id: true, nom: true, telephone: true, email: true },
      orderBy: { nom: 'asc' },
    });
  }

  private async generateMatricule(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SS-${year}-`;

    // Numérotation par année : on repart de 0001 à chaque nouvelle année scolaire
    // civile, au lieu de continuer sur le total historique de l'établissement.
    for (let attempt = 0; attempt < 5; attempt++) {
      const count = await this.prisma.eleve.count({
        where: { tenantId, matricule: { startsWith: prefix } },
      });
      const matricule = `${prefix}${String(count + 1 + attempt).padStart(4, '0')}`;
      const exists = await this.prisma.eleve.findUnique({ where: { matricule } });
      if (!exists) return matricule;
    }

    // Repli très improbable si plusieurs inscriptions concurrentes sont en course.
    return `${prefix}${Date.now().toString(36).toUpperCase()}`;
  }
}
