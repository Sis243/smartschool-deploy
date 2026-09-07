import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { MODULE_KEY } from '../decorators/module.decorator';
import { ModuleCle } from '../constants/modules';

// À utiliser après JwtAuthGuard. Bloque une route si l'école (tenant) n'a
// pas activé le module payant correspondant — un super-admin passe toujours,
// et une route sans @RequireModule() n'est pas concernée (socle toujours actif).
@Injectable()
export class ModuleActifGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const module = this.reflector.getAllAndOverride<ModuleCle>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!module) return true;

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (user?.isSuperAdmin) return true;

    // Routes publiques du portail parent (activation/login, avant JWT) : le
    // tenant vient du TenantMiddleware plutôt que d'un utilisateur authentifié.
    const tenantId = user?.tenantId || request.tenantId;
    if (!tenantId) return true;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { modulesActifs: true },
    });
    if (!tenant?.modulesActifs.includes(module)) {
      throw new ForbiddenException(
        "Ce module n'est pas activé pour votre établissement. Contactez votre administrateur SmartSchool.",
      );
    }
    return true;
  }
}
