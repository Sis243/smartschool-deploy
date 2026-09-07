'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, DollarSign, TrendingUp, CheckCircle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatMontant } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import api from '@/lib/api';

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') return <ArrowUpRight className="w-3 h-3" />;
  if (trend === 'down') return <ArrowDownRight className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

export function StatsCards() {
  const { canVoirFinances } = usePermissions();

  // Le détail financier (recettes, recouvrement, impayés) est réservé à
  // ADMIN/DIRECTEUR/COMPTABLE/SECRETAIRE côté API — on évite d'appeler
  // l'endpoint (et d'afficher un widget cassé) pour les autres rôles.
  const { data: financeDash, isLoading: loadingFinance } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: async () => (await api.get('/api/v1/finances/dashboard')).data.data,
    staleTime: 60_000,
    enabled: canVoirFinances,
  });

  const { data: elevesData, isLoading: loadingEleves } = useQuery({
    queryKey: ['eleves-count'],
    queryFn: async () => (await api.get('/api/v1/eleves?limit=1')).data.data,
    staleTime: 60_000,
  });

  const isLoading = (canVoirFinances && loadingFinance) || loadingEleves;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: canVoirFinances ? 4 : 1 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const fd = financeDash as any;
  const totalEleves = (elevesData as any)?.meta?.total ?? 0;
  const tauxRecouvrement = fd?.tauxRecouvrement ?? 0;

  const stats = [
    {
      label: 'Total Élèves',
      value: totalEleves.toLocaleString('fr-FR'),
      change: 'Élèves inscrits',
      trend: 'neutral' as const,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500',
    },
    ...(canVoirFinances
      ? [
          {
            label: 'Recettes du mois',
            value: formatMontant(fd?.recettesMois ?? 0),
            change: `Total: ${formatMontant(fd?.totalRecettes ?? 0)}`,
            trend: 'up' as const,
            icon: DollarSign,
            color: 'bg-emerald-500/10 text-emerald-500',
          },
          {
            label: 'Taux de recouvrement',
            value: `${tauxRecouvrement.toFixed(1)}%`,
            change: tauxRecouvrement >= 80 ? 'Bon taux' : 'À améliorer',
            trend: tauxRecouvrement >= 80 ? ('up' as const) : ('down' as const),
            icon: CheckCircle,
            color: 'bg-violet-500/10 text-violet-500',
          },
          {
            label: 'Frais impayés',
            value: formatMontant(fd?.montantImpaye ?? 0),
            change: `${fd?.nombreImpaye ?? 0} facture(s) concernée(s)`,
            trend: 'neutral' as const,
            icon: TrendingUp,
            color: 'bg-orange-500/10 text-orange-500',
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.color)}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <div className={cn(
                'flex items-center gap-1 mt-2 text-xs font-medium',
                stat.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
                stat.trend === 'down' ? 'text-red-500' : 'text-muted-foreground',
              )}>
                <TrendIcon trend={stat.trend} />
                {stat.change}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
