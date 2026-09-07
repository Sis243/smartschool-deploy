'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, CheckCircle, Clock, Plus, Search } from 'lucide-react';
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
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'ENSEIGNANT', password: '' });

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/rh/personnel', { ...form, password: form.password || undefined }),
    onSuccess: (res: any) => {
      const tempPassword = res?.data?.data?.motDePasseTemporaire;
      toast.success(
        tempPassword ? `Personnel ajouté — mot de passe temporaire : ${tempPassword}` : 'Personnel ajouté',
        { duration: tempPassword ? 15000 : 4000 },
      );
      qc.invalidateQueries({ queryKey: ['personnel'] });
      onClose();
      setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'ENSEIGNANT', password: '' });
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
          <div className="space-y-1.5">
            <Label>Mot de passe initial</Label>
            <Input placeholder="Laisser vide pour générer un mot de passe automatiquement" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
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

// ─── Vue principale ───────────────────────────────────────────────────────────
export function RhView() {
  const { canGererRh } = usePermissions();
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
        </TabsList>
        <TabsContent value="personnel" className="mt-4"><PersonnelTab /></TabsContent>
        {canGererRh && <TabsContent value="presences" className="mt-4"><PresencesTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
