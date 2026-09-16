'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Users, GraduationCap, UserCog, DollarSign, Clock, ClipboardList, Building2,
  Pencil, Phone, MapPin, Mail,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

function ModifierEcoleDialog({ tenant, responsable, onClose }: { tenant: any; responsable: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: tenant.name ?? '',
    email: tenant.email ?? '',
    phone: tenant.phone ?? '',
    address: tenant.address ?? '',
    responsablePhone: responsable?.phone ?? '',
  });

  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/v1/tenants/${tenant.id}`, form),
    onSuccess: () => {
      toast.success('Établissement mis à jour');
      qc.invalidateQueries({ queryKey: ['tenant-stats', tenant.id] });
      qc.invalidateQueries({ queryKey: ['tenants-super-admin'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de la mise à jour'),
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Modifier — {tenant.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Établissement</p>
          <div className="space-y-1.5">
            <Label>Nom de l&apos;école</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email de contact</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Adresse</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          {responsable && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Responsable — {responsable.firstName} {responsable.lastName}</p>
              <div className="space-y-1.5">
                <Label>Téléphone du responsable</Label>
                <Input placeholder="+243 ..." value={form.responsablePhone} onChange={(e) => setForm({ ...form, responsablePhone: e.target.value })} />
                <p className="text-xs text-muted-foreground">Son email ({responsable.email}) sert d&apos;identifiant de connexion — à modifier depuis l&apos;école elle-même (Paramètres &gt; Utilisateurs), pas ici.</p>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SuperAdminDetailView({ tenantId }: { tenantId: string }) {
  const [editOpen, setEditOpen] = useState(false);
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
  const r = data.responsable;
  const stats = [
    { label: 'Élèves', value: data.nbEleves, icon: Users, color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Personnel', value: t._count?.users ?? 0, icon: UserCog, color: 'bg-purple-500/10 text-purple-500' },
    { label: 'Classes', value: data.nbClasses, icon: GraduationCap, color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Parents', value: data.nbParents, icon: Users, color: 'bg-cyan-500/10 text-cyan-500' },
  ];

  return (
    <div className="space-y-6">
      {editOpen && <ModifierEcoleDialog tenant={t} responsable={r} onClose={() => setEditOpen(false)} />}

      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" />Retour aux établissements
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t.name}</h1>
              <p className="text-muted-foreground text-sm">{t.slug} — {t.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5" />Modifier
          </Button>
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
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" />Coordonnées</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span>{t.email}</span></div>
            <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span>{t.phone || '—'}</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span>{t.address || '—'}</span></div>
            {r ? (
              <div className="pt-2 mt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Responsable</p>
                <p className="font-medium">{r.firstName} {r.lastName} <span className="text-muted-foreground font-normal">({ROLE_LABELS[r.role] ?? r.role})</span></p>
                <div className="flex items-center gap-2 mt-1"><Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span>{r.email}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span>{r.phone || '—'}</span></div>
              </div>
            ) : (
              <p className="pt-2 mt-2 border-t border-border/50 text-muted-foreground">Aucun responsable actif (Admin/Directeur) trouvé</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" />Finances</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Recettes totales</span><span className="font-medium">{formatMontant(data.totalRecettes)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Recettes ce mois</span><span className="font-medium">{formatMontant(data.recettesMois)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Montant impayé</span><span className="text-orange-600 dark:text-orange-400 font-medium">{formatMontant(data.montantImpaye)} ({data.nombreImpaye})</span></div>
          </CardContent>
        </Card>
      </div>

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
