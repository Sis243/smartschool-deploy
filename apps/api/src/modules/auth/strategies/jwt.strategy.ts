import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: { sub: string; email?: string; tenantId: string; role?: string; type?: string }) {
    // Les jetons du portail parent (parent-portal.service#login) portent
    // type:'parent' et sub = Parent.id (pas User.id) — ils n'ont donc pas de
    // ligne correspondante dans `users` et doivent être résolus à part.
    const tenantAbonnementSelect = { isActive: true, subscriptionCycle: true, subscriptionEnd: true } as const;

    // Jeton intermédiaire émis par AuthService.login quand la 2FA est
    // activée : mot de passe déjà vérifié mais session pas encore complète.
    // Ne doit JAMAIS authentifier une route protégée — seul
    // POST /auth/2fa/verify le lit (via jwtService.verifyAsync directement,
    // pas ce guard), donc un jeton de ce type ici est nécessairement une
    // tentative de contournement de la 2FA.
    if (payload.type === '2fa_pending') {
      throw new UnauthorizedException('Vérification en 2 étapes requise');
    }

    if (payload.type === 'parent') {
      const parent = await this.prisma.parent.findUnique({
        where: { id: payload.sub },
        select: { id: true, tenantId: true, portalActif: true, tenant: { select: tenantAbonnementSelect } },
      });
      if (!parent || !parent.portalActif) {
        throw new UnauthorizedException('Compte parent introuvable ou portail désactivé');
      }
      return { id: parent.id, tenantId: parent.tenantId, type: 'parent', isSuperAdmin: false, tenant: parent.tenant };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isSuperAdmin: true,
        twoFactorEnabled: true,
        tenant: { select: tenantAbonnementSelect },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    return user;
  }
}
