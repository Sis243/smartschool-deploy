'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import api from '@/lib/api';

type AlerteType = 'warning' | 'info' | 'success' | 'neutral';

interface Alerte {
  type: AlerteType;
  message: string;
  time: string;
}

const typeConfig: Record<AlerteType, { Icon: any; iconClass: string; bgClass: string; badge: string; badgeClass: string }> = {
  warning: {
    Icon: AlertTriangle,
    iconClass: 'text-orange-500',
    bgClass: 'bg-orange-500/10',
    badge: 'Alerte',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  info: {
    Icon: Info,
    iconClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    badge: 'Info',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  success: {
    Icon: CheckCircle,
    iconClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    badge: 'OK',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  neutral: {
    Icon: Clock,
    iconClass: 'text-slate-500',
    bgClass: 'bg-slate-500/10',
    badge: 'Info',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
};

export function Alertes() {
  const { canVoirFinances } = usePermissions();

  const { data: dash, isLoading } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: async () => (await api.get('/api/v1/finances/dashboard')).data.data,
    staleTime: 60_000,
    enabled: canVoirFinances,
  });

  if (!canVoirFinances) return null;

  const fd = dash as any;

  const alertes: Alerte[] = [];

  if (fd) {
    if (fd.nombreImpaye > 0) {
      alertes.push({
        type: 'warning',
        message: `${fd.nombreImpaye} facture(s) impayée(s) — ${new Intl.NumberFormat('fr-FR').format(fd.montantImpaye)} FC à recouvrer`,
        time: 'Maintenant',
      });
    }
    if (fd.tauxRecouvrement >= 90) {
      alertes.push({ type: 'success', message: `Taux de recouvrement excellent : ${fd.tauxRecouvrement.toFixed(1)}%`, time: 'Aujourd\'hui' });
    } else if (fd.tauxRecouvrement >= 70) {
      alertes.push({ type: 'info', message: `Taux de recouvrement : ${fd.tauxRecouvrement.toFixed(1)}% — peut être amélioré`, time: 'Aujourd\'hui' });
    } else if (fd.tauxRecouvrement > 0) {
      alertes.push({ type: 'warning', message: `Taux de recouvrement faible : ${fd.tauxRecouvrement.toFixed(1)}%`, time: 'Aujourd\'hui' });
    }
    if (fd.recettesMois > 0) {
      alertes.push({ type: 'success', message: `${new Intl.NumberFormat('fr-FR').format(fd.recettesMois)} FC collectés ce mois`, time: 'Ce mois' });
    }
  }

  if (alertes.length === 0 && !isLoading) {
    alertes.push({ type: 'info', message: 'Aucune alerte pour le moment', time: 'Maintenant' });
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Alertes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))
        ) : (
          alertes.map((alerte, i) => {
            const config = typeConfig[alerte.type];
            const { Icon } = config;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.bgClass)}>
                  <Icon className={cn('w-4 h-4', config.iconClass)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 leading-snug">{alerte.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alerte.time}</p>
                </div>
                <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-md shrink-0', config.badgeClass)}>
                  {config.badge}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
