import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async envoyerNotification(tenantId: string, data: {
    titre: string;
    contenu: string;
    destinataires: string[];
    canaux: Array<'SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP'>;
  }) {
    // Les destinataires viennent du client : sans ce contrôle, un utilisateur
    // pourrait faire "envoyer" un message à un userId d'un autre établissement
    // (et une fois un vrai fournisseur SMS/email branché, réellement le joindre).
    const destinatairesValides = await this.prisma.user.findMany({
      where: { id: { in: data.destinataires }, tenantId },
      select: { id: true },
    });
    if (destinatairesValides.length !== new Set(data.destinataires).size) {
      throw new NotFoundException('Un ou plusieurs destinataires sont introuvables pour cet établissement');
    }

    const notification = await this.prisma.notification.create({
      data: {
        titre: data.titre,
        contenu: data.contenu,
        tenantId,
        statut: 'EN_COURS',
      },
    });

    await this.prisma.notificationDestinataire.createMany({
      data: data.canaux.flatMap((canal) =>
        data.destinataires.map((userId) => ({
          notificationId: notification.id,
          userId,
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
    const destinataires = await this.prisma.notificationDestinataire.findMany({
      where: { notificationId, statut: 'EN_ATTENTE' },
      include: {
        user: { select: { email: true, phone: true } },
        notification: { select: { titre: true, contenu: true } },
      },
    });

    for (const dest of destinataires) {
      try {
        // Simuler l'envoi (à implémenter avec Twilio/Nodemailer)
        this.logger.log(`Envoi ${dest.canal} à ${dest.user.email || dest.user.phone}`);
        await this.prisma.notificationDestinataire.update({
          where: { id: dest.id },
          data: { statut: 'ENVOYE', envoyeAt: new Date() },
        });
      } catch (error) {
        await this.prisma.notificationDestinataire.update({
          where: { id: dest.id },
          data: { statut: 'ECHEC' },
        });
      }
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
