'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, GraduationCap, UserCog, DollarSign, Clock, ClipboardList, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { formatMontant } from '@/lib/utils';
import { MODULES_LABELS, ModuleCle } from '@/lib/modules';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur', DIRECTEUR: 'Directeur', SECRETAIRE: 'Secrétaire',
  ENSEIGNANT: 'Enseignant', COMPTABLE: 'Comptable', THERAPEUTE: 'Thérapeute',
  CHAUFFEUR: 'Chauffeur', BIBLIOTHECAIRE: 'Bibliothécaire', PERSONNEL_APPUI: "Personnel d'appui",
};

const statutDemandeCls: Record<string, string> = {
  EN_ATTENTE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  APPROUVEE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJETEE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function SuperAdminDetailView({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-stats', tenantId],
    queryFn: async () => (await api.get(`/api/v1/tenants/${tenantId}/stats`)).data.data,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  const t = data.tenant;
  const stats = [
    { label: 'Élèves', value: data.nbEleves, icon: Users, color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Personnel', value: t._count?.users ?? 0, icon: UserCog, color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Classes', value: data.nbClasses, icon: GraduationCap, color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Parents', value: data.nbParents, icon: Users, color: 'bg-cyan-500/10 text-cyan-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" />Retour aux établissements
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.name}</h1>
            <p className="text-muted-foreground text-sm">{t.slug} — {t.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" />Finances</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Recettes totales</span><span className="font-medium">{formatMontant(data.totalRecettes)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Recettes ce mois</span><span className="font-medium">{formatMontant(data.recettesMois)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Montant impayé</span><span className="text-orange-600 dark:text-orange-400 font-medium">{formatMontant(data.montantImpaye)} ({data.nombreImpaye})</span></div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCog className="w-4 h-4" />Personnel par rôle</CardTitle></CardHeader>
          <CardContent>
            {data.personnelParRole.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre du personnel</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.personnelParRole.map((p: any) => (
                  <Badge key={p.role} variant="secondary">
                    {ROLE_LABELS[p.role] ?? p.role} · {p.total}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-base">Modules actifs</CardTitle></CardHeader>
        <CardContent>
          {(t.modulesActifs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun module payant actif</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {t.modulesActifs.map((m: ModuleCle) => (
                <Badge key={m} variant="secondary">{MODULES_LABELS[m] ?? m}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" />Paiements récents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.paiementsRecents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun paiement enregistré</p>
            ) : data.paiementsRecents.map((p: any) => (
              <div key={p.id} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                <span>{p.eleve?.prenom} {p.eleve?.nom}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatMontant(p.montant)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <ClipboardList className="w-4 h-4" />Inscriptions récentes
              {data.demandesInscriptionEnAttente > 0 && (
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs">{data.demandesInscriptionEnAttente} en attente</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.inscriptionsRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune demande d&apos;inscription</p>
            ) : data.inscriptionsRecentes.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                <span>{d.prenomEnfant} {d.nomEnfant}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statutDemandeCls[d.statut] ?? ''}`}>{d.statut}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
