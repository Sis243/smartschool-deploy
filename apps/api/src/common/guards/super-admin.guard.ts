import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

// À utiliser après JwtAuthGuard : réserve la route aux super-administrateurs
// (ex: gestion de tous les établissements). Sans ce garde, tout utilisateur
// authentifié pouvait lister/activer/désactiver n'importe quel établissement.
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.user?.isSuperAdmin) {
      throw new ForbiddenException('Réservé aux super-administrateurs');
    }
    return true;
  }
}
