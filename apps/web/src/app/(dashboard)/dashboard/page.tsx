import type { Metadata } from 'next';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { PresenceChart } from '@/components/dashboard/presence-chart';
import { RevenusChart } from '@/components/dashboard/revenus-chart';
import { RecentPaiements } from '@/components/dashboard/recent-paiements';
import { Alertes } from '@/components/dashboard/alertes';

export const metadata: Metadata = { title: 'Tableau de bord' };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre établissement</p>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RevenusChart />
          <PresenceChart />
        </div>
        <div>
          <Alertes />
        </div>
      </div>

      <RecentPaiements />
    </div>
  );
}
