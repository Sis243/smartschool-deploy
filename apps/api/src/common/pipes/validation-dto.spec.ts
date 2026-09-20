import { ValidationPipe, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { EncoderNotesDto } from '../../modules/notes/dto/notes.dto';
import { EnvoyerNotificationDto } from '../../modules/communication/dto/communication.dto';
import { MarquerPresencesDto } from '../../modules/academique/dto/academique.dto';
import { UpdateModulesDto } from '../../modules/tenant/dto/tenant.dto';
import { CreateBusDto } from '../../modules/transport/dto/transport.dto';

// Ces tests exercent le VRAI ValidationPipe global (même configuration que
// create-app.ts : whitelist + forbidNonWhitelisted + transform), pas un
// simulacre de "la route a bien un DTO déclaré" — c'est ce pipe qui décide
// en production si un corps de requête malformé est rejeté en 400 avant
// même d'atteindre le service, ou s'il passe tel quel comme avec `any`.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

async function valider<T extends object>(metatype: new () => T, value: unknown): Promise<T> {
  const metadata: ArgumentMetadata = { type: 'body', metatype };
  return pipe.transform(value, metadata) as Promise<T>;
}

describe('ValidationPipe appliqué aux nouveaux DTOs (remplacement de `data: any`)', () => {
  describe('EncoderNotesDto — notes imbriquées, barème 0-20', () => {
    it('accepte un tableau de notes valides', async () => {
      const dto = await valider(EncoderNotesDto, {
        notes: [{ eleveId: 'e1', matiereId: 'm1', periodeId: 'p1', valeur: 15.5 }],
      });
      expect(dto.notes[0].valeur).toBe(15.5);
    });

    it('rejette une note hors barème (21/20)', async () => {
      await expect(
        valider(EncoderNotesDto, { notes: [{ eleveId: 'e1', matiereId: 'm1', periodeId: 'p1', valeur: 21 }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette une note négative', async () => {
      await expect(
        valider(EncoderNotesDto, { notes: [{ eleveId: 'e1', matiereId: 'm1', periodeId: 'p1', valeur: -1 }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette une valeur non numérique glissée dans le tableau imbriqué', async () => {
      await expect(
        valider(EncoderNotesDto, { notes: [{ eleveId: 'e1', matiereId: 'm1', periodeId: 'p1', valeur: 'douze' }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('EnvoyerNotificationDto — enums canaux/cible', () => {
    const base = { titre: 'Réunion', contenu: 'Demain 10h', destinataires: ['p1'] };

    it('accepte des canaux et une cible valides', async () => {
      const dto = await valider(EnvoyerNotificationDto, { ...base, canaux: ['SMS', 'EMAIL'], cible: 'parents' });
      expect(dto.canaux).toEqual(['SMS', 'EMAIL']);
    });

    it('rejette un canal inconnu (ex: "FAX") au lieu de le laisser passer comme avant avec `data: any`', async () => {
      await expect(
        valider(EnvoyerNotificationDto, { ...base, canaux: ['FAX'], cible: 'parents' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette une cible hors de "personnel"/"parents"', async () => {
      await expect(
        valider(EnvoyerNotificationDto, { ...base, canaux: ['SMS'], cible: 'eleves' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette une liste de destinataires vide', async () => {
      await expect(
        valider(EnvoyerNotificationDto, { ...base, destinataires: [], canaux: ['SMS'], cible: 'parents' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('MarquerPresencesDto — présences imbriquées', () => {
    it('rejette un statut de présence invalide', async () => {
      await expect(
        valider(MarquerPresencesDto, {
          date: '2026-09-20',
          presences: [{ eleveId: 'e1', statut: 'EN_VACANCES' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepte un statut de présence valide', async () => {
      const dto = await valider(MarquerPresencesDto, {
        date: '2026-09-20',
        presences: [{ eleveId: 'e1', statut: 'ABSENT', motif: 'Maladie' }],
      });
      expect(dto.presences[0].statut).toBe('ABSENT');
    });
  });

  describe('UpdateModulesDto — liste blanche des modules activables', () => {
    it('accepte des modules valides du catalogue', async () => {
      const dto = await valider(UpdateModulesDto, { modules: ['FINANCES', 'RH'] });
      expect(dto.modules).toEqual(['FINANCES', 'RH']);
    });

    it('rejette un module qui n\'existe pas dans le catalogue', async () => {
      await expect(valider(UpdateModulesDto, { modules: ['MODULE_INVENTE'] })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('whitelist + forbidNonWhitelisted — le vrai remplaçant de `data: any`', () => {
    it('rejette un champ non déclaré dans le DTO (ex: tentative d\'injecter tenantId depuis le client)', async () => {
      await expect(
        valider(CreateBusDto, { immatriculation: 'CGO 1234', capacite: 30, tenantId: 'un-autre-tenant' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('convertit une capacité envoyée en chaîne (formulaire HTML) grâce à enableImplicitConversion', async () => {
      const dto = await valider(CreateBusDto, { immatriculation: 'CGO 1234', capacite: '30' });
      expect(dto.capacite).toBe(30);
    });

    it('rejette un champ requis manquant', async () => {
      await expect(valider(CreateBusDto, { capacite: 30 })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
