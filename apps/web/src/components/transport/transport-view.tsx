'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bus, MapPin, Users, Plus, UserCheck, X, Search, Trash2, Route } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';

// ─── Dialog Nouveau bus ───────────────────────────────────────────────────────
function BusDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ immatriculation: '', marque: '', capacite: '', destination: '' });

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/transport/bus', {
      immatriculation: form.immatriculation,
      marque: form.marque,
      capacite: Number(form.capacite),
      destination: form.destination || undefined,
    }),
    onSuccess: () => {
      toast.success('Bus ajouté');
      qc.invalidateQueries({ queryKey: ['bus'] });
      onClose();
      setForm({ immatriculation: '', marque: '', capacite: '', destination: '' });
    },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Ajouter un bus</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Immatriculation *</Label>
            <Input placeholder="ex: KIN 1234 A" value={form.immatriculation} onChange={(e) => setForm({ ...form, immatriculation: e.target.value.toUpperCase() })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Marque</Label>
              <Input placeholder="ex: Toyota Coaster" value={form.marque} onChange={(e) => setForm({ ...form, marque: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Capacité (places)</Label>
              <Input type="number" placeholder="ex: 30" value={form.capacite} onChange={(e) => setForm({ ...form, capacite: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Destination</Label>
            <Input placeholder="ex: Kinshasa - Gombe" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.immatriculation || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Ajout...' : 'Ajouter le bus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Abonner élève ─────────────────────────────────────────────────────
function AbonnementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [eleveId, setEleveId] = useState('');
  const [busId, setBusId] = useState('');

  const { data: eleves = [] } = useQuery({
    queryKey: ['eleves-mini'],
    enabled: open,
    queryFn: async () => (await api.get('/api/v1/eleves?limit=100')).data.data ?? [],
  });
  const { data: bus = [] } = useQuery({
    queryKey: ['bus'],
    queryFn: async () => (await api.get('/api/v1/transport/bus')).data.data,
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/transport/abonnements', { eleveId, busId }),
    onSuccess: () => {
      toast.success('Élève abonné au transport');
      qc.invalidateQueries({ queryKey: ['abonnements'] });
      onClose();
      setEleveId(''); setBusId('');
    },
    onError: () => toast.error('Erreur lors de l\'abonnement'),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Abonner un élève</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Élève *</Label>
            <Select onValueChange={setEleveId}>
              <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
              <SelectContent>
                {(eleves as any[]).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom} — {e.matricule}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Bus *</Label>
            <Select onValueChange={setBusId}>
              <SelectTrigger><SelectValue placeholder="Choisir un bus" /></SelectTrigger>
              <SelectContent>
                {(bus as any[]).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.immatriculation} — {b.marque ?? ''} ({b.capacite} places)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!eleveId || !busId || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Abonnement...' : 'Abonner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Arrêts (itinéraire) ────────────────────────────────────────────────
function ArretsDialog({ bus, onClose }: { bus: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [arret, setArret] = useState('');
  const [heurePrevue, setHeurePrevue] = useState('');

  const { data: itineraires = [], isLoading } = useQuery({
    queryKey: ['itineraires', bus?.id],
    queryFn: async () => (await api.get(`/api/v1/transport/bus/${bus.id}/itineraires`)).data.data ?? [],
    enabled: !!bus,
  });

  const invalider = () => {
    qc.invalidateQueries({ queryKey: ['itineraires', bus.id] });
    qc.invalidateQueries({ queryKey: ['bus'] });
  };

  const ajouter = useMutation({
    mutationFn: () => api.post(`/api/v1/transport/bus/${bus.id}/itineraires`, { arret, heurePrevue: heurePrevue || undefined }),
    onSuccess: () => { toast.success('Arrêt ajouté'); invalider(); setArret(''); setHeurePrevue(''); },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  const supprimer = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/transport/itineraires/${id}`),
    onSuccess: () => { toast.success('Arrêt supprimé'); invalider(); },
    onError: () => toast.error('Erreur'),
  });

  return (
    <Dialog open={!!bus} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Arrêts — {bus?.immatriculation}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : itineraires.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun arrêt configuré</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {(itineraires as any[]).map((it: any, i: number) => (
                <div key={it.id} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="flex-1 text-sm">{it.arret}</span>
                  {it.heurePrevue && <span className="text-xs text-muted-foreground">{it.heurePrevue}</span>}
                  <Button
                    size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0"
                    disabled={supprimer.isPending}
                    onClick={() => supprimer.mutate(it.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-border/60">
            <Input placeholder="Nom de l'arrêt" value={arret} onChange={(e) => setArret(e.target.value)} className="flex-1" />
            <Input type="time" value={heurePrevue} onChange={(e) => setHeurePrevue(e.target.value)} className="w-28" />
            <Button size="icon" className="shrink-0 bg-blue-600 hover:bg-blue-500" disabled={!arret.trim() || ajouter.isPending} onClick={() => ajouter.mutate()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet Bus ───────────────────────────────────────────────────────────────
function BusTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busArrets, setBusArrets] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const { data: busData = [], isLoading } = useQuery({
    queryKey: ['bus'],
    queryFn: async () => (await api.get('/api/v1/transport/bus')).data.data,
  });

  const bus = (busData as any[]).filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${b.immatriculation} ${b.marque ?? ''} ${b.destination ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <>
      <BusDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      {busArrets && <ArretsDialog bus={busArrets} onClose={() => setBusArrets(null)} />}
      <div className="relative w-64 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher un bus, destination..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
        ) : (bus as any[]).length === 0 ? (
          <Card className="col-span-full border-border/50 border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Bus className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Aucun bus enregistré</p>
              <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Ajouter le premier bus</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {(bus as any[]).map((b: any) => (
              <Card key={b.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <Bus className="w-6 h-6 text-blue-500" />
                    </div>
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Actif</Badge>
                  </div>
                  <p className="font-bold text-lg">{b.immatriculation}</p>
                  {b.marque && <p className="text-sm text-muted-foreground">{b.marque}</p>}
                  {b.destination && (
                    <p className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mt-1">
                      <MapPin className="w-3 h-3" />{b.destination}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{b.capacite ?? '—'} places</span>
                    <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" />{b._count?.abonnes ?? 0} abonnés</span>
                  </div>
                  {b.chauffeur && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-xs bg-slate-200">{b.chauffeur.firstName?.[0]}{b.chauffeur.lastName?.[0]}</AvatarFallback></Avatar>
                      <span className="text-xs text-muted-foreground">{b.chauffeur.firstName} {b.chauffeur.lastName}</span>
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="w-full mt-3 gap-1.5 h-7 text-xs" onClick={() => setBusArrets(b)}>
                    <Route className="w-3.5 h-3.5" />Arrêts ({b.itineraires?.length ?? 0})
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Card className="border-border/50 border-dashed flex items-center justify-center min-h-[160px] cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setDialogOpen(true)}>
              <div className="text-center text-muted-foreground">
                <Plus className="w-6 h-6 mx-auto mb-1" />
                <p className="text-sm">Ajouter un bus</p>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

// ─── Onglet Abonnements ───────────────────────────────────────────────────────
function AbonnementsTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: abonnementsData = [], isLoading } = useQuery({
    queryKey: ['abonnements'],
    queryFn: async () => (await api.get('/api/v1/transport/abonnements')).data.data,
  });

  const abonnements = (abonnementsData as any[]).filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${a.eleve?.prenom} ${a.eleve?.nom} ${a.eleve?.matricule} ${a.bus?.immatriculation}`.toLowerCase().includes(q);
  });

  const desabonner = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/transport/abonnements/${id}`),
    onSuccess: () => {
      toast.success('Élève désabonné');
      qc.invalidateQueries({ queryKey: ['abonnements'] });
    },
    onError: () => toast.error('Erreur lors du désabonnement'),
  });

  return (
    <>
      <AbonnementDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Abonnements ({(abonnementsData as any[]).length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Rechercher un élève, un bus..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
              </div>
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />Abonner un élève
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Élève</TableHead><TableHead>Matricule</TableHead>
                <TableHead>Classe</TableHead><TableHead>Bus</TableHead>
                <TableHead className="w-16 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : (abonnements as any[]).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  <p>Aucun abonnement enregistré</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Abonner un élève</Button>
                </TableCell></TableRow>
              ) : (abonnements as any[]).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.eleve?.prenom} {a.eleve?.nom}</TableCell>
                  <TableCell><span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{a.eleve?.matricule}</span></TableCell>
                  <TableCell className="text-muted-foreground">{a.eleve?.classe?.nom ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Bus className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{a.bus?.immatriculation}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      disabled={desabonner.isPending}
                      onClick={() => { if (confirm(`Désabonner ${a.eleve?.prenom} ${a.eleve?.nom} du transport ?`)) desabonner.mutate(a.id); }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
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
export function TransportView() {
  const { data: bus = [] } = useQuery({ queryKey: ['bus'], queryFn: async () => (await api.get('/api/v1/transport/bus')).data.data });
  const { data: abonnements = [] } = useQuery({ queryKey: ['abonnements'], queryFn: async () => (await api.get('/api/v1/transport/abonnements')).data.data });

  const totalAbonnes = (bus as any[]).reduce((s: number, b: any) => s + (b._count?.abonnes ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transport scolaire</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestion des bus, itinéraires et abonnements</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Bus actifs', value: (bus as any[]).length, icon: Bus, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Élèves abonnés', value: totalAbonnes, icon: Users, color: 'bg-emerald-500/10 text-emerald-500' },
          { label: 'Arrêts configurés', value: (bus as any[]).reduce((s: number, b: any) => s + (b.itineraires?.length ?? 0), 0), icon: MapPin, color: 'bg-orange-500/10 text-orange-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bus">
        <TabsList>
          <TabsTrigger value="bus">Flotte de bus</TabsTrigger>
          <TabsTrigger value="abonnements">Abonnements</TabsTrigger>
        </TabsList>
        <TabsContent value="bus" className="mt-4"><BusTab /></TabsContent>
        <TabsContent value="abonnements" className="mt-4"><AbonnementsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
