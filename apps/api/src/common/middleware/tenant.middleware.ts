import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export interface TenantRequest extends Request {
  tenantId?: string;
  tenantSlug?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    const host = req.hostname;
    const tenantHeader = req.headers['x-tenant-id'] as string;

    let tenantSlug: string | null = null;

    // Résolution du tenant via sous-domaine (ex: bondepart.smartschool.cd)
    const baseDomain = process.env.BASE_DOMAIN || 'smartschool.cd';
    if (host && host.endsWith(`.${baseDomain}`)) {
      tenantSlug = host.replace(`.${baseDomain}`, '');
    }

    // Résolution via header (pour dev/mobile)
    if (!tenantSlug && tenantHeader) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantHeader);
      if (isUUID) {
        // Header contient un UUID (mode dev) — résolution directe par ID
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantHeader, isActive: true },
          select: { id: true, slug: true },
        });
        if (tenant) {
          req.tenantId = tenant.id;
          req.tenantSlug = tenant.slug;
          return next();
        }
      } else {
        tenantSlug = tenantHeader;
      }
    }

    // Routes publiques sans tenant
    const publicRoutes = ['/api/v1/auth/super-admin', '/api/v1/tenants/register', '/api/docs'];
    const isPublicRoute = publicRoutes.some((route) => req.path.startsWith(route));

    if (!tenantSlug && !isPublicRoute) {
      return next();
    }

    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug, isActive: true },
        select: { id: true, slug: true },
      });

      if (!tenant && !isPublicRoute) {
        throw new NotFoundException(`Établissement "${tenantSlug}" introuvable`);
      }

      if (tenant) {
        req.tenantId = tenant.id;
        req.tenantSlug = tenant.slug;
      }
    }

    next();
  }
}
