import { ParentPortalService } from './parent-portal.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotifParentService } from '../notif-parent/notif-parent.service';
import { FinancesService } from '../finances/finances.service';
import { BrevoService } from '../../common/services/brevo.service';
import { ConfigService } from '@nestjs/config';

// La récupération en libre-service est un endpoit PUBLIC (pas de tenant, pas
// d'auth) : le principal risque est l'énumération de comptes (deviner quels
// numéros sont enregistrés) — ces tests vérifient que la réponse ne varie
// jamais selon ce qui existe réellement en base.
describe('ParentPortalService.demanderRecuperation', () => {
  let service: ParentPortalService;
  let prisma: any;
  let brevo: any;

  beforeEach(() => {
    prisma = {
      parent: { findMany: jest.fn(), update: jest.fn().mockResolvedValue(undefined) },
    };
    brevo = { sendEmail: jest.fn().mockResolvedValue(true), sendWhatsapp: jest.fn().mockResolvedValue(true) };
    const configService = { get: (key: string) => ({ frontendUrl: 'https://app.test' } as Record<string, string>)[key] };

    service = new ParentPortalService(
      prisma as unknown as PrismaService,
      {} as JwtService,
      {} as NotifParentService,
      {} as FinancesService,
      brevo as unknown as BrevoService,
      configService as unknown as ConfigService,
    );
  });

  it('renvoie le même message générique même si aucun parent ne correspond (anti-énumération)', async () => {
    prisma.parent.findMany.mockResolvedValue([]);
    const resultat = await service.demanderRecuperation('+243900000000');
    expect(resultat.message).toContain("Si ce numéro est enregistré");
    expect(brevo.sendEmail).not.toHaveBeenCalled();
  });

  it('renvoie le même message générique quand un parent existe réellement, et lui envoie un nouveau code', async () => {
    prisma.parent.findMany.mockResolvedValue([{
      id: 'parent_1', prenom: 'Marie', telephone: '+243900000000', email: 'marie@example.com',
      tenant: { name: 'École A', isActive: true, modulesActifs: ['PARENT_PORTAL'] },
    }]);

    const resultat = await service.demanderRecuperation('+243900000000');

    expect(resultat.message).toContain("Si ce numéro est enregistré");
    expect(brevo.sendEmail).toHaveBeenCalledTimes(1);
    expect(prisma.parent.update).toHaveBeenCalledWith({
      where: { id: 'parent_1' },
      data: expect.objectContaining({ portalActif: false, pin: null }),
    });
  });

  it('envoie à toutes les écoles où ce numéro est enregistré (un même parent peut avoir des enfants dans plusieurs écoles)', async () => {
    prisma.parent.findMany.mockResolvedValue([
      { id: 'parent_1', prenom: 'Marie', telephone: '+243900000000', email: 'marie@a.cd', tenant: { name: 'École A', isActive: true, modulesActifs: ['PARENT_PORTAL'] } },
      { id: 'parent_2', prenom: 'Marie', telephone: '+243900000000', email: 'marie@b.cd', tenant: { name: 'École B', isActive: true, modulesActifs: ['PARENT_PORTAL'] } },
    ]);

    await service.demanderRecuperation('+243900000000');

    expect(brevo.sendEmail).toHaveBeenCalledTimes(2);
  });

  it('ignore silencieusement une école suspendue ou sans le module portail parent actif', async () => {
    prisma.parent.findMany.mockResolvedValue([
      { id: 'parent_1', prenom: 'Marie', telephone: '+243900000000', email: 'marie@a.cd', tenant: { name: 'École suspendue', isActive: false, modulesActifs: ['PARENT_PORTAL'] } },
      { id: 'parent_2', prenom: 'Marie', telephone: '+243900000000', email: 'marie@b.cd', tenant: { name: 'École sans module', isActive: true, modulesActifs: [] } },
    ]);

    const resultat = await service.demanderRecuperation('+243900000000');

    expect(brevo.sendEmail).not.toHaveBeenCalled();
    expect(resultat.message).toContain("Si ce numéro est enregistré");
  });

  it("ne plante pas si l'envoi échoue pour une école — les autres écoles reçoivent quand même leur code", async () => {
    prisma.parent.findMany.mockResolvedValue([
      { id: 'parent_1', prenom: 'Marie', telephone: '+243900000000', email: 'marie@a.cd', tenant: { name: 'École A', isActive: true, modulesActifs: ['PARENT_PORTAL'] } },
      { id: 'parent_2', prenom: 'Marie', telephone: '+243900000000', email: 'marie@b.cd', tenant: { name: 'École B', isActive: true, modulesActifs: ['PARENT_PORTAL'] } },
    ]);
    brevo.sendEmail.mockRejectedValueOnce(new Error('Brevo indisponible')).mockResolvedValueOnce(true);

    await expect(service.demanderRecuperation('+243900000000')).resolves.toBeDefined();
    expect(brevo.sendEmail).toHaveBeenCalledTimes(2);
  });
});
