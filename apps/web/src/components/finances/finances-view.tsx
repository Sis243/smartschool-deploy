'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Clock, CheckCircle, Plus, Search, ShieldCheck, X, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { formatMontant } from '@/lib/utils';

const statutCls: Record<string, { label: string; cls: string }> = {
  PAYE:       { label: 'Payé',       cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  PARTIEL:    { label: 'Partiel',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  EN_ATTENTE: { label: 'En attente', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  ANNULE:     { label: 'Annulé',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

// ─── Dialog Nouvelle facture ──────────────────────────────────────────────────
function FactureDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: eleves = [] } = useQuery({
    queryKey: ['eleves-mini'],
    enabled: open,
    queryFn: async () => (await api.get('/api/v1/eleves?limit=100')).data.data ?? [],
  });
  const [eleveId, setEleveId] = useState('');
  const [type, setType] = useState('');
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState('');
  const [dateEcheance, setDateEcheance] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/finances/factures', { eleveId, type, libelle: libelle || undefined, montant: Number(montant), echeance: dateEcheance || undefined }),
    onSuccess: () => { toast.success('Facture créée'); qc.invalidateQueries({ queryKey: ['factures'] }); qc.invalidateQueries({ queryKey: ['finances-dashboard'] }); onClose(); setEleveId(''); setType(''); setLibelle(''); setMontant(''); setDateEcheance(''); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur lors de la création'),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouvelle facture</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Élève *</Label>
            <Select onValueChange={setEleveId}>
              <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
              <SelectContent>{eleves.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom} — {e.matricule}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type de frais *</Label>
            <Select onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                {[
                  { v: 'MINERVAL', l: 'Minerval' },
                  { v: 'INSCRIPTION', l: 'Inscription' },
                  { v: 'TRANSPORT', l: 'Transport' },
                  { v: 'CANTINE', l: 'Cantine' },
                  { v: 'BIBLIOTHEQUE', l: 'Bibliothèque' },
                  { v: 'AUTRE', l: 'Autre / divers' },
                ].map((t) => (
                  <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Libellé</Label>
            <Input placeholder="ex: Minerval - Trimestre 1 (généré automatiquement si vide)" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Montant (FC) *</Label>
              <Input type="number" placeholder="ex: 150000" value={montant} onChange={(e) => setMontant(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date d'échéance</Label>
              <Input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!eleveId || !type || !montant || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Création...' : 'Créer la facture'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Paiement ──────────────────────────────────────────────────────────
function PaiementDialog({ open, onClose, factureId }: { open: boolean; onClose: () => void; factureId?: string }) {
  const qc = useQueryClient();
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState('ESPECE');
  const [ref, setRef] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/finances/paiements', { factureId, montant: Number(montant), modePaiement: mode, reference: ref || undefined }),
    onSuccess: () => { toast.success('Paiement enregistré'); qc.invalidateQueries({ queryKey: ['factures'] }); qc.invalidateQueries({ queryKey: ['paiements'] }); qc.invalidateQueries({ queryKey: ['finances-dashboard'] }); onClose(); setMontant(''); setRef(''); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erreur lors de l\'enregistrement'),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Mode de paiement</Label>
            <Select defaultValue="ESPECE" onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[
                  { v: 'ESPECE', l: 'Espèces' },
                  { v: 'VIREMENT', l: 'Virement' },
                  { v: 'MOBILE_MONEY', l: 'Mobile Money' },
                  { v: 'CHEQUE', l: 'Chèque' },
                ].map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Montant (FC) *</Label>
            <Input type="number" placeholder="ex: 150000" value={montant} onChange={(e) => setMontant(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Référence / Reçu</Label>
            <Input placeholder="Numéro de reçu (optionnel)" value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!montant || !factureId || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Enregistrement...' : 'Valider le paiement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet Factures ──────────────────────────────────────────────────────────
function FacturesTab() {
  const [factureDialog, setFactureDialog] = useState(false);
  const [paiementFactureId, setPaiementFactureId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['factures', page, search],
    queryFn: async () => (await api.get(`/api/v1/finances/factures?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`)).data,
  });
  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <FactureDialog open={factureDialog} onClose={() => setFactureDialog(false)} />
      <PaiementDialog open={!!paiementFactureId} onClose={() => setPaiementFactureId(undefined)} factureId={paiementFactureId} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher un élève..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setFactureDialog(true)}>
              <Plus className="w-4 h-4" />Nouvelle facture
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Élève</TableHead><TableHead>Type</TableHead>
                <TableHead>Montant</TableHead><TableHead>Payé</TableHead>
                <TableHead>Statut</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Aucune facture — créez la première</TableCell></TableRow>
              ) : rows.map((f: any) => {
                const s = statutCls[f.statut] ?? { label: f.statut, cls: '' };
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.eleve?.prenom} {f.eleve?.nom}<p className="text-xs text-muted-foreground font-mono">{f.eleve?.matricule}</p></TableCell>
                    <TableCell className="text-muted-foreground">{f.type}</TableCell>
                    <TableCell className="font-medium">{formatMontant(f.montant)}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">{formatMontant(f.montantPaye ?? 0)}</TableCell>
                    <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></TableCell>
                    <TableCell>
                      {f.statut !== 'PAYE' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setPaiementFactureId(f.id)}>
                          <Plus className="w-3 h-3" />Paiement
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 text-sm text-muted-foreground">
            <span>Page {meta.page} sur {meta.totalPages} — {meta.total} facture{meta.total > 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
              <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

// ─── Onglet Paiements ─────────────────────────────────────────────────────────
function PaiementsTab() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['paiements'],
    queryFn: async () => (await api.get('/api/v1/finances/paiements?limit=30')).data,
  });
  const allRows = data?.data ?? [];
  const rows = (allRows as any[]).filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${p.eleve?.prenom} ${p.eleve?.nom} ${p.facture?.type ?? ''} ${p.modePaiement ?? ''} ${p.reference ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-0">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher un élève, une référence..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </CardHeader>
      <CardContent className="p-0 mt-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead><TableHead>Élève</TableHead>
              <TableHead>Type</TableHead><TableHead>Mode</TableHead>
              <TableHead>Montant</TableHead><TableHead>Référence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">{search ? `Aucun paiement ne correspond à « ${search} »` : 'Aucun paiement enregistré'}</TableCell></TableRow>
            ) : rows.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="text-muted-foreground text-sm">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell className="font-medium">{p.eleve?.prenom} {p.eleve?.nom}</TableCell>
                <TableCell className="text-muted-foreground">{p.facture?.type}</TableCell>
                <TableCell><span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{p.modePaiement?.replace('_', ' ')}</span></TableCell>
                <TableCell className="font-semibold text-emerald-600">{formatMontant(p.montant)}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{p.reference || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Onglet Preuves de paiement ───────────────────────────────────────────────
function PreuvesTab() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');

  const { data: preuvesToutes = [], isLoading } = useQuery({
    queryKey: ['preuves-paiement'],
    queryFn: async () => (await api.get('/api/v1/parent/admin/preuves')).data.data ?? [],
    refetchInterval: 30_000,
  });

  const validerMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'VALIDE' | 'REJETE' }) =>
      api.patch(`/api/v1/parent/admin/preuves/${id}`, { action, noteAdmin: note || undefined }),
    onSuccess: () => {
      toast.success('Décision enregistrée — parent notifié');
      qc.invalidateQueries({ queryKey: ['preuves-paiement'] });
      qc.invalidateQueries({ queryKey: ['factures'] });
      qc.invalidateQueries({ queryKey: ['finances-dashboard'] });
      setSelected(null);
      setNote('');
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const statutCls2: Record<string, string> = {
    EN_ATTENTE: 'bg-amber-100 text-amber-700',
    VALIDE: 'bg-emerald-100 text-emerald-700',
    REJETE: 'bg-red-100 text-red-700',
  };

  const pending = preuvesToutes.filter((p: any) => p.statut === 'EN_ATTENTE');
  const preuves = (preuvesToutes as any[]).filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${p.facture?.eleve?.prenom} ${p.facture?.eleve?.nom} ${p.parent?.prenom} ${p.parent?.nom} ${p.parent?.telephone ?? ''} ${p.reference ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-base">Preuves de paiement en attente</CardTitle>
            {pending.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {pending.length} à valider
              </span>
            )}
            <div className="relative w-56 ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Rechercher un élève, un parent..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Élève / Parent</TableHead>
                <TableHead>Facture</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Reçu</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : preuves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    {search ? `Aucune preuve ne correspond à « ${search} »` : 'Aucune preuve de paiement soumise'}
                  </TableCell>
                </TableRow>
              ) : preuves.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{p.facture?.eleve?.prenom} {p.facture?.eleve?.nom}</p>
                    <p className="text-xs text-muted-foreground">{p.parent?.prenom} {p.parent?.nom} · {p.parent?.telephone}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.facture?.eleve?.matricule}</TableCell>
                  <TableCell><span className="text-xs bg-muted px-2 py-0.5 rounded">{p.modePaiement?.replace('_', ' ')}</span></TableCell>
                  <TableCell className="font-semibold">{formatMontant(p.montant)}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutCls2[p.statut] ?? ''}`}>
                      {p.statut === 'EN_ATTENTE' ? 'En attente' : p.statut === 'VALIDE' ? 'Validé' : 'Rejeté'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {p.fichierUrl ? (
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${p.fichierUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />Voir
                      </a>
                    ) : p.reference ? (
                      <span className="text-xs font-mono text-muted-foreground">{p.reference}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.statut === 'EN_ATTENTE' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelected(p); setNote(''); }}>
                        Traiter
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Validation dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Valider la preuve de paiement</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Élève :</span> <strong>{selected.facture?.eleve?.prenom} {selected.facture?.eleve?.nom}</strong></p>
                <p><span className="text-muted-foreground">Montant déclaré :</span> <strong>{formatMontant(selected.montant)}</strong></p>
                <p><span className="text-muted-foreground">Mode :</span> {selected.modePaiement?.replace('_', ' ')}</p>
                {selected.reference && <p><span className="text-muted-foreground">Référence :</span> <code className="font-mono text-xs">{selected.reference}</code></p>}
                {selected.fichierUrl && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${selected.fichierUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 text-xs hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />Voir le reçu bancaire
                  </a>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Note / motif (optionnel)</Label>
                <Input
                  placeholder="Ex: Référence vérifiée, paiement confirmé"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Annuler</Button>
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 gap-1"
              disabled={validerMutation.isPending}
              onClick={() => validerMutation.mutate({ id: selected.id, action: 'REJETE' })}
            >
              <X className="w-4 h-4" />Rejeter
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 gap-1"
              disabled={validerMutation.isPending}
              onClick={() => validerMutation.mutate({ id: selected.id, action: 'VALIDE' })}
            >
              <ShieldCheck className="w-4 h-4" />Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Vue principale ───────────────────────────────────────────────────────────
export function FinancesView() {
  const { data: dash } = useQuery({
    queryKey: ['finances-dashboard'],
    queryFn: async () => (await api.get('/api/v1/finances/dashboard')).data.data,
  });

  const stats = [
    { label: 'Recettes totales', value: dash ? formatMontant(dash.totalRecettes) : '—', icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Ce mois-ci', value: dash ? formatMontant(dash.recettesMois) : '—', icon: TrendingUp, color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Montant impayé', value: dash ? formatMontant(dash.montantImpaye) : '—', sub: dash ? `${dash.nombreImpaye} factures` : '', icon: Clock, color: 'bg-orange-500/10 text-orange-500' },
    { label: 'Taux recouvrement', value: dash ? `${dash.tauxRecouvrement?.toFixed(1)}%` : '—', icon: CheckCircle, color: 'bg-violet-500/10 text-violet-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finances</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestion des frais scolaires et paiements</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
              </div>
              <p className="text-xl font-bold tracking-tight">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="factures">
        <TabsList>
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="paiements">Paiements</TabsTrigger>
          <TabsTrigger value="preuves">Preuves portail</TabsTrigger>
        </TabsList>
        <TabsContent value="factures" className="mt-4"><FacturesTab /></TabsContent>
        <TabsContent value="paiements" className="mt-4"><PaiementsTab /></TabsContent>
        <TabsContent value="preuves" className="mt-4"><PreuvesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
