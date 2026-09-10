import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../../prisma/prisma.service';
import { StatutPresence } from '@prisma/client';
import { CreatePersonnelDto } from './dto/personnel.dto';
import { CreateFichePaieDto } from './dto/paie.dto';
import { AuthService } from '../auth/auth.service';
import { CATALOGUE_PAIE } from '../../common/constants/paie-catalogue';

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
        poste: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    });
  }

  async createPersonnel(tenantId: string, dto: CreatePersonnelDto) {
    // PERSONNEL_APPUI (jardinier, gardien...) n'a jamais de compte de
    // connexion : pas d'email, pas de mot de passe, pas d'invitation — juste
    // une fiche RH pour la paie et les présences. On l'impose ici plutôt que
    // de faire confiance au front pour ne pas envoyer d'email par erreur.
    const sansConnexion = dto.role === 'PERSONNEL_APPUI';
    if (!sansConnexion && !dto.email) {
      throw new BadRequestException('Un email est requis pour ce rôle');
    }

    if (dto.email) {
      const existant = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existant) throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    let hashedPassword: string | undefined;
    if (!sansConnexion) {
      const bcrypt = await import('bcryptjs');
      // Mot de passe initial inconnu de tous — la personne choisit le sien via
      // le lien d'invitation envoyé par e-mail, jamais transmis à la main.
      hashedPassword = await bcrypt.hash(randomBytes(24).toString('hex'), 12);
    }

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: sansConnexion ? undefined : dto.email,
        phone: dto.phone,
        role: dto.role,
        poste: dto.poste,
        password: hashedPassword,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        poste: true,
      },
    });

    const invitationEnvoyee = sansConnexion ? false : await this.authService.envoyerInvitation(user.id);
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

  // Import en masse depuis un fichier que l'école gère déjà ailleurs (Excel
  // exporté en CSV). Colonnes attendues : "email" et "salaireBase" ; toute
  // autre colonne devient une ligne de paie — si son en-tête correspond à un
  // libellé du catalogue (voir paie-catalogue.ts), son type (PRIME/DEDUCTION)
  // en est déduit, sinon elle est ajoutée comme prime libre avec l'en-tête
  // comme libellé. Une ligne par employé déjà enregistré (reconnu par email) ;
  // les employés introuvables sont reportés en erreur plutôt qu'ignorés en silence.
  async importerFichesPaie(tenantId: string, periode: string, buffer: Buffer) {
    let lignesCsv: Record<string, string>[];
    try {
      lignesCsv = parse(buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
    } catch {
      throw new BadRequestException('Fichier CSV illisible — vérifiez le format et l\'encodage');
    }
    if (lignesCsv.length === 0) throw new BadRequestException('Le fichier ne contient aucune ligne');

    const colonnes = Object.keys(lignesCsv[0]).filter((c) => c);
    if (!colonnes.some((c) => c.toLowerCase() === 'email')) {
      throw new BadRequestException('Colonne "email" manquante');
    }
    if (!colonnes.some((c) => c.toLowerCase() === 'salairebase')) {
      throw new BadRequestException('Colonne "salaireBase" manquante');
    }

    const catalogueParLibelle = new Map(CATALOGUE_PAIE.map((c) => [c.libelle.toLowerCase(), c]));
    const colonnesLignes = colonnes.filter((c) => !['email', 'salairebase', 'notes'].includes(c.toLowerCase()));

    const resultats: { ligne: number; email: string; statut: 'importee' | 'erreur'; motif?: string }[] = [];

    for (let i = 0; i < lignesCsv.length; i++) {
      const ligne = lignesCsv[i];
      const cle = (nomColonne: string) => colonnes.find((c) => c.toLowerCase() === nomColonne);
      const email = ligne[cle('email')!]?.trim();
      const salaireBaseRaw = ligne[cle('salairebase')!]?.trim();

      if (!email) {
        resultats.push({ ligne: i + 2, email: '', statut: 'erreur', motif: 'Email manquant' });
        continue;
      }
      const salaireBase = Number(salaireBaseRaw);
      if (!salaireBaseRaw || Number.isNaN(salaireBase)) {
        resultats.push({ ligne: i + 2, email, statut: 'erreur', motif: 'Salaire de base invalide' });
        continue;
      }

      const user = await this.prisma.user.findFirst({ where: { email, tenantId } });
      if (!user) {
        resultats.push({ ligne: i + 2, email, statut: 'erreur', motif: 'Aucun membre du personnel avec cet email dans cette école' });
        continue;
      }

      const lignesPaie = colonnesLignes
        .map((col) => {
          const valeur = Number(ligne[col]?.trim());
          if (!ligne[col] || Number.isNaN(valeur) || valeur === 0) return null;
          const catalogue = catalogueParLibelle.get(col.toLowerCase());
          return { type: catalogue?.type ?? 'PRIME', libelle: catalogue?.libelle ?? col, montant: valeur };
        })
        .filter((l): l is { type: 'PRIME' | 'DEDUCTION'; libelle: string; montant: number } => l !== null);

      const notesCol = cle('notes');

      await this.prisma.fichePaie.upsert({
        where: { userId_periode: { userId: user.id, periode } },
        update: {
          salaireBase,
          notes: notesCol ? ligne[notesCol] : undefined,
          lignes: { deleteMany: {}, create: lignesPaie },
        },
        create: {
          tenantId,
          userId: user.id,
          periode,
          salaireBase,
          notes: notesCol ? ligne[notesCol] : undefined,
          lignes: { create: lignesPaie },
        },
      });
      resultats.push({ ligne: i + 2, email, statut: 'importee' });
    }

    return {
      importees: resultats.filter((r) => r.statut === 'importee').length,
      erreurs: resultats.filter((r) => r.statut === 'erreur'),
    };
  }
}
