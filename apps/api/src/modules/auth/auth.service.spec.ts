import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { createHash } from 'crypto';
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
      // 2FA désactivée pour ce compte de test : la connexion renvoie
      // directement les jetons, jamais la branche requiresTwoFactor.
      const result = await service.login({ email: utilisateur.email, password: 'bon-mdp' }) as
        { accessToken: string; refreshToken: string; user: { email: string } };

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

  // Utilise le vrai algorithme TOTP d'otplib (pas de mock) — c'est justement
  // le calcul cryptographique qu'on veut vérifier, pas juste que le code
  // appelle une fonction ; voir [[feedback-communication-and-verification]]
  // sur l'importance de tester le comportement réel plutôt que supposé.
  describe('Vérification en 2 étapes (TOTP)', () => {
    it('login renvoie un jeton temporaire (pas de session complète) quand la 2FA est activée', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...utilisateur, password: await bcrypt.hash('bon-mdp', 4), twoFactorEnabled: true,
      });

      const result = await service.login({ email: utilisateur.email, password: 'bon-mdp' }) as
        { requiresTwoFactor: boolean; pendingToken: string };

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.pendingToken).toBeDefined();
      // Le mot de passe seul ne doit jamais générer de session complète ici.
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ type: '2fa_pending' }),
        expect.objectContaining({ expiresIn: '5m' }),
      );
    });

    it('confirmerDeuxFacteurs active la 2FA avec un vrai code TOTP et refuse un code erroné', async () => {
      const secret = authenticator.generateSecret();
      prisma.user.findUnique.mockResolvedValue({ twoFactorSecret: secret });

      await expect(service.confirmerDeuxFacteurs('user_1', '000000')).rejects.toThrow(BadRequestException);

      const codeValide = authenticator.generate(secret);
      const resultat = await service.confirmerDeuxFacteurs('user_1', codeValide);

      expect(resultat.backupCodes).toHaveLength(8);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: expect.objectContaining({ twoFactorEnabled: true }),
      });
    });

    it('verifierDeuxFacteurs rejette un jeton qui n\'est pas de type "2fa_pending" (anti-contournement)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user_1', type: 'parent' });
      await expect(service.verifierDeuxFacteurs('jeton-normal', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('verifierDeuxFacteurs accepte un vrai code TOTP et ouvre la session', async () => {
      const secret = authenticator.generateSecret();
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user_1', type: '2fa_pending' });
      prisma.user.findUnique.mockResolvedValue({
        ...utilisateur, twoFactorEnabled: true, twoFactorSecret: secret, twoFactorBackupCodes: [],
      });

      const resultat = await service.verifierDeuxFacteurs('jeton-attente', authenticator.generate(secret)) as
        { accessToken: string };

      expect(resultat.accessToken).toBe('signed-token');
    });

    it('verifierDeuxFacteurs accepte un code de secours valide et le consomme (usage unique)', async () => {
      const secret = authenticator.generateSecret();
      const codeSecours = 'ABCD1234EF';
      const codeHache = createHash('sha256').update(codeSecours).digest('hex');
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user_1', type: '2fa_pending' });
      prisma.user.findUnique.mockResolvedValue({
        ...utilisateur, twoFactorEnabled: true, twoFactorSecret: secret, twoFactorBackupCodes: [codeHache],
      });

      await service.verifierDeuxFacteurs('jeton-attente', codeSecours);

      // Le code consommé doit disparaître de la liste — il ne doit plus resservir.
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { twoFactorBackupCodes: [] },
      });
    });

    it('verifierDeuxFacteurs rejette un code qui ne correspond ni au TOTP ni à un code de secours connu', async () => {
      const secret = authenticator.generateSecret();
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user_1', type: '2fa_pending' });
      prisma.user.findUnique.mockResolvedValue({
        ...utilisateur, twoFactorEnabled: true, twoFactorSecret: secret, twoFactorBackupCodes: [],
      });

      await expect(service.verifierDeuxFacteurs('jeton-attente', '000000')).rejects.toThrow(UnauthorizedException);
    });
  });
});
