import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BrevoService } from '../../common/services/brevo.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  const utilisateur = {
    id: 'user_1',
    email: 'admin@ecole.cd',
    password: 'hash-existant',
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: 'ADMIN',
    tenantId: 'tenant_1',
    isSuperAdmin: false,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => ({ 'jwt.refreshSecret': 'refresh-secret' } as Record<string, string>)[key] },
        },
        { provide: BrevoService, useValue: { sendEmail: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('validateUser / login', () => {
    it("refuse la connexion si l'email est inconnu", async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login({ email: 'inconnu@ecole.cd', password: 'x' })).rejects.toThrow(UnauthorizedException);
    });

    it('refuse la connexion si le mot de passe est incorrect', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...utilisateur, password: await bcrypt.hash('bon-mdp', 4) });
      await expect(service.login({ email: utilisateur.email, password: 'mauvais-mdp' })).rejects.toThrow(UnauthorizedException);
    });

    it('refuse la connexion si le tenant du token demandé ne correspond pas à celui du compte', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...utilisateur, password: await bcrypt.hash('bon-mdp', 4) });
      await expect(
        service.login({ email: utilisateur.email, password: 'bon-mdp' }, 'un-autre-tenant'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('émet un access token et un refresh token pour des identifiants valides', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...utilisateur, password: await bcrypt.hash('bon-mdp', 4) });
      const result = await service.login({ email: utilisateur.email, password: 'bon-mdp' });

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user.email).toBe(utilisateur.email);
      // Le refresh token doit être signé avec un secret distinct de l'access token.
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: utilisateur.id }),
        expect.objectContaining({ secret: 'refresh-secret' }),
      );
    });
  });

  describe('refresh', () => {
    it('rejette un refresh token invalide/mal signé', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
      await expect(service.refresh('token-invalide')).rejects.toThrow(UnauthorizedException);
    });

    it("rejette si l'utilisateur associé au token n'existe plus/est désactivé", async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user_1' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.refresh('token-valide')).rejects.toThrow(UnauthorizedException);
    });

    it('émet une nouvelle paire de tokens pour un refresh token valide', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user_1' });
      prisma.user.findUnique.mockResolvedValue(utilisateur);

      const result = await service.refresh('token-valide');

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('token-valide', { secret: 'refresh-secret' });
      expect(result.accessToken).toBe('signed-token');
      expect(result.user.id).toBe(utilisateur.id);
    });
  });
});
