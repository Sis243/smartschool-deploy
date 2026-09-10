import * as webpush from 'web-push';
import { PushService } from './push.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

describe('PushService', () => {
  let prisma: any;

  function buildService(configuree = true) {
    prisma = {
      pushSubscription: {
        findMany: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    };
    const config = {
      get: (key: string) =>
        ({
          'push.publicKey': configuree ? 'clé-publique' : undefined,
          'push.privateKey': configuree ? 'clé-privée' : undefined,
          'push.subject': 'mailto:notifications@smartschool.cd',
        })[key],
    };
    return new PushService(config as any, prisma as unknown as PrismaService);
  }

  afterEach(() => jest.clearAllMocks());

  it("n'envoie rien et renvoie false si les clés VAPID ne sont pas configurées", async () => {
    const service = buildService(false);
    const envoye = await service.sendToRecipient({ userId: 'user_1' }, { title: 't', body: 'b' });

    expect(envoye).toBe(false);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("renvoie false si le destinataire n'a aucun abonnement enregistré", async () => {
    const service = buildService(true);
    prisma.pushSubscription.findMany.mockResolvedValue([]);

    const envoye = await service.sendToRecipient({ parentId: 'parent_1' }, { title: 't', body: 'b' });

    expect(envoye).toBe(false);
  });

  it('envoie à chaque abonnement du destinataire et renvoie true si au moins un envoi réussit', async () => {
    const service = buildService(true);
    prisma.pushSubscription.findMany.mockResolvedValue([
      { id: 'sub_1', endpoint: 'https://fcm.example/1', p256dh: 'p1', auth: 'a1' },
      { id: 'sub_2', endpoint: 'https://fcm.example/2', p256dh: 'p2', auth: 'a2' },
    ]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);

    const envoye = await service.sendToRecipient({ userId: 'user_1' }, { title: 't', body: 'b' });

    expect(envoye).toBe(true);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
  });

  it('supprime automatiquement un abonnement mort (410 Gone) sans faire échouer les autres envois', async () => {
    const service = buildService(true);
    prisma.pushSubscription.findMany.mockResolvedValue([
      { id: 'sub_perime', endpoint: 'https://fcm.example/perime', p256dh: 'p1', auth: 'a1' },
      { id: 'sub_valide', endpoint: 'https://fcm.example/valide', p256dh: 'p2', auth: 'a2' },
    ]);
    (webpush.sendNotification as jest.Mock)
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockResolvedValueOnce(undefined);

    const envoye = await service.sendToRecipient({ userId: 'user_1' }, { title: 't', body: 'b' });

    expect(envoye).toBe(true);
    expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 'sub_perime' } });
  });
});
