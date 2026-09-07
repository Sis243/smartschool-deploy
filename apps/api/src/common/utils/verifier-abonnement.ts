import { ForbiddenException } from '@nestjs/common';

interface TenantAbonnement {
  isActive: boolean;
  subscriptionCycle: 'MENSUEL' | 'ANNUEL' | 'A_VIE';
  subscriptionEnd: Date | null;
}

// Point d'application unique de la licence, appelé depuis JwtAuthGuard et
// ParentJwtGuard (tout utilisateur authentifié d'un tenant passe par l'un des
// deux). A_VIE n'expire jamais ; subscriptionEnd null sur MENSUEL/ANNUEL veut
// dire "pas encore activé par le super admin" — on laisse passer le temps
// qu'il configure l'école plutôt que de bloquer une école toute neuve.
export function verifierAbonnementActif(tenant: TenantAbonnement | null | undefined): void {
  if (!tenant) return;
  if (!tenant.isActive) {
    throw new ForbiddenException('Cet établissement a été suspendu. Contactez SmartSchool ERP.');
  }
  if (tenant.subscriptionCycle === 'A_VIE') return;
  if (!tenant.subscriptionEnd) return;
  if (tenant.subscriptionEnd < new Date()) {
    throw new ForbiddenException(
      "L'abonnement de votre établissement a expiré. Veuillez le renouveler pour continuer à utiliser SmartSchool ERP.",
    );
  }
}
