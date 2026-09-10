import { BadRequestException } from '@nestjs/common';
import { ElevesService } from './eleves.service';
import { PrismaService } from '../../prisma/prisma.service';

// Couvre la régression corrigée cette session : le matricule était unique
// globalement (collision possible entre deux écoles différentes) — il est
// désormais généré et vérifié par tenant via la clé composée tenantId_matricule.
describe('ElevesService', () => {
  let service: ElevesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      eleve: {
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'eleve_1', ...data })),
      },
      classe: { findFirst: jest.fn() },
      parent: { findFirst: jest.fn() },
    };
    service = new ElevesService(prisma as unknown as PrismaService);
  });

  it('rejette la création si la classe indiquée n\'appartient pas à cet établissement', async () => {
    prisma.classe.findFirst.mockResolvedValue(null);

    await expect(
      service.create('tenant_1', { nom: 'Kalombo', prenom: 'Grace', classeId: 'classe_dune_autre_ecole' } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.eleve.create).not.toHaveBeenCalled();
  });

  it('génère un matricule au format SS-<année>-0001 pour le premier élève de l\'école', async () => {
    prisma.eleve.count.mockResolvedValue(0);
    prisma.eleve.findUnique.mockResolvedValue(null);

    const eleve = await service.create('tenant_1', { nom: 'Kalombo', prenom: 'Grace' } as any);

    const anneeCourante = new Date().getFullYear();
    expect(eleve.matricule).toBe(`SS-${anneeCourante}-0001`);
  });

  it('vérifie l\'unicité du matricule via la clé composée (tenantId, matricule), jamais matricule seul', async () => {
    prisma.eleve.count.mockResolvedValue(0);
    prisma.eleve.findUnique.mockResolvedValue(null);

    await service.create('tenant_1', { nom: 'Kalombo', prenom: 'Grace' } as any);

    expect(prisma.eleve.findUnique).toHaveBeenCalledWith({
      where: { tenantId_matricule: { tenantId: 'tenant_1', matricule: expect.any(String) } },
    });
  });

  it('essaie le numéro suivant si le matricule calculé existe déjà dans la même école', async () => {
    prisma.eleve.count.mockResolvedValue(0);
    prisma.eleve.findUnique
      .mockResolvedValueOnce({ id: 'deja-pris' }) // 0001 déjà utilisé
      .mockResolvedValueOnce(null); // 0002 libre

    const eleve = await service.create('tenant_1', { nom: 'Kalombo', prenom: 'Grace' } as any);

    const anneeCourante = new Date().getFullYear();
    expect(eleve.matricule).toBe(`SS-${anneeCourante}-0002`);
  });
});
