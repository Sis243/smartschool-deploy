'use client';

import { useQuery } from '@tanstack/react-query';
import { formatMontant } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import api from '@/lib/api';

const statutVariant: Record<string, { label: string; cls: string }> = {
  PAYE:       { label: 'Payé',       cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  PARTIEL:    { label: 'Partiel',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  EN_ATTENTE: { label: 'En attente', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export function RecentPaiements() {
  const { canVoirFinances } = usePermissions();

  const { data: dash, isLoading } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: async () => (await api.get('/api/v1/finances/dashboard')).data.data,
    staleTime: 60_000,
    enabled: canVoirFinances,
  });

  if (!canVoirFinances) return null;

  const paiements: any[] = (dash as any)?.paiementsRecents ?? [];

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Paiements récents</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Élève</TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paiements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aucun paiement enregistré
                </TableCell>
              </TableRow>
            ) : (
              paiements.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.eleve?.prenom} {p.eleve?.nom}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                      {p.eleve?.matricule}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.facture?.type ?? '—'}</TableCell>
                  <TableCell className="font-medium">{formatMontant(p.montant)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
