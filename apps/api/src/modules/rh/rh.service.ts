import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StatutPresence } from '@prisma/client';
import { CreatePersonnelDto } from './dto/personnel.dto';
import { CreateFichePaieDto } from './dto/paie.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class RhService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

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
    // Mot de passe initial inconnu de tous — la personne choisit le sien via
    // le lien d'invitation envoyé par e-mail, jamais transmis à la main.
    const hashedPassword = await bcrypt.hash(randomBytes(24).toString('hex'), 12);

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

    const invitationEnvoyee = await this.authService.envoyerInvitation(user.id);
    return { ...user, invitationEnvoyee };
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

  // ========== PAIE ==========
  // Structure volontairement libre : aucun barème, taux ou cotisation n'est
  // codé en dur — chaque établissement ajoute les lignes (primes/déductions)
  // qui correspondent à sa propre façon de calculer la paie.

  private calculerTotal(salaireBase: number, lignes: { type: string; montant: number }[]) {
    const primes = lignes.filter((l) => l.type === 'PRIME').reduce((s, l) => s + l.montant, 0);
    const deductions = lignes.filter((l) => l.type === 'DEDUCTION').reduce((s, l) => s + l.montant, 0);
    return { primes, deductions, net: salaireBase + primes - deductions };
  }

  async getFichesPaie(tenantId: string, query: { userId?: string; periode?: string }) {
    const fiches = await this.prisma.fichePaie.findMany({
      where: { tenantId, userId: query.userId, periode: query.periode },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        lignes: true,
      },
      orderBy: [{ periode: 'desc' }, { createdAt: 'desc' }],
    });
    return fiches.map((f) => ({ ...f, ...this.calculerTotal(f.salaireBase, f.lignes) }));
  }

  async getFichePaieById(tenantId: string, id: string) {
    const fiche = await this.prisma.fichePaie.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        lignes: true,
      },
    });
    if (!fiche) throw new NotFoundException('Fiche de paie introuvable');
    return { ...fiche, ...this.calculerTotal(fiche.salaireBase, fiche.lignes) };
  }

  async createFichePaie(tenantId: string, dto: CreateFichePaieDto) {
    const user = await this.prisma.user.findFirst({ where: { id: dto.userId, tenantId } });
    if (!user) throw new NotFoundException('Membre du personnel introuvable');

    const existante = await this.prisma.fichePaie.findUnique({
      where: { userId_periode: { userId: dto.userId, periode: dto.periode } },
    });
    if (existante) {
      throw new BadRequestException('Une fiche de paie existe déjà pour cette personne sur cette période');
    }

    const fiche = await this.prisma.fichePaie.create({
      data: {
        tenantId,
        userId: dto.userId,
        periode: dto.periode,
        salaireBase: dto.salaireBase,
        notes: dto.notes,
        lignes: dto.lignes?.length
          ? { create: dto.lignes.map((l) => ({ type: l.type, libelle: l.libelle, montant: l.montant })) }
          : undefined,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        lignes: true,
      },
    });
    return { ...fiche, ...this.calculerTotal(fiche.salaireBase, fiche.lignes) };
  }

  async changerStatutFichePaie(tenantId: string, id: string, statut: 'BROUILLON' | 'VALIDEE' | 'PAYEE') {
    const fiche = await this.prisma.fichePaie.findFirst({ where: { id, tenantId } });
    if (!fiche) throw new NotFoundException('Fiche de paie introuvable');
    return this.prisma.fichePaie.update({ where: { id }, data: { statut } });
  }

  async deleteFichePaie(tenantId: string, id: string) {
    const fiche = await this.prisma.fichePaie.findFirst({ where: { id, tenantId } });
    if (!fiche) throw new NotFoundException('Fiche de paie introuvable');
    if (fiche.statut === 'PAYEE') {
      throw new BadRequestException('Impossible de supprimer une fiche déjà marquée payée');
    }
    await this.prisma.fichePaie.delete({ where: { id } });
    return { message: 'Fiche de paie supprimée' };
  }
}
