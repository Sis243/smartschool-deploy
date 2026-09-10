'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, GraduationCap, Settings2, Plus, CreditCard, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { MODULES_ACTIVABLES, MODULES_LABELS, ModuleCle } from '@/lib/modules';
import { PRIX_MENSUEL_USD, PRIX_ANNUEL_USD } from '@/lib/abonnement';

const SUBSCRIPTION_PLANS = [
  { value: 'BASIC', label: 'Basic' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
] as const;

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Pas de "type d'école" figé à la création : une école est générale par
// défaut (schoolType: GENERALE côté API) — les spécialisations (maternelle,
// autisme...) s'activent après coup via l'onglet Modules.
const ECOLE_VIDE = {
  name: '', slug: '', email: '', phone: '', address: '',
  subscriptionPlan: 'BASIC',
  adminFirstName: '', adminLastName: '', adminEmail: '',
};

function NouvelleEcoleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(ECOLE_VIDE);

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/tenants', form),
    onSuccess: (res: any) => {
      const invitationEnvoyee = res?.data?.data?.invitationEnvoyee;
      toast.success(
        invitationEnvoyee
          ? `École créée — un e-mail d'activation a été envoyé à ${form.adminEmail}`
          : "École créée — l'e-mail d'activation n'a pas pu être envoyé, l'admin peut utiliser \"Mot de passe oublié\"",
        { duration: 6000 },
      );
      qc.invalidateQueries({ queryKey: ['tenants-super-admin'] });
      onClose();
      setForm(ECOLE_VIDE);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de la création'),
  });

  const valide = form.name && form.slug && form.email && form.adminFirstName && form.adminLastName && form.adminEmail;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setForm(ECOLE_VIDE); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvelle école</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Établissement</p>
          <div className="space-y-1.5">
            <Label>Nom de l&apos;école *</Label>
            <Input
              placeholder="École Bon Départ"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Identifiant unique *</Label>
            <Input placeholder="ecole-bon-depart" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email de contact *</Label>
              <Input type="email" placeholder="info@ecole.cd" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input placeholder="+243 ..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Plan d&apos;abonnement</Label>
            <Select value={form.subscriptionPlan} onValueChange={(v) => setForm({ ...form, subscriptionPlan: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SUBSCRIPTION_PLANS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Administrateur de l&apos;école</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prénom *</Label>
              <Input placeholder="Jean" value={form.adminFirstName} onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input placeholder="Directeur" value={form.adminLastName} onChange={(e) => setForm({ ...form, adminLastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email administrateur *</Label>
            <Input type="email" placeholder="admin@ecole.cd" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">
            Un e-mail d&apos;activation sera envoyé à cette adresse pour que l&apos;administrateur choisisse lui-même son mot de passe.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setForm(ECOLE_VIDE); }}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!valide || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Création...' : "Créer l'école"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModulesDialog({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [modules, setModules] = useState<ModuleCle[]>(tenant?.modulesActifs ?? []);

  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/v1/tenants/${tenant.id}/modules`, { modules }),
    onSuccess: () => {
      toast.success('Modules mis à jour');
      qc.invalidateQueries({ queryKey: ['tenants-super-admin'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const toggle = (m: ModuleCle) =>
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  return (
    <Dialog open={!!tenant} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Modules — {tenant?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {MODULES_ACTIVABLES.map((m) => (
            <div key={m} className="flex items-center justify-between py-1">
              <span className="text-sm">{MODULES_LABELS[m]}</span>
              <Switch checked={modules.includes(m)} onCheckedChange={() => toggle(m)} />
            </div>
          ))}
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

const OFFRES_CYCLE = [
  { value: 'MENSUEL', label: 'Mensuel', prix: `${PRIX_MENSUEL_USD}$ / mois` },
  { value: 'ANNUEL', label: 'Annuel', prix: `${PRIX_ANNUEL_USD}$ / an (30% de remise)` },
  { value: 'A_VIE', label: 'Licence à vie', prix: 'Contactez-nous' },
] as const;

function AbonnementDialog({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [cycle, setCycle] = useState<'MENSUEL' | 'ANNUEL' | 'A_VIE'>(tenant?.subscriptionCycle ?? 'MENSUEL');
  const [dateDebut, setDateDebut] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/v1/tenants/${tenant.id}/abonnement`, { cycle, dateDebut: dateDebut || undefined }),
    onSuccess: () => {
      toast.success('Abonnement activé');
      qc.invalidateQueries({ queryKey: ['tenants-super-admin'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  return (
    <Dialog open={!!tenant} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Abonnement — {tenant?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {OFFRES_CYCLE.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setCycle(o.value)}
              className={`w-full text-left border rounded-lg p-3 transition-colors ${cycle === o.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-border hover:border-blue-300'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{o.label}</span>
                <span className="text-sm text-blue-600 font-semibold">{o.prix}</span>
              </div>
            </button>
          ))}
          {cycle !== 'A_VIE' && (
            <div className="space-y-1.5 pt-2">
              <Label>Date de départ (optionnel)</Label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
              <p className="text-xs text-muted-foreground">Laissez vide pour démarrer aujourd&apos;hui (ou prolonger depuis la date d&apos;expiration actuelle si elle est encore valide).</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Activation...' : 'Activer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SuperAdminView() {
  const qc = useQueryClient();
  const [tenantModules, setTenantModules] = useState<any | null>(null);
  const [tenantAbonnement, setTenantAbonnement] = useState<any | null>(null);
  const [nouvelleEcoleOpen, setNouvelleEcoleOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: tenantsToutes = [], isLoading } = useQuery({
    queryKey: ['tenants-super-admin'],
    queryFn: async () => (await api.get('/api/v1/tenants')).data.data,
  });

  const tenants = (tenantsToutes as any[]).filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${t.name} ${t.slug} ${t.email ?? ''}`.toLowerCase().includes(q);
  });

  const toggleActif = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/tenants/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenants-super-admin'] }),
    onError: () => toast.error('Erreur'),
  });

  const totalEcoles = tenantsToutes.length;
  const totalEleves = (tenantsToutes as any[]).reduce((s: number, t: any) => s + (t._count?.eleves ?? 0), 0);
  const totalUsers = (tenantsToutes as any[]).reduce((s: number, t: any) => s + (t._count?.users ?? 0), 0);

  return (
    <div className="space-y-6">
      {tenantModules && <ModulesDialog tenant={tenantModules} onClose={() => setTenantModules(null)} />}
      {tenantAbonnement && <AbonnementDialog tenant={tenantAbonnement} onClose={() => setTenantAbonnement(null)} />}
      <NouvelleEcoleDialog open={nouvelleEcoleOpen} onClose={() => setNouvelleEcoleOpen(false)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super Administration</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestion des établissements et de leurs modules souscrits</p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setNouvelleEcoleOpen(true)}>
          <Plus className="w-4 h-4" />Nouvelle école
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Établissements', value: totalEcoles, icon: Building2, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Élèves (total)', value: totalEleves, icon: GraduationCap, color: 'bg-emerald-500/10 text-emerald-500' },
          { label: 'Utilisateurs (total)', value: totalUsers, icon: Users, color: 'bg-purple-500/10 text-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Établissements ({totalEcoles})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher une école..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>École</TableHead>
                <TableHead>Modules actifs</TableHead><TableHead>Abonnement</TableHead><TableHead>Statut</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : tenants.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">{search ? `Aucune école ne correspond à « ${search} »` : 'Aucun établissement'}</TableCell></TableRow>
              ) : tenants.map((t: any) => {
                const fin = t.subscriptionEnd ? new Date(t.subscriptionEnd) : null;
                const joursRestants = fin ? Math.ceil((fin.getTime() - Date.now()) / 86_400_000) : null;
                let abonnementBadge: { label: string; cls: string };
                if (t.subscriptionCycle === 'A_VIE') abonnementBadge = { label: 'À vie', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
                else if (!fin) abonnementBadge = { label: 'Non activé', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
                else if (joursRestants! < 0) abonnementBadge = { label: 'Expiré', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
                else if (joursRestants! <= 7) abonnementBadge = { label: `${joursRestants}j restants`, cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
                else abonnementBadge = { label: `Actif (${t.subscriptionCycle === 'MENSUEL' ? 'mensuel' : 'annuel'})`, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };

                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.slug}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(t.modulesActifs ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">Aucun</span>
                        ) : t.modulesActifs.map((m: ModuleCle) => (
                          <Badge key={m} variant="secondary" className="text-[10px]">{MODULES_LABELS[m] ?? m}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => setTenantAbonnement(t)} className="cursor-pointer">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${abonnementBadge.cls}`}>{abonnementBadge.label}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActif.mutate(t.id)} className="cursor-pointer">
                        <Badge variant={t.isActive ? 'default' : 'destructive'} className="text-xs">
                          {t.isActive ? 'Actif' : 'Suspendu'}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setTenantModules(t)}>
                          <Settings2 className="w-3.5 h-3.5" />Modules
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setTenantAbonnement(t)}>
                          <CreditCard className="w-3.5 h-3.5" />Abonnement
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
