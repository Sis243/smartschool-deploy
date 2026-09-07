'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, CheckCircle, Clock, Plus, Search, Trash2, Wallet, Eye, Settings2, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { getInitials } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { CATALOGUE_PAIE } from '@/lib/paie-catalogue';
import { useModulesActifs } from '@/hooks/use-modules-actifs';

const roleLabels: Record<string, string> = {
  ENSEIGNANT: 'Enseignant', DIRECTEUR: 'Directeur', COMPTABLE: 'Comptable',
  SECRETAIRE: 'Secrétaire', ADMIN: 'Admin', SUPER_ADMIN: 'Super Admin',
  THERAPEUTE: 'Thérapeute', CHAUFFEUR: 'Chauffeur', BIBLIOTHECAIRE: 'Bibliothécaire',
};
// Rôles assignables depuis ce formulaire — doit rester synchronisé avec
// ROLES_ASSIGNABLES côté API (SUPER_ADMIN et PARENT sont volontairement exclus).
const roleLabelsAssignables: Record<string, string> = {
  ENSEIGNANT: 'Enseignant', DIRECTEUR: 'Directeur', COMPTABLE: 'Comptable',
  SECRETAIRE: 'Secrétaire', ADMIN: 'Admin',
  THERAPEUTE: 'Thérapeute', CHAUFFEUR: 'Chauffeur', BIBLIOTHECAIRE: 'Bibliothécaire',
};
const statutPresence: Record<string, { label: string; cls: string }> = {
  PRESENT: { label: 'Présent', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ABSENT:  { label: 'Absent',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  RETARD:  { label: 'Retard',  cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  EXCUSE:  { label: 'Excusé',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

// ─── Dialog Nouveau personnel ─────────────────────────────────────────────────
function PersonnelDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'ENSEIGNANT' });

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/rh/personnel', form),
    onSuccess: (res: any) => {
      const invitationEnvoyee = res?.data?.data?.invitationEnvoyee;
      toast.success(
        invitationEnvoyee
          ? `Personnel ajouté — un e-mail d'activation a été envoyé à ${form.email}`
          : "Personnel ajouté — l'e-mail d'activation n'a pas pu être envoyé, réessayez depuis \"Mot de passe oublié\"",
        { duration: 6000 },
      );
      qc.invalidateQueries({ queryKey: ['personnel'] });
      onClose();
      setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'ENSEIGNANT' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de l\'ajout'),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouveau membre du personnel</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prénom *</Label>
              <Input placeholder="ex: Marie" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input placeholder="ex: Kabila" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" placeholder="ex: marie.kabila@ecole.cd" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input placeholder="+243 ..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle *</Label>
              <Select defaultValue="ENSEIGNANT" onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(roleLabelsAssignables).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Un e-mail d&apos;activation sera envoyé à cette adresse pour que la personne choisisse elle-même son mot de passe.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.firstName || !form.lastName || !form.email || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet Personnel ─────────────────────────────────────────────────────────
function PersonnelTab() {
  const { canGererRh } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: personnel = [], isLoading } = useQuery({
    queryKey: ['personnel'],
    queryFn: async () => (await api.get('/api/v1/rh/personnel')).data.data,
  });

  const filtered = personnel.filter((p: any) =>
    !search || `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {canGererRh && <PersonnelDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher un agent..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            {canGererRh && (
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />Nouveau personnel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Agent</TableHead><TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead><TableHead>Rôle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 4 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Aucun personnel trouvé</TableCell></TableRow>
              ) : filtered.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-blue-600 text-white font-semibold">{getInitials(p.firstName, p.lastName)}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.phone || '—'}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{roleLabels[p.role] ?? p.role}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Onglet Présences ─────────────────────────────────────────────────────────
function PresencesTab() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  const { data: presences = [], isLoading } = useQuery({
    queryKey: ['presences-rh', date],
    queryFn: async () => (await api.get(`/api/v1/rh/presences?date=${date}`)).data.data,
  });
  const { data: personnel = [] } = useQuery({
    queryKey: ['personnel'],
    queryFn: async () => (await api.get('/api/v1/rh/personnel')).data.data,
  });

  const presenceMap = new Map(presences.map((p: any) => [p.userId, p]));

  const marquer = useMutation({
    mutationFn: ({ userId, statut }: { userId: string; statut: string }) =>
      api.post('/api/v1/rh/presences', { userId, statut, date }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presences-rh', date] }),
    onError: () => toast.error('Erreur'),
  });

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Présences — {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </CardTitle>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44 h-8 text-sm" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Agent</TableHead><TableHead>Rôle</TableHead><TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 3 }).map((__, j) => <TableCell key={j}><Skeleton className="h-8 w-full" /></TableCell>)}</TableRow>
            )) : personnel.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="py-12 text-center text-muted-foreground">Aucun personnel</TableCell></TableRow>
            ) : personnel.map((p: any) => {
              const pr = presenceMap.get(p.id) as any;
              const s = pr ? (statutPresence[pr.statut as string] ?? { label: pr.statut, cls: '' }) : null;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-xs bg-blue-600 text-white">{getInitials(p.firstName, p.lastName)}</AvatarFallback></Avatar>
                      <span className="text-sm font-medium">{p.firstName} {p.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{roleLabels[p.role] ?? p.role}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {s && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>}
                      <Select value={(pr?.statut as string) ?? ''} onValueChange={(v) => marquer.mutate({ userId: p.id, statut: v })}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Marquer" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statutPresence).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Paie ───────────────────────────────────────────────────────────────────
const statutPaie: Record<string, { label: string; cls: string }> = {
  BROUILLON: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  VALIDEE: { label: 'Validée', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  PAYEE: { label: 'Payée', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

function formatMontant(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n ?? 0);
}

type LignePaieForm = { type: 'PRIME' | 'DEDUCTION'; libelle: string; montant: string };

// Formulaire volontairement libre : aucun champ de prime/déduction n'est
// obligatoire, chaque établissement ajoute les lignes qui correspondent à sa
// propre méthode de calcul de la paie.
function PaieDialog({ open, onClose, personnel }: { open: boolean; onClose: () => void; personnel: any[] }) {
  const qc = useQueryClient();
  const moisCourant = new Date().toISOString().slice(0, 7);
  const [userId, setUserId] = useState('');
  const [periode, setPeriode] = useState(moisCourant);
  const [salaireBase, setSalaireBase] = useState('');
  const [notes, setNotes] = useState('');
  const [lignes, setLignes] = useState<LignePaieForm[]>([]);

  const reset = () => {
    setUserId(''); setPeriode(moisCourant); setSalaireBase(''); setNotes(''); setLignes([]);
  };

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/api/v1/rh/paie', {
        userId,
        periode,
        salaireBase: Number(salaireBase) || 0,
        notes: notes || undefined,
        lignes: lignes
          .filter((l) => l.libelle && l.montant)
          .map((l) => ({ type: l.type, libelle: l.libelle, montant: Number(l.montant) || 0 })),
      }),
    onSuccess: () => {
      toast.success('Fiche de paie créée');
      qc.invalidateQueries({ queryKey: ['fiches-paie'] });
      onClose();
      reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de la création'),
  });

  const { data: tenant } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: async () => (await api.get('/api/v1/tenants/me')).data.data,
  });
  const typesActifs: string[] = tenant?.typesPrimeActifs ?? [];
  const catalogueActif = CATALOGUE_PAIE.filter((c) => typesActifs.includes(c.cle));

  const ajouterLigne = (type: 'PRIME' | 'DEDUCTION', libellePreRempli?: string) =>
    setLignes([...lignes, { type, libelle: libellePreRempli ?? '', montant: '' }]);
  const retirerLigne = (i: number) => setLignes(lignes.filter((_, idx) => idx !== i));
  const majLigne = (i: number, patch: Partial<LignePaieForm>) =>
    setLignes(lignes.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvelle fiche de paie</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Personnel *</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {personnel.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Période *</Label>
              <Input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Salaire de base *</Label>
            <Input type="number" placeholder="ex: 350000" value={salaireBase} onChange={(e) => setSalaireBase(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Primes et déductions (facultatif)</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => ajouterLigne('PRIME')}>+ Prime libre</Button>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => ajouterLigne('DEDUCTION')}>+ Déduction libre</Button>
              </div>
            </div>
            {catalogueActif.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {catalogueActif.map((c) => (
                  <button
                    key={c.cle}
                    type="button"
                    onClick={() => ajouterLigne(c.type, c.libelle)}
                    className="text-xs px-2 py-1 rounded-full border border-border hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    + {c.libelle}
                  </button>
                ))}
              </div>
            )}
            {lignes.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant={l.type === 'PRIME' ? 'default' : 'destructive'} className="text-xs shrink-0">{l.type === 'PRIME' ? 'Prime' : 'Déd.'}</Badge>
                <Input placeholder="Libellé (ex: Transport)" value={l.libelle} onChange={(e) => majLigne(i, { libelle: e.target.value })} className="flex-1" />
                <Input type="number" placeholder="Montant" value={l.montant} onChange={(e) => majLigne(i, { montant: e.target.value })} className="w-28" />
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={() => retirerLigne(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input placeholder="Optionnel" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Annuler</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!userId || !periode || !salaireBase || mutation.isPending}
            className="bg-blue-600 hover:bg-blue-500"
          >
            {mutation.isPending ? 'Création...' : 'Créer la fiche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaieDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: fiche, isLoading } = useQuery({
    queryKey: ['fiche-paie', id],
    queryFn: async () => (await api.get(`/api/v1/rh/paie/${id}`)).data.data,
    enabled: !!id,
  });

  const changerStatut = useMutation({
    mutationFn: (statut: string) => api.patch(`/api/v1/rh/paie/${id}/statut`, { statut }),
    onSuccess: () => {
      toast.success('Statut mis à jour');
      qc.invalidateQueries({ queryKey: ['fiches-paie'] });
      qc.invalidateQueries({ queryKey: ['fiche-paie', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  return (
    <Dialog open={!!id} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Fiche de paie</DialogTitle></DialogHeader>
        {isLoading || !fiche ? (
          <div className="space-y-2 py-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{fiche.user.firstName} {fiche.user.lastName}</p>
                <p className="text-xs text-muted-foreground">{fiche.periode}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statutPaie[fiche.statut]?.cls}`}>{statutPaie[fiche.statut]?.label ?? fiche.statut}</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Salaire de base</span><span>{formatMontant(fiche.salaireBase)}</span></div>
              {fiche.lignes.map((l: any) => (
                <div key={l.id} className="flex justify-between">
                  <span className="text-muted-foreground">{l.libelle}</span>
                  <span className={l.type === 'PRIME' ? 'text-emerald-600' : 'text-red-600'}>{l.type === 'PRIME' ? '+' : '-'}{formatMontant(l.montant)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 border-t"><span>Net</span><span>{formatMontant(fiche.net)}</span></div>
            </div>
            {fiche.notes && <p className="text-xs text-muted-foreground italic">{fiche.notes}</p>}
            {fiche.statut !== 'PAYEE' && (
              <div className="flex gap-2 pt-2">
                {fiche.statut === 'BROUILLON' && (
                  <Button size="sm" variant="outline" onClick={() => changerStatut.mutate('VALIDEE')} disabled={changerStatut.isPending}>Valider</Button>
                )}
                {fiche.statut === 'VALIDEE' && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" onClick={() => changerStatut.mutate('PAYEE')} disabled={changerStatut.isPending}>Marquer payée</Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TypesPrimeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: tenant } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: async () => (await api.get('/api/v1/tenants/me')).data.data,
    enabled: open,
  });
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => { if (open && tenant?.typesPrimeActifs) setTypes(tenant.typesPrimeActifs); }, [open, tenant]);

  const mutation = useMutation({
    mutationFn: () => api.patch('/api/v1/tenants/me/types-prime', { types }),
    onSuccess: () => {
      toast.success('Types de primes mis à jour');
      qc.invalidateQueries({ queryKey: ['my-tenant'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const toggle = (cle: string) => setTypes((prev) => (prev.includes(cle) ? prev.filter((c) => c !== cle) : [...prev, cle]));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Types de primes utilisés par l&apos;école</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          Sélectionnez les primes/déductions courantes en RDC que votre établissement utilise. Elles apparaîtront comme suggestions rapides lors de la création d&apos;une fiche de paie — rien n&apos;est obligatoire.
        </p>
        <div className="space-y-1 py-2">
          {CATALOGUE_PAIE.map((c) => (
            <label key={c.cle} className="flex items-center justify-between py-1.5 cursor-pointer">
              <span className="text-sm">{c.libelle}</span>
              <input type="checkbox" checked={types.includes(c.cle)} onChange={() => toggle(c.cle)} className="w-4 h-4" />
            </label>
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

function ImporterPaieDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const moisCourant = new Date().toISOString().slice(0, 7);
  const [periode, setPeriode] = useState(moisCourant);
  const [fichier, setFichier] = useState<File | null>(null);
  const [resultat, setResultat] = useState<{ importees: number; erreurs: any[] } | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('file', fichier!);
      fd.append('periode', periode);
      return api.post('/api/v1/rh/paie/importer', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res: any) => {
      setResultat(res.data.data);
      qc.invalidateQueries({ queryKey: ['fiches-paie'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de l\'import'),
  });

  const fermer = () => { onClose(); setFichier(null); setResultat(null); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) fermer(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Importer les fiches de paie (CSV)</DialogTitle></DialogHeader>
        {!resultat ? (
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Pour les écoles qui gèrent déjà leur paie sur Excel : exportez en CSV avec les colonnes <code className="bg-muted px-1 rounded">email</code> et <code className="bg-muted px-1 rounded">salaireBase</code>, puis une colonne par prime/déduction (ex. "Prime de transport", "INSS (part employé)"). Chaque email doit correspondre à un membre du personnel déjà enregistré.
            </p>
            <div className="space-y-1.5">
              <Label>Période *</Label>
              <Input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fichier CSV *</Label>
              <Input type="file" accept=".csv" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <p className="text-sm">
              <span className="text-emerald-600 font-semibold">{resultat.importees}</span> fiche(s) importée(s) avec succès.
            </p>
            {resultat.erreurs.length > 0 && (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                <p className="text-xs font-medium text-red-500">{resultat.erreurs.length} erreur(s) :</p>
                {resultat.erreurs.map((e: any, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">Ligne {e.ligne} ({e.email || '—'}) : {e.motif}</p>
                ))}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          {!resultat ? (
            <>
              <Button variant="outline" onClick={fermer}>Annuler</Button>
              <Button onClick={() => mutation.mutate()} disabled={!fichier || !periode || mutation.isPending} className="bg-blue-600 hover:bg-blue-500 gap-2">
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {mutation.isPending ? 'Import...' : 'Importer'}
              </Button>
            </>
          ) : (
            <Button onClick={fermer} className="bg-blue-600 hover:bg-blue-500">Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaieTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [periodeFiltre, setPeriodeFiltre] = useState('');
  const [typesPrimeOpen, setTypesPrimeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: personnel = [] } = useQuery({
    queryKey: ['personnel'],
    queryFn: async () => (await api.get('/api/v1/rh/personnel')).data.data,
  });
  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ['fiches-paie', periodeFiltre],
    queryFn: async () => (await api.get(`/api/v1/rh/paie${periodeFiltre ? `?periode=${periodeFiltre}` : ''}`)).data.data,
  });

  return (
    <>
      <PaieDialog open={dialogOpen} onClose={() => setDialogOpen(false)} personnel={personnel} />
      <PaieDetailDialog id={detailId} onClose={() => setDetailId(null)} />
      <TypesPrimeDialog open={typesPrimeOpen} onClose={() => setTypesPrimeOpen(false)} />
      <ImporterPaieDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <Input type="month" value={periodeFiltre} onChange={(e) => setPeriodeFiltre(e.target.value)} className="w-44" />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setTypesPrimeOpen(true)}>
                <Settings2 className="w-4 h-4" />Types de primes
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4" />Importer CSV
              </Button>
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />Nouvelle fiche
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Agent</TableHead><TableHead>Période</TableHead>
                <TableHead>Net</TableHead><TableHead>Statut</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : fiches.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Aucune fiche de paie</TableCell></TableRow>
              ) : fiches.map((f: any) => (
                <TableRow key={f.id} className="cursor-pointer" onClick={() => setDetailId(f.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-blue-600 text-white font-semibold">{getInitials(f.user.firstName, f.user.lastName)}</AvatarFallback></Avatar>
                      <p className="text-sm font-medium">{f.user.firstName} {f.user.lastName}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.periode}</TableCell>
                  <TableCell className="text-sm font-medium">{formatMontant(f.net)}</TableCell>
                  <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statutPaie[f.statut]?.cls}`}>{statutPaie[f.statut]?.label ?? f.statut}</span></TableCell>
                  <TableCell><Button size="icon" variant="ghost" className="h-7 w-7"><Eye className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Vue principale ───────────────────────────────────────────────────────────
export function RhView() {
  const { canGererRh, canGererPaie: canGererPaieRole } = usePermissions();
  const { estActif } = useModulesActifs();
  const canGererPaie = canGererPaieRole && estActif('PAIE');
  const { data: personnel = [] } = useQuery({ queryKey: ['personnel'], queryFn: async () => (await api.get('/api/v1/rh/personnel')).data.data });
  const today = new Date().toISOString().split('T')[0];
  const { data: presences = [] } = useQuery({
    queryKey: ['presences-rh', today],
    queryFn: async () => (await api.get(`/api/v1/rh/presences?date=${today}`)).data.data,
    enabled: canGererRh,
  });

  const presArr = Array.isArray(presences) ? presences : [];
  const presents = presArr.filter((p: any) => p.statut === 'PRESENT').length;
  const absents = presArr.filter((p: any) => p.statut === 'ABSENT').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ressources Humaines</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestion du personnel enseignant et administratif</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total personnel', value: personnel.length, icon: Users, color: 'bg-blue-500/10 text-blue-500' },
          ...(canGererRh
            ? [
                { label: 'Présents aujourd\'hui', value: presents, icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-500' },
                { label: 'Absents aujourd\'hui', value: absents, icon: Clock, color: 'bg-red-500/10 text-red-500' },
              ]
            : []),
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="personnel">
        <TabsList>
          <TabsTrigger value="personnel">Personnel</TabsTrigger>
          {canGererRh && <TabsTrigger value="presences">Présences</TabsTrigger>}
          {canGererPaie && <TabsTrigger value="paie" className="gap-1.5"><Wallet className="w-3.5 h-3.5" />Paie</TabsTrigger>}
        </TabsList>
        <TabsContent value="personnel" className="mt-4"><PersonnelTab /></TabsContent>
        {canGererRh && <TabsContent value="presences" className="mt-4"><PresencesTab /></TabsContent>}
        {canGererPaie && <TabsContent value="paie" className="mt-4"><PaieTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
