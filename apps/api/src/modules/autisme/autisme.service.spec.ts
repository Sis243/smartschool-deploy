import { NotFoundException } from '@nestjs/common';
import { AutismeService } from './autisme.service';
import { PrismaService } from '../../prisma/prisma.service';

// Les pictogrammes/routines n'avaient jusqu'ici aucun écran de gestion — ces
// tests couvrent spécifiquement les deux règles métier qui ont le plus de
// chances de se tromper silencieusement : (1) ne jamais laisser une école
// toucher les données d'une autre, (2) ne jamais laisser une école supprimer
// un pictogramme "GLOBAL" partagé entre toutes les écoles.
describe('AutismeService — pictogrammes et routines', () => {
  let service: AutismeService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      pictogramme: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      routine: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
      etapeRoutine: { deleteMany: jest.fn() },
      eleve: { findFirst: jest.fn() },
    };
    service = new AutismeService(prisma as unknown as PrismaService);
  });

  describe('createPictogramme', () => {
    it('crée le pictogramme rattaché au tenant de l\'appelant', async () => {
      prisma.pictogramme.create.mockResolvedValue({ id: 'pic_1' });
      await service.createPictogramme('tenant_a', { label: 'Boire', imageUrl: 'https://x/img.png' });
      expect(prisma.pictogramme.create).toHaveBeenCalledWith({
        data: { label: 'Boire', imageUrl: 'https://x/img.png', tenantId: 'tenant_a' },
      });
    });
  });

  describe('deletePictogramme', () => {
    it('refuse de supprimer un pictogramme appartenant à une autre école (ou GLOBAL)', async () => {
      prisma.pictogramme.findFirst.mockResolvedValue(null);
      await expect(service.deletePictogramme('tenant_a', 'pic_dune_autre_ecole')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.pictogramme.delete).not.toHaveBeenCalled();
    });

    it('supprime un pictogramme qui appartient bien à l\'école appelante', async () => {
      prisma.pictogramme.findFirst.mockResolvedValue({ id: 'pic_1', tenantId: 'tenant_a' });
      await service.deletePictogramme('tenant_a', 'pic_1');
      expect(prisma.pictogramme.delete).toHaveBeenCalledWith({ where: { id: 'pic_1' } });
    });
  });

  describe('createRoutine', () => {
    it('refuse de créer une routine pour un élève d\'une autre école', async () => {
      prisma.eleve.findFirst.mockResolvedValue(null);
      await expect(
        service.createRoutine('tenant_a', { eleveId: 'eleve_dune_autre_ecole', nom: 'Matin', etapes: [{ ordre: 1, description: 'Se laver' }] }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.routine.create).not.toHaveBeenCalled();
    });

    it('crée la routine avec ses étapes imbriquées quand l\'élève appartient au tenant', async () => {
      prisma.eleve.findFirst.mockResolvedValue({ id: 'eleve_1' });
      prisma.routine.create.mockResolvedValue({ id: 'routine_1' });
      const etapes = [{ ordre: 1, description: 'Se laver les mains' }, { ordre: 2, description: 'Petit-déjeuner' }];

      await service.createRoutine('tenant_a', { eleveId: 'eleve_1', nom: 'Routine du matin', etapes });

      expect(prisma.routine.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant_a',
          eleveId: 'eleve_1',
          nom: 'Routine du matin',
          etapes: { createMany: { data: etapes } },
        },
        include: { etapes: { orderBy: { ordre: 'asc' } } },
      });
    });
  });

  describe('updateRoutine', () => {
    it('refuse de modifier une routine d\'une autre école', async () => {
      prisma.routine.findFirst.mockResolvedValue(null);
      await expect(service.updateRoutine('tenant_a', 'routine_dune_autre_ecole', { nom: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('remplace entièrement les étapes quand un nouveau tableau est fourni', async () => {
      prisma.routine.findFirst.mockResolvedValue({ id: 'routine_1', tenantId: 'tenant_a' });
      prisma.routine.update.mockResolvedValue({ id: 'routine_1' });
      const nouvellesEtapes = [{ ordre: 1, description: 'Nouvelle étape unique' }];

      await service.updateRoutine('tenant_a', 'routine_1', { etapes: nouvellesEtapes });

      expect(prisma.etapeRoutine.deleteMany).toHaveBeenCalledWith({ where: { routineId: 'routine_1' } });
      expect(prisma.routine.update).toHaveBeenCalledWith({
        where: { id: 'routine_1' },
        data: expect.objectContaining({ etapes: { createMany: { data: nouvellesEtapes } } }),
        include: { etapes: { orderBy: { ordre: 'asc' } } },
      });
    });

    it('ne touche pas aux étapes existantes quand seul le statut change', async () => {
      prisma.routine.findFirst.mockResolvedValue({ id: 'routine_1', tenantId: 'tenant_a' });
      prisma.routine.update.mockResolvedValue({ id: 'routine_1' });

      await service.updateRoutine('tenant_a', 'routine_1', { isActive: false });

      expect(prisma.etapeRoutine.deleteMany).not.toHaveBeenCalled();
      expect(prisma.routine.update).toHaveBeenCalledWith({
        where: { id: 'routine_1' },
        data: { nom: undefined, isActive: false },
        include: { etapes: { orderBy: { ordre: 'asc' } } },
      });
    });
  });

  describe('deleteRoutine', () => {
    it('refuse de supprimer une routine d\'une autre école', async () => {
      prisma.routine.findFirst.mockResolvedValue(null);
      await expect(service.deleteRoutine('tenant_a', 'routine_dune_autre_ecole')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.routine.delete).not.toHaveBeenCalled();
    });
  });
});
