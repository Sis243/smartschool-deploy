import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { verifierAbonnementActif } from '../utils/verifier-abonnement';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token invalide ou expiré');
    }

    // Sécurité multi-tenant : le tenant courant DOIT venir du JWT vérifié,
    // jamais du header x-tenant-id / sous-domaine (contrôlables par le client),
    // sinon un utilisateur d'un établissement pourrait lire/écrire les données
    // d'un autre établissement en falsifiant ce header.
    if (!user.isSuperAdmin) {
      const request = context.switchToHttp().getRequest();
      request.tenantId = user.tenantId;
      verifierAbonnementActif(user.tenant);
    }

    return user;
  }
}
