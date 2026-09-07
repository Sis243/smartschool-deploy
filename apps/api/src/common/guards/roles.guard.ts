import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

// À utiliser après JwtAuthGuard. Restreint une route à une liste de rôles ;
// un super-admin passe toujours. Sans ce garde, n'importe quel utilisateur
// authentifié (même ENSEIGNANT) a le même accès qu'un ADMIN/DIRECTEUR.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (user?.isSuperAdmin) return true;
    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException('Rôle insuffisant pour cette action');
    }
    return true;
  }
}
