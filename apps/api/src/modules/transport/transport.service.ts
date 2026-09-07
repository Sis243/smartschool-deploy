import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TransportService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllBus(tenantId: string) {
    return this.prisma.bus.findMany({
      where: { tenantId, isActive: true },
      include: {
        chauffeur: { select: { id: true, firstName: true, lastName: true, phone: true } },
        itineraires: true,
        _count: { select: { abonnes: true } },
      },
    });
  }

  async createBus(tenantId: string, data: any) {
    if (data.chauffeurId) {
      const chauffeur = await this.prisma.user.findFirst({
        where: { id: data.chauffeurId, tenantId },
      });
      if (!chauffeur) throw new BadRequestException('Chauffeur introuvable pour cet établissement');
    }
    return this.prisma.bus.create({ data: { ...data, tenantId } });
  }

  async getItineraires(tenantId: string, busId: string) {
    return this.prisma.itineraire.findMany({
      where: { tenantId, busId },
      orderBy: { ordre: 'asc' },
    });
  }

  async getAbonnements(tenantId: string) {
    return this.prisma.transportAbonnement.findMany({
      where: { tenantId, isActive: true },
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, matricule: true, classe: { select: { nom: true } } } },
        bus: { select: { id: true, immatriculation: true, capacite: true } },
      },
      orderBy: { eleveId: 'asc' },
    });
  }

  async abonnerEleve(tenantId: string, eleveId: string, busId: string) {
    const [eleve, bus] = await Promise.all([
      this.prisma.eleve.findFirst({ where: { id: eleveId, tenantId } }),
      this.prisma.bus.findFirst({ where: { id: busId, tenantId } }),
    ]);
    if (!eleve) throw new NotFoundException('Élève introuvable');
    if (!bus) throw new NotFoundException('Bus introuvable');

    return this.prisma.transportAbonnement.upsert({
      where: { eleveId_busId: { eleveId, busId } },
      update: { isActive: true },
      create: { eleveId, busId, tenantId, isActive: true },
    });
  }

  async desabonnerEleve(tenantId: string, abonnementId: string) {
    const abonnement = await this.prisma.transportAbonnement.findFirst({
      where: { id: abonnementId, tenantId },
    });
    if (!abonnement) throw new NotFoundException('Abonnement introuvable');
    return this.prisma.transportAbonnement.update({
      where: { id: abonnementId },
      data: { isActive: false },
    });
  }
}
