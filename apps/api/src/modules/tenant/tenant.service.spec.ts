import { TenantService } from './tenant.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { BrevoService } from '../../common/services/brevo.service';

// Le calcul des paliers de rappel (15j/7j/3j/24h/jour J) est le genre de
// logique "presque juste" qui duplique ou oublie un envoi facilement — voir
// [[feedback-communication-and-verification]] sur l'importance de vérifier
// le comportement réel plutôt que de faire confiance à la lecture du code.
describe('TenantService.envoyerRappelsAbonnement', () => {
  let service: TenantService;
  let prisma: any;
  let brevo: any;

  function tenantAvecJoursRestants(jours: number, dejaEnvoyes: number[] = [], phone: string | null = '+243900000000') {
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + jours);
    return {
      id: 'tenant_1',
      name: 'École Test',
      subscriptionEnd,
      rappelsAbonnementEnvoyes: dejaEnvoyes,
      users: [{ email: 'admin@ecole.cd', firstName: 'Admin', phone }],
    };
  }

  beforeEach(() => {
    prisma = {
      tenant: { findMany: jest.fn(), update: jest.fn().mockResolvedValue(undefined) },
    };
    brevo = { sendEmail: jest.fn().mockResolvedValue(true), sendWhatsapp: jest.fn().mockResolvedValue(true) };
    service = new TenantService(prisma as unknown as PrismaService, {} as AuthService, brevo as unknown as BrevoService);
  });

  it('envoie le rappel dû (7j) et le marque, sans retoucher un palier déjà envoyé (15j)', async () => {
    const tenant = tenantAvecJoursRestants(7, [15]);
    prisma.tenant.findMany.mockResolvedValue([tenant]);

    await service.envoyerRappelsAbonnement();

    expect(brevo.sendEmail).toHaveBeenCalledTimes(1);
    expect(brevo.sendWhatsapp).toHaveBeenCalledTimes(1);
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant_1' },
      data: expect.objectContaining({ rappelsAbonnementEnvoyes: [15, 7] }),
    });
  });

  it("n'envoie rien si tous les paliers pertinents ont déjà été notifiés", async () => {
    const tenant = tenantAvecJoursRestants(7, [15, 7]);
    prisma.tenant.findMany.mockResolvedValue([tenant]);

    await service.envoyerRappelsAbonnement();

    expect(brevo.sendEmail).not.toHaveBeenCalled();
    expect(prisma.tenant.update).not.toHaveBeenCalled();
  });

  it('rattrape plusieurs paliers manqués en une seule fois (ex: serveur arrêté plusieurs jours)', async () => {
    // Passé directement de "aucun rappel" à 3 jours restants : 15j et 7j
    // auraient dû partir entre-temps mais n'ont jamais été envoyés.
    const tenant = tenantAvecJoursRestants(3, []);
    prisma.tenant.findMany.mockResolvedValue([tenant]);

    await service.envoyerRappelsAbonnement();

    expect(brevo.sendEmail).toHaveBeenCalledTimes(1);
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant_1' },
      data: expect.objectContaining({ rappelsAbonnementEnvoyes: [15, 7, 3] }),
    });
  });

  it("n'envoie pas de WhatsApp si le responsable n'a pas de téléphone enregistré", async () => {
    const tenant = tenantAvecJoursRestants(1, [15, 7, 3], null);
    prisma.tenant.findMany.mockResolvedValue([tenant]);

    await service.envoyerRappelsAbonnement();

    expect(brevo.sendEmail).toHaveBeenCalledTimes(1);
    expect(brevo.sendWhatsapp).not.toHaveBeenCalled();
  });
});
