import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BrevoService } from '../../common/services/brevo.service';
import { PushService } from '../../common/services/push.service';

type Cible = 'personnel' | 'parents';
type Canal = 'SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevo: BrevoService,
    private readonly push: PushService,
  ) {}

  async envoyerNotification(tenantId: string, data: {
    titre: string;
    contenu: string;
    destinataires: string[];
    canaux: Canal[];
    cible: Cible;
  }) {
    if (data.cible !== 'personnel' && data.cible !== 'parents') {
      throw new BadRequestException('cible doit être "personnel" ou "parents"');
    }

    // Les destinataires viennent du client : sans ce contrôle, un utilisateur
    // pourrait faire "envoyer" un message à un id d'un autre établissement.
    const idsUniques = [...new Set(data.destinataires)];
    if (data.cible === 'personnel') {
      const valides = await this.prisma.user.findMany({
        where: { id: { in: idsUniques }, tenantId },
        select: { id: true },
      });
      if (valides.length !== idsUniques.length) {
        throw new NotFoundException('Un ou plusieurs destinataires sont introuvables pour cet établissement');
      }
    } else {
      const valides = await this.prisma.parent.findMany({
        where: { id: { in: idsUniques }, tenantId },
        select: { id: true },
      });
      if (valides.length !== idsUniques.length) {
        throw new NotFoundException('Un ou plusieurs destinataires sont introuvables pour cet établissement');
      }
    }

    const notification = await this.prisma.notification.create({
      data: { titre: data.titre, contenu: data.contenu, tenantId, statut: 'EN_COURS' },
    });

    await this.prisma.notificationDestinataire.createMany({
      data: data.canaux.flatMap((canal) =>
        idsUniques.map((id) => ({
          notificationId: notification.id,
          userId: data.cible === 'personnel' ? id : undefined,
          parentId: data.cible === 'parents' ? id : undefined,
          canal,
          statut: 'EN_ATTENTE',
        })),
      ),
    });

    // Traitement asynchrone (dans une version complète, on utiliserait une queue Bull)
    this.traiterNotifications(notification.id, tenantId).catch((err) =>
      this.logger.error('Erreur traitement notifications', err),
    );

    return notification;
  }

  private async traiterNotifications(notificationId: string, tenantId: string) {
    const [destinataires, tenant] = await Promise.all([
      this.prisma.notificationDestinataire.findMany({
        where: { notificationId, statut: 'EN_ATTENTE' },
        include: {
          user: { select: { email: true, phone: true } },
          parent: { select: { email: true, telephone: true } },
          notification: { select: { titre: true, contenu: true } },
        },
      }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);

    for (const dest of destinataires) {
      const contact = dest.user ?? dest.parent;
      const email = contact && 'email' in contact ? contact.email : undefined;
      const telephone = dest.user?.phone ?? dest.parent?.telephone;
      const texte = `${dest.notification.titre}\n${dest.notification.contenu}`;

      let envoye = false;
      try {
        if (dest.canal === 'EMAIL' && email) {
          envoye = await this.brevo.sendEmail(email, dest.notification.titre, texte, tenant?.name);
        } else if (dest.canal === 'SMS' && telephone) {
          envoye = await this.brevo.sendSms(telephone, texte, tenant?.name);
        } else if (dest.canal === 'WHATSAPP' && telephone) {
          envoye = await this.brevo.sendWhatsapp(telephone, texte);
        } else if (dest.canal === 'PUSH') {
          envoye = await this.push.sendToRecipient(
            dest.userId ? { userId: dest.userId } : { parentId: dest.parentId! },
            { title: dest.notification.titre, body: dest.notification.contenu },
          );
        }
      } catch (error) {
        this.logger.error(`Échec envoi ${dest.canal} pour ${dest.id}`, error as Error);
      }

      await this.prisma.notificationDestinataire.update({
        where: { id: dest.id },
        data: envoye ? { statut: 'ENVOYE', envoyeAt: new Date() } : { statut: 'ECHEC' },
      });
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { statut: 'ENVOYE' },
    });
  }

  async getNotifications(tenantId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { tenantId },
      // `limit` arrive en chaîne depuis la query string HTTP (?limit=30) —
      // Prisma exige un entier pour `take`, d'où la conversion explicite.
      take: Number(limit) || 20,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { destinataires: true } } },
    });
  }
}
