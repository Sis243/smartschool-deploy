'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, CheckCircle, XCircle, Clock, User, Phone, Mail, Link, Copy, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { NouveauParentDialog } from '@/components/parents/nouveau-parent-dialog';
import api from '@/lib/api';

const statutConfig: Record<string, { label: string; cls: string; icon: any }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock },
  APPROUVEE:  { label: 'Approuvée',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  REJETEE:    { label: 'Rejetée',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

// ─── Dialog Approbation ───────────────────────────────────────────────────────
function ApprobationDialog({ demande, onClose }: { demande: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [classeId, setClasseId] = useState('');
  const [note, setNote] = useState('');
  const [parentId, setParentId] = useState('');
  const [rechercheParent, setRechercheParent] = useState('');
  const [nouveauParentOpen, setNouveauParentOpen] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-mini'],
    queryFn: async () => (await api.get('/api/v1/academique/classes')).data.data ?? [],
  });
  const { data: parents = [] } = useQuery({
    queryKey: ['parents'],
    queryFn: async () => (await api.get('/api/v1/eleves/parents')).data.data ?? [],
  });

  // Pré-sélectionne un parent déjà enregistré au même téléphone que la
  // demande, si un existe — la secrétaire peut toujours changer.
  useEffect(() => {
    const correspondance = (parents as any[]).find((p) => p.telephone === demande.telephone);
    if (correspondance) setParentId(correspondance.id);
  }, [parents, demande.telephone]);

  const parentsFiltres = (parents as any[]).filter((p) => {
    const q = rechercheParent.trim().toLowerCase();
    if (!q) return true;
    return `${p.prenom} ${p.nom} ${p.telephone}`.toLowerCase().includes(q);
  });

  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/v1/inscriptions/admin/${demande.id}/approuver`, {
      classeId: classeId || undefined,
      noteSecretaire: note || undefined,
      parentId: parentId || undefined,
    }),
    onSuccess: () => {
      toast.success(`${demande.prenomEnfant} ${demande.nomEnfant} inscrit(e) !`);
      qc.invalidateQueries({ queryKey: ['demandes'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de l\'approbation'),
  });

  return (
    <>
      <NouveauParentDialog
        open={nouveauParentOpen}
        onClose={() => setNouveauParentOpen(false)}
        onCreated={(parent) => { setParentId(parent.id); setNouveauParentOpen(false); }}
      />
      <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approuver — {demande.prenomEnfant} {demande.nomEnfant}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Classe souhaitée :</span> <strong>{demande.classeVisee ?? '—'}</strong></p>
              <p><span className="text-muted-foreground">Parent indiqué sur la demande :</span> {demande.prenomParent} {demande.nomParent} — {demande.telephone}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Rattacher au parent</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un parent existant (nom, téléphone)..."
                  className="pl-8 mb-2"
                  value={rechercheParent}
                  onChange={(e) => setRechercheParent(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger><SelectValue placeholder="Choisir un parent existant" /></SelectTrigger>
                  <SelectContent>
                    {parentsFiltres.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom} — {p.telephone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setNouveauParentOpen(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Aucune sélection = un nouveau parent sera créé à partir des informations de la demande.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Affecter à une classe</Label>
              <Select onValueChange={setClasseId}>
                <SelectTrigger><SelectValue placeholder="Choisir une classe (optionnel)" /></SelectTrigger>
                <SelectContent>
                  {(classes as any[]).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nom} — {c.niveau}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Note interne</Label>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                placeholder="Note pour la secrétaire..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-emerald-600 hover:bg-emerald-500">
              {mutation.isPending ? 'Inscription...' : 'Confirmer l\'inscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Dialog Rejet ─────────────────────────────────────────────────────────────
function RejetDialog({ demande, onClose }: { demande: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/v1/inscriptions/admin/${demande.id}/rejeter`, { note }),
    onSuccess: () => {
      toast.success('Demande rejetée');
      qc.invalidateQueries({ queryKey: ['demandes'] });
      onClose();
    },
    onError: () => toast.error('Erreur'),
  });

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rejeter la demande de {demande.prenomEnfant} {demande.nomEnfant}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Motif du rejet (optionnel)</Label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Raison du rejet..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-red-600 hover:bg-red-500">
            {mutation.isPending ? 'Rejet...' : 'Confirmer le rejet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tableau des demandes ─────────────────────────────────────────────────────
function DemandesTable({ statut }: { statut?: string }) {
  const [approuvant, setApprouvant] = useState<any>(null);
  const [rejetant, setRejetant] = useState<any>(null);

  const { data: demandes = [], isLoading } = useQuery({
    queryKey: ['demandes', statut],
    queryFn: async () => {
      const url = statut ? `/api/v1/inscriptions/admin?statut=${statut}` : '/api/v1/inscriptions/admin';
      return (await api.get(url)).data.data ?? [];
    },
  });

  const list = demandes as any[];

  return (
    <>
      {approuvant && <ApprobationDialog demande={approuvant} onClose={() => setApprouvant(null)} />}
      {rejetant && <RejetDialog demande={rejetant} onClose={() => setRejetant(null)} />}

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Enfant</TableHead>
                <TableHead>Classe souhaitée</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Aucune demande</p>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((d: any) => {
                  const s = statutConfig[d.statut] ?? { label: d.statut, cls: '', icon: Clock };
                  const SIcon = s.icon;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="font-medium">{d.prenomEnfant} {d.nomEnfant}</div>
                        {d.dateNaissance && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(d.dateNaissance).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.classeVisee ?? '—'}</TableCell>
                      <TableCell>
                        <div className="text-sm">{d.prenomParent} {d.nomParent}</div>
                        <div className="text-xs text-muted-foreground">{d.lienFiliation ?? ''}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{d.telephone}</span>
                          {d.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{d.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${s.cls}`}>
                          <SIcon className="w-3 h-3" />{s.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {d.statut === 'EN_ATTENTE' && (
                          <div className="flex items-center gap-2 justify-end">
                            <Button size="sm" className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500"
                              onClick={() => setApprouvant(d)}>
                              Approuver
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setRejetant(d)}>
                              Rejeter
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Vue principale ───────────────────────────────────────────────────────────
export function InscriptionsView() {
  const { data: toutes = [] } = useQuery({
    queryKey: ['demandes'],
    queryFn: async () => (await api.get('/api/v1/inscriptions/admin')).data.data ?? [],
  });
  const { data: tenant } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: async () => (await api.get('/api/v1/tenants/me')).data.data,
  });

  const list = toutes as any[];
  const enAttente = list.filter(d => d.statut === 'EN_ATTENTE').length;
  const approuvees = list.filter(d => d.statut === 'APPROUVEE').length;
  const rejetees = list.filter(d => d.statut === 'REJETEE').length;

  // Le slug ne fait pas partie du JWT/profil utilisateur (seul tenantId — un
  // id, pas un slug — y figure) : on le récupère via /tenants/me plutôt que
  // du localStorage, qui ne l'a jamais contenu.
  const tenantSlug = (tenant as any)?.slug ?? '';
  const lienPublic = tenantSlug && typeof window !== 'undefined' ? `${window.location.origin}/inscription/${tenantSlug}` : '';

  const copyLink = () => {
    if (lienPublic) {
      navigator.clipboard.writeText(lienPublic);
      toast.success('Lien copié !');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inscriptions en ligne</h1>
          <p className="text-muted-foreground text-sm mt-1">Gérez les demandes d'inscription soumises par les parents</p>
        </div>
        {lienPublic && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
            <Link className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground max-w-[200px] truncate">{lienPublic}</span>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyLink}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'En attente', value: enAttente, icon: Clock, color: 'bg-orange-500/10 text-orange-500' },
          { label: 'Approuvées', value: approuvees, icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-500' },
          { label: 'Rejetées', value: rejetees, icon: XCircle, color: 'bg-red-500/10 text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Toutes ({list.length})</TabsTrigger>
          <TabsTrigger value="pending">En attente ({enAttente})</TabsTrigger>
          <TabsTrigger value="approved">Approuvées</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4"><DemandesTable /></TabsContent>
        <TabsContent value="pending" className="mt-4"><DemandesTable statut="EN_ATTENTE" /></TabsContent>
        <TabsContent value="approved" className="mt-4"><DemandesTable statut="APPROUVEE" /></TabsContent>
      </Tabs>
    </div>
  );
}
