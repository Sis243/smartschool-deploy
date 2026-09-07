import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface NoteInput {
  eleveId: string;
  matiereId: string;
  periodeId: string;
  valeur: number;
}

const NOTE_SUR = 20; // barème utilisé dans toute l'application (saisie, bulletins)

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByClasse(tenantId: string, classeId: string, periodeId: string) {
    return this.prisma.note.findMany({
      where: { tenantId, eleve: { classeId }, periodeId },
      include: {
        eleve: { select: { id: true, nom: true, prenom: true, matricule: true } },
        matiere: { select: { id: true, nom: true, coefficient: true } },
      },
      orderBy: [{ eleve: { nom: 'asc' } }, { matiere: { nom: 'asc' } }],
    });
  }

  async encoderNotes(tenantId: string, notes: NoteInput[]) {
    if (!notes || notes.length === 0) return [];

    for (const n of notes) {
      if (typeof n.valeur !== 'number' || Number.isNaN(n.valeur) || n.valeur < 0 || n.valeur > NOTE_SUR) {
        throw new BadRequestException(`Note invalide : la valeur doit être comprise entre 0 et ${NOTE_SUR}`);
      }
    }

    // Vérifie que chaque référence (élève, matière, période) appartient bien au
    // tenant de l'appelant — sans ça, un enseignant pourrait écrire ou écraser
    // (upsert) la note d'un élève d'un autre établissement en devinant ses IDs.
    const eleveIds = [...new Set(notes.map((n) => n.eleveId))];
    const matiereIds = [...new Set(notes.map((n) => n.matiereId))];
    const periodeIds = [...new Set(notes.map((n) => n.periodeId))];

    const [elevesValides, matieresValides, periodesValides] = await Promise.all([
      this.prisma.eleve.findMany({ where: { id: { in: eleveIds }, tenantId }, select: { id: true } }),
      this.prisma.matiere.findMany({ where: { id: { in: matiereIds }, tenantId }, select: { id: true } }),
      this.prisma.periode.findMany({ where: { id: { in: periodeIds }, tenantId }, select: { id: true } }),
    ]);
    const eleveSet = new Set(elevesValides.map((e) => e.id));
    const matiereSet = new Set(matieresValides.map((m) => m.id));
    const periodeSet = new Set(periodesValides.map((p) => p.id));

    const invalide = notes.find(
      (n) => !eleveSet.has(n.eleveId) || !matiereSet.has(n.matiereId) || !periodeSet.has(n.periodeId),
    );
    if (invalide) {
      throw new BadRequestException('Une note référence un élève, une matière ou une période invalide');
    }

    const operations = notes.map((note) =>
      this.prisma.note.upsert({
        where: {
          eleveId_matiereId_periodeId: {
            eleveId: note.eleveId,
            matiereId: note.matiereId,
            periodeId: note.periodeId,
          },
        },
        update: { valeur: note.valeur },
        create: { ...note, tenantId, surNote: NOTE_SUR },
      }),
    );
    return this.prisma.$transaction(operations);
  }

  async getBulletin(tenantId: string, eleveId: string, periodeId: string) {
    const notes = await this.prisma.note.findMany({
      where: { tenantId, eleveId, periodeId },
      include: {
        matiere: true,
      },
    });

    const total = notes.reduce((sum, n) => sum + n.valeur * n.matiere.coefficient, 0);
    const totalCoeff = notes.reduce((sum, n) => sum + n.matiere.coefficient, 0);
    const moyenne = totalCoeff > 0 ? total / totalCoeff : 0;

    return {
      notes,
      total: parseFloat(total.toFixed(2)),
      totalCoefficients: totalCoeff,
      moyenne: parseFloat(moyenne.toFixed(2)),
      mention: this.getMention(moyenne),
    };
  }

  async getRapportClasse(tenantId: string, classeId: string, periodeId: string) {
    const [eleves, classe, periode] = await Promise.all([
      this.prisma.eleve.findMany({
        where: { tenantId, classeId, isActive: true },
        orderBy: { nom: 'asc' },
      }),
      this.prisma.classe.findFirst({ where: { id: classeId, tenantId } }),
      this.prisma.periode.findFirst({ where: { id: periodeId, tenantId } }),
    ]);

    const bulletins = await Promise.all(
      eleves.map(async (eleve) => {
        const bulletin = await this.getBulletin(tenantId, eleve.id, periodeId);
        return { eleve, ...bulletin };
      }),
    );

    return { classe, periode, bulletins };
  }

  private getMention(moyenne: number): string {
    // Barème sur /20 (voir NOTE_SUR)
    if (moyenne >= 18) return 'Excellent';
    if (moyenne >= 16) return 'Très Bien';
    if (moyenne >= 14) return 'Bien';
    if (moyenne >= 12) return 'Assez Bien';
    if (moyenne >= 10) return 'Passable';
    return 'Insuffisant';
  }
}
