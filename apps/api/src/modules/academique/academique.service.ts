import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifParentService } from '../notif-parent/notif-parent.service';

@Injectable()
export class AcademiqueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifParentService: NotifParentService,
  ) {}

  // ========== CLASSES ==========
  async findAllClasses(tenantId: string) {
    return this.prisma.classe.findMany({
      where: { tenantId, isActive: true },
      include: {
        titulaire: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { eleves: true } },
      },
      orderBy: [{ niveau: 'asc' }, { nom: 'asc' }],
    });
  }

  async createClasse(tenantId: string, data: any) {
    return this.prisma.classe.create({ data: { ...data, tenantId } });
  }

  // ========== MATIÈRES ==========
  async findAllMatieres(tenantId: string) {
    return this.prisma.matiere.findMany({
      where: { tenantId, isActive: true },
      orderBy: { nom: 'asc' },
    });
  }

  async createMatiere(tenantId: string, data: any) {
    return this.prisma.matiere.create({ data: { ...data, tenantId } });
  }

  // ========== HORAIRES ==========
  async findHoraires(tenantId: string, classeId: string) {
    return this.prisma.horaire.findMany({
      where: { tenantId, classeId },
      include: {
        matiere: { select: { id: true, nom: true } },
        enseignant: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
    });
  }

  // ========== ANNÉE SCOLAIRE ==========
  async getAllAnneesScolaires(tenantId: string) {
    return this.prisma.anneeScolaire.findMany({
      where: { tenantId },
      include: {
        _count: { select: { periodes: true, classes: true } },
      },
      orderBy: { dateDebut: 'desc' },
    });
  }

  async getAnneeScolaireActive(tenantId: string) {
    return this.prisma.anneeScolaire.findFirst({
      where: { tenantId, isActive: true },
      include: { periodes: { orderBy: { ordre: 'asc' } } },
    });
  }

  async createAnneeScolaire(tenantId: string, data: { libelle: string; dateDebut: string; dateFin: string }) {
    await this.prisma.anneeScolaire.updateMany({
      where: { tenantId, isActive: true },
      data: { isActive: false },
    });
    return this.prisma.anneeScolaire.create({
      data: { tenantId, libelle: data.libelle, dateDebut: new Date(data.dateDebut), dateFin: new Date(data.dateFin), isActive: true },
    });
  }

  async activerAnneeScolaire(tenantId: string, anneeId: string) {
    const annee = await this.prisma.anneeScolaire.findFirst({ where: { id: anneeId, tenantId } });
    if (!annee) throw new NotFoundException('Année scolaire introuvable');

    await this.prisma.anneeScolaire.updateMany({
      where: { tenantId, isActive: true },
      data: { isActive: false },
    });
    return this.prisma.anneeScolaire.update({
      where: { id: anneeId },
      data: { isActive: true },
    });
  }

  // ========== PÉRIODES ==========
  async getPeriodes(tenantId: string) {
    return this.prisma.periode.findMany({
      where: { anneeScolaire: { tenantId, isActive: true } },
      orderBy: { ordre: 'asc' },
    });
  }

  async createPeriode(tenantId: string, data: { libelle: string; dateDebut: string; dateFin: string; ordre: number }) {
    const annee = await this.prisma.anneeScolaire.findFirst({ where: { tenantId, isActive: true } });
    if (!annee) throw new NotFoundException('Aucune année scolaire active');
    return this.prisma.periode.create({
      data: {
        tenantId,
        anneeScolaireId: annee.id,
        libelle: data.libelle,
        dateDebut: new Date(data.dateDebut),
        dateFin: new Date(data.dateFin),
        ordre: data.ordre,
      },
    });
  }

  async activerPeriode(tenantId: string, periodeId: string) {
    const annee = await this.prisma.anneeScolaire.findFirst({ where: { tenantId, isActive: true } });
    if (!annee) throw new NotFoundException('Aucune année scolaire active');

    const periode = await this.prisma.periode.findFirst({
      where: { id: periodeId, tenantId, anneeScolaireId: annee.id },
    });
    if (!periode) throw new NotFoundException('Période introuvable pour l\'année scolaire active');

    await this.prisma.periode.updateMany({
      where: { tenantId, anneeScolaireId: annee.id, isActive: true },
      data: { isActive: false },
    });
    return this.prisma.periode.update({ where: { id: periodeId }, data: { isActive: true } });
  }

  // ========== PRÉSENCES ÉLÈVES ==========
  async getPresences(tenantId: string, classeId: string, date: string) {
    const dateObj = new Date(date);
    const eleves = await this.prisma.eleve.findMany({
      where: { tenantId, classeId, isActive: true },
      orderBy: { nom: 'asc' },
      select: { id: true, nom: true, prenom: true, matricule: true },
    });

    const presences = await this.prisma.presence.findMany({
      where: { tenantId, eleveId: { in: eleves.map((e) => e.id) }, date: dateObj },
    });

    const presenceMap = new Map(presences.map((p) => [p.eleveId, p]));
    return eleves.map((e) => ({ eleve: e, presence: presenceMap.get(e.id) ?? null }));
  }

  async marquerPresences(
    tenantId: string,
    data: Array<{ eleveId: string; statut: string; motif?: string; remarque?: string }>,
    date: string,
  ) {
    const dateObj = new Date(date);

    const eleveIds = [...new Set(data.map((d) => d.eleveId))];
    const elevesValides = await this.prisma.eleve.findMany({
      where: { id: { in: eleveIds }, tenantId },
      select: { id: true },
    });
    if (elevesValides.length !== eleveIds.length) {
      throw new NotFoundException('Un ou plusieurs élèves sont introuvables pour cet établissement');
    }

    const operations = data.map((d) =>
      this.prisma.presence.upsert({
        where: { eleveId_date: { eleveId: d.eleveId, date: dateObj } },
        update: { statut: d.statut as any, motif: d.motif, remarque: d.remarque },
        create: { tenantId, eleveId: d.eleveId, date: dateObj, statut: d.statut as any, motif: d.motif, remarque: d.remarque },
      }),
    );
    return this.prisma.$transaction(operations);
  }

  // ========== POINTAGE FACIAL (élèves) ==========
  // La reconnaissance elle-même a lieu dans le navigateur (face-api.js compare
  // le flux caméra aux empreintes renvoyées par ElevesService.findAllAvecVisage) ;
  // ce endpoint se contente d'enregistrer l'arrivée reconnue et de prévenir le parent.
  async pointerPresenceFaciale(tenantId: string, eleveId: string) {
    const eleve = await this.prisma.eleve.findFirst({
      where: { id: eleveId, tenantId },
      select: { id: true, nom: true, prenom: true, parentId: true },
    });
    if (!eleve) throw new NotFoundException('Élève introuvable');

    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    const maintenant = new Date();

    const dejaPointe = await this.prisma.presence.findUnique({
      where: { eleveId_date: { eleveId, date: aujourdHui } },
    });

    const presence = await this.prisma.presence.upsert({
      where: { eleveId_date: { eleveId, date: aujourdHui } },
      update: dejaPointe?.heureArrivee
        ? {} // déjà pointé aujourd'hui : on ne réécrase pas l'heure d'arrivée ni ne renotifie
        : { statut: 'PRESENT', heureArrivee: maintenant, methode: 'FACIAL' },
      create: { tenantId, eleveId, date: aujourdHui, statut: 'PRESENT', heureArrivee: maintenant, methode: 'FACIAL' },
    });

    const premierPointage = !dejaPointe?.heureArrivee;
    if (premierPointage && eleve.parentId) {
      const heure = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      await this.notifParentService.sendAll(
        tenantId,
        eleve.parentId,
        'Arrivée à l\'école',
        `${eleve.prenom} ${eleve.nom} est arrivé(e) à l'école à ${heure}.`,
      );
    }

    return { eleve, presence, notifieParent: premierPointage && !!eleve.parentId };
  }

  async getBilanSemaine(tenantId: string) {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
    const result = await Promise.all(
      jours.map(async (jour, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const presences = await this.prisma.presence.groupBy({
          by: ['statut'],
          where: { tenantId, date },
          _count: { statut: true },
        });
        const map = Object.fromEntries(presences.map((p) => [p.statut, p._count.statut]));
        return {
          jour,
          presents: map['PRESENT'] ?? 0,
          absents: map['ABSENT'] ?? 0,
          retards: map['RETARD'] ?? 0,
        };
      }),
    );
    return result;
  }

  async getStatistiquesPresence(tenantId: string, classeId: string, dateDebut: string, dateFin: string) {
    const eleves = await this.prisma.eleve.findMany({
      where: { tenantId, classeId, isActive: true },
      select: { id: true, nom: true, prenom: true, matricule: true },
    });

    const presences = await this.prisma.presence.findMany({
      where: {
        tenantId,
        eleveId: { in: eleves.map((e) => e.id) },
        date: { gte: new Date(dateDebut), lte: new Date(dateFin) },
      },
    });

    return eleves.map((e) => {
      const ep = presences.filter((p) => p.eleveId === e.id);
      return {
        eleve: e,
        total: ep.length,
        presents: ep.filter((p) => p.statut === 'PRESENT').length,
        absents: ep.filter((p) => p.statut === 'ABSENT').length,
        retards: ep.filter((p) => p.statut === 'RETARD').length,
        excuses: ep.filter((p) => p.statut === 'EXCUSE').length,
      };
    });
  }

  // ========== EXAMENS ==========
  async findExamens(tenantId: string, query: { classeId?: string; matiereId?: string }) {
    return this.prisma.examen.findMany({
      where: { tenantId, ...query },
      include: {
        classe: { select: { id: true, nom: true } },
        matiere: { select: { id: true, nom: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async createExamen(tenantId: string, data: any) {
    const [classe, matiere] = await Promise.all([
      this.prisma.classe.findFirst({ where: { id: data.classeId, tenantId } }),
      this.prisma.matiere.findFirst({ where: { id: data.matiereId, tenantId } }),
    ]);
    if (!classe) throw new NotFoundException('Classe introuvable');
    if (!matiere) throw new NotFoundException('Matière introuvable');
    if (data.periodeId) {
      const periode = await this.prisma.periode.findFirst({ where: { id: data.periodeId, tenantId } });
      if (!periode) throw new NotFoundException('Période introuvable');
    }

    return this.prisma.examen.create({
      data: {
        tenantId,
        classeId: data.classeId,
        matiereId: data.matiereId,
        periodeId: data.periodeId || undefined,
        libelle: data.libelle,
        date: new Date(data.date),
        duree: data.duree ? Number(data.duree) : undefined,
        surNote: data.surNote ? Number(data.surNote) : 100,
      },
      include: {
        classe: { select: { nom: true } },
        matiere: { select: { nom: true } },
      },
    });
  }
}
