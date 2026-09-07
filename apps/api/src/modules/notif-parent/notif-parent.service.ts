import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrevoService } from '../../common/services/brevo.service';
import { CanalNotification } from '@prisma/client';

export interface SendNotifDto {
  tenantId: string;
  parentId: string;
  canal: CanalNotification;
  titre: string;
  message: string;
}

@Injectable()
export class NotifParentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brevo: BrevoService,
  ) {}

  async send(dto: SendNotifDto) {
    const [parent, tenant] = await Promise.all([
      this.prisma.parent.findUnique({ where: { id: dto.parentId } }),
      this.prisma.tenant.findUnique({ where: { id: dto.tenantId }, select: { name: true } }),
    ]);

    let statut: string = 'SIMULE';
    // Le nom d'expéditeur affiche l'établissement ("École Bon Départ") plutôt
    // qu'un nom générique — c'est ce que les parents doivent reconnaître.
    const nomExpediteur = tenant?.name;

    if (parent) {
      const texte = `${dto.titre}\n${dto.message}`;
      let envoye = false;
      if (dto.canal === 'EMAIL' && parent.email) {
        envoye = await this.brevo.sendEmail(parent.email, dto.titre, texte, nomExpediteur);
      } else if (dto.canal === 'SMS') {
        envoye = await this.brevo.sendSms(parent.telephone, texte, nomExpediteur);
      } else if (dto.canal === 'WHATSAPP') {
        envoye = await this.brevo.sendWhatsapp(parent.telephone, texte);
      }
      if (this.brevo.isConfigured) statut = envoye ? 'ENVOYE' : 'ECHEC';
    }

    // Statut reste 'SIMULE' si Brevo n'est pas configuré — la notification
    // apparaît quand même dans le portail parent, juste sans envoi réel.
    return this.prisma.notifParent.create({
      data: {
        tenantId: dto.tenantId,
        parentId: dto.parentId,
        canal: dto.canal,
        titre: dto.titre,
        message: dto.message,
        statut,
      },
    });
  }

  async sendAll(tenantId: string, parentId: string, titre: string, message: string) {
    const parent = await this.prisma.parent.findUnique({ where: { id: parentId } });
    if (!parent) return;

    const canaux: CanalNotification[] = ['SMS', 'EMAIL', 'WHATSAPP'];
    await Promise.all(
      canaux.map((canal) => this.send({ tenantId, parentId, canal, titre, message })),
    );
  }

  // tenantId est redondant avec parentId (un parent appartient à un seul
  // tenant) mais sert de seconde barrière : si parentId était un jour
  // undefined/mal résolu, un filtre where vide renverrait TOUT le monde au
  // lieu de rien — voir l'incident où req.user.sub (inexistant) laissait
  // passer une requête non filtrée.
  async findByParent(tenantId: string, parentId: string, page = 1, limit = 20) {
    page = Number(page) || 1;
    limit = Number(limit) || 20;
    const [data, total] = await Promise.all([
      this.prisma.notifParent.findMany({
        where: { tenantId, parentId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notifParent.count({ where: { tenantId, parentId } }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async marquerLu(tenantId: string, id: string, parentId: string) {
    return this.prisma.notifParent.updateMany({
      where: { id, parentId, tenantId },
      data: { lu: true },
    });
  }

  async countNonLues(tenantId: string, parentId: string) {
    return this.prisma.notifParent.count({ where: { tenantId, parentId, lu: false } });
  }
}
