import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly configure: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const publicKey = this.configService.get<string>('push.publicKey');
    const privateKey = this.configService.get<string>('push.privateKey');
    this.configure = Boolean(publicKey && privateKey);
    if (this.configure) {
      webpush.setVapidDetails(
        this.configService.get<string>('push.subject')!,
        publicKey!,
        privateKey!,
      );
    } else {
      this.logger.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY non configurées — notifications push désactivées');
    }
  }

  getPublicKey(): string | null {
    return this.configService.get<string>('push.publicKey') ?? null;
  }

  async subscribe(
    tenantId: string,
    recipient: { userId?: string; parentId?: string },
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        tenantId,
        userId: recipient.userId,
        parentId: recipient.parentId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      // Un même navigateur peut se réabonner (permission redemandée, cache
      // vidé) : on rattache alors l'endpoint existant au compte courant au
      // lieu d'échouer sur la contrainte d'unicité.
      update: {
        tenantId,
        userId: recipient.userId ?? null,
        parentId: recipient.parentId ?? null,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  // Envoie à tous les abonnements d'un destinataire (plusieurs appareils
  // possibles) ; retourne true si au moins un envoi a réussi. Un endpoint
  // qui répond 404/410 n'existe plus côté navigateur (désinstallation,
  // permission révoquée) : on le supprime pour ne pas réessayer indéfiniment.
  async sendToRecipient(
    recipient: { userId?: string; parentId?: string },
    payload: { title: string; body: string; url?: string },
  ): Promise<boolean> {
    if (!this.configure) return false;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: recipient.userId ? { userId: recipient.userId } : { parentId: recipient.parentId },
    });
    if (subscriptions.length === 0) return false;

    let auMoinsUnEnvoi = false;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        auMoinsUnEnvoi = true;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        } else {
          this.logger.error(`Échec envoi push (${sub.endpoint})`, error);
        }
      }
    }
    return auMoinsUnEnvoi;
  }
}
