import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StatutPresence } from '@prisma/client';
import { CreatePersonnelDto } from './dto/personnel.dto';

@Injectable()
export class RhService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPersonnel(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true, role: { not: 'PARENT' } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    });
  }

  async createPersonnel(tenantId: string, dto: CreatePersonnelDto) {
    const existant = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existant) throw new ConflictException('Un utilisateur avec cet email existe déjà');

    const bcrypt = await import('bcryptjs');
    // Mot de passe temporaire aléatoire si non fourni — jamais de valeur
    // devinable comme "changeme123" utilisée en clair sur un compte réel.
    const motDePasseTemporaire = dto.password || randomBytes(9).toString('base64url');
    const hashedPassword = await bcrypt.hash(motDePasseTemporaire, 12);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        password: hashedPassword,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    return { ...user, motDePasseTemporaire: dto.password ? undefined : motDePasseTemporaire };
  }

  async getPresencesPersonnel(tenantId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    return this.prisma.presencePersonnel.findMany({
      where: { tenantId, date: targetDate },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  async marquerPresencePersonnel(tenantId: string, data: { userId: string; statut: string; date?: string }) {
    const user = await this.prisma.user.findFirst({ where: { id: data.userId, tenantId } });
    if (!user) throw new NotFoundException('Membre du personnel introuvable');

    const date = data.date ? new Date(data.date) : new Date();
    return this.prisma.presencePersonnel.upsert({
      where: { userId_date: { userId: data.userId, date } },
      update: { statut: data.statut as StatutPresence },
      create: { userId: data.userId, statut: data.statut as StatutPresence, date, tenantId },
    });
  }
}
