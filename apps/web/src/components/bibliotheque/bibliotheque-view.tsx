'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Library, BookOpen, Clock, AlertTriangle, Plus, Search, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import api from '@/lib/api';
import { formatMontant } from '@/lib/utils';

// ─── Dialog Nouveau livre ─────────────────────────────────────────────────────
function LivreDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ titre: '', auteur: '', isbn: '', categorie: '', quantite: '1', quantiteDisponible: '1' });

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/bibliotheque/livres', {
      titre: form.titre,
      auteur: form.auteur,
      isbn: form.isbn || undefined,
      categorie: form.categorie || undefined,
      quantiteTotale: Number(form.quantite),
      quantiteDisponible: Number(form.quantite),
    }),
    onSuccess: () => {
      toast.success('Livre ajouté au catalogue');
      qc.invalidateQueries({ queryKey: ['livres'] });
      onClose();
      setForm({ titre: '', auteur: '', isbn: '', categorie: '', quantite: '1', quantiteDisponible: '1' });
    },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Ajouter un livre</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Titre *</Label>
            <Input placeholder="ex: Les Misérables" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Auteur *</Label>
              <Input placeholder="ex: Victor Hugo" value={form.auteur} onChange={(e) => setForm({ ...form, auteur: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>ISBN</Label>
              <Input placeholder="978-..." value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select onValueChange={(v) => setForm({ ...form, categorie: v })}>
                <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                <SelectContent>
                  {['Roman', 'Science', 'Mathématiques', 'Histoire', 'Géographie', 'Langue', 'Religion', 'Art', 'Autre'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantité</Label>
              <Input type="number" min="1" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.titre || !form.auteur || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Ajout...' : 'Ajouter au catalogue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Emprunter ─────────────────────────────────────────────────────────
function EmpruntDialog({ open, onClose, livre }: { open: boolean; onClose: () => void; livre?: any }) {
  const qc = useQueryClient();
  const [eleveId, setEleveId] = useState('');
  const [dateRetour, setDateRetour] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  const { data: eleves = [] } = useQuery({
    queryKey: ['eleves-mini'],
    enabled: open,
    queryFn: async () => (await api.get('/api/v1/eleves?limit=100')).data.data?.data ?? [],
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/bibliotheque/emprunts', { livreId: livre?.id, eleveId, dateRetourPrevue: dateRetour }),
    onSuccess: () => {
      toast.success('Livre emprunté avec succès');
      qc.invalidateQueries({ queryKey: ['livres'] });
      qc.invalidateQueries({ queryKey: ['emprunts'] });
      onClose();
      setEleveId('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Livre non disponible'),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Emprunter : {livre?.titre}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {livre && (
            <div className="bg-muted/40 rounded-lg p-3 text-sm">
              <p className="font-medium">{livre.titre}</p>
              <p className="text-muted-foreground">{livre.auteur}</p>
              <p className="mt-1 text-xs"><span className={livre.quantiteDisponible > 0 ? 'text-emerald-600' : 'text-red-500'}>{livre.quantiteDisponible}</span> / {livre.quantiteTotale} exemplaire(s) disponible(s)</p>
            </div>
          )}
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
            <Label>Date de retour prévue</Label>
            <Input type="date" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!eleveId || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Enregistrement...' : 'Confirmer l\'emprunt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet Catalogue ─────────────────────────────────────────────────────────
function CatalogueTab() {
  const [livreDialog, setLivreDialog] = useState(false);
  const [empruntLivre, setEmpruntLivre] = useState<any>(null);
  const [search, setSearch] = useState('');

  const { data: livres = [], isLoading } = useQuery({
    queryKey: ['livres', search],
    queryFn: async () => {
      const url = search ? `/api/v1/bibliotheque/livres?search=${encodeURIComponent(search)}` : '/api/v1/bibliotheque/livres';
      return (await api.get(url)).data.data;
    },
  });

  return (
    <>
      <LivreDialog open={livreDialog} onClose={() => setLivreDialog(false)} />
      <EmpruntDialog open={!!empruntLivre} onClose={() => setEmpruntLivre(null)} livre={empruntLivre} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Titre, auteur, ISBN..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setLivreDialog(true)}>
              <Plus className="w-4 h-4" />Ajouter un livre
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Titre</TableHead><TableHead>Auteur</TableHead>
                <TableHead>Catégorie</TableHead><TableHead>Disponibilité</TableHead>
                <TableHead className="w-32">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : (livres as any[]).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  {search ? 'Aucun résultat' : <><p>Catalogue vide</p><Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setLivreDialog(true)}><Plus className="w-4 h-4" />Premier livre</Button></>}
                </TableCell></TableRow>
              ) : (livres as any[]).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <p className="font-medium">{l.titre}</p>
                    {l.isbn && <p className="text-xs text-muted-foreground font-mono">{l.isbn}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.auteur}</TableCell>
                  <TableCell>{l.categorie ? <Badge variant="outline" className="text-xs">{l.categorie}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${l.quantiteTotale > 0 ? (l.quantiteDisponible / l.quantiteTotale) * 100 : 0}%` }} />
                      </div>
                      <span className={`text-sm font-medium ${l.quantiteDisponible > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {l.quantiteDisponible}/{l.quantiteTotale}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={l.quantiteDisponible < 1} onClick={() => setEmpruntLivre(l)}>
                      <BookOpen className="w-3 h-3" />Emprunter
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

// ─── Onglet Emprunts ──────────────────────────────────────────────────────────
function EmpruntsTab() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState('EN_COURS');

  const { data: emprunts = [], isLoading } = useQuery({
    queryKey: ['emprunts', filtre],
    queryFn: async () => (await api.get(`/api/v1/bibliotheque/emprunts?statut=${filtre}`)).data.data,
  });

  const retourner = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/bibliotheque/emprunts/${id}/retour`),
    onSuccess: (res) => {
      const { penalite, joursRetard } = res.data.data;
      if (penalite > 0) toast.success(`Livre retourné — Pénalité : ${formatMontant(penalite)} (${joursRetard}j de retard)`);
      else toast.success('Livre retourné avec succès');
      qc.invalidateQueries({ queryKey: ['emprunts'] });
      qc.invalidateQueries({ queryKey: ['livres'] });
    },
    onError: () => toast.error('Erreur lors du retour'),
  });

  const today = new Date();

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          {['EN_COURS', 'RETOURNE'].map((s) => (
            <button key={s} onClick={() => setFiltre(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtre === s ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {s === 'EN_COURS' ? 'En cours' : 'Retournés'}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0 mt-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Livre</TableHead><TableHead>Élève</TableHead>
              <TableHead>Date emprunt</TableHead><TableHead>Retour prévu</TableHead>
              <TableHead>Statut</TableHead>
              {filtre === 'EN_COURS' && <TableHead className="w-24">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : (emprunts as any[]).length === 0 ? (
              <TableRow><TableCell colSpan={filtre === 'EN_COURS' ? 6 : 5} className="py-12 text-center text-muted-foreground">
                Aucun emprunt {filtre === 'EN_COURS' ? 'en cours' : 'retourné'}
              </TableCell></TableRow>
            ) : (emprunts as any[]).map((e: any) => {
              const retardDate = new Date(e.dateRetourPrevue);
              const enRetard = filtre === 'EN_COURS' && retardDate < today;
              const jours = enRetard ? Math.ceil((today.getTime() - retardDate.getTime()) / 86400000) : 0;
              return (
                <TableRow key={e.id} className={enRetard ? 'bg-red-50/50 dark:bg-red-900/5' : ''}>
                  <TableCell>
                    <p className="font-medium text-sm">{e.livre?.titre}</p>
                    <p className="text-xs text-muted-foreground">{e.livre?.auteur}</p>
                  </TableCell>
                  <TableCell className="font-medium">{e.eleve?.prenom} {e.eleve?.nom}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(e.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className={`text-sm ${enRetard ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    {new Date(e.dateRetourPrevue).toLocaleDateString('fr-FR')}
                    {enRetard && <p className="text-xs font-normal">{jours}j de retard</p>}
                  </TableCell>
                  <TableCell>
                    {enRetard ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" />En retard
                      </span>
                    ) : e.statut === 'RETOURNE' ? (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Retourné</span>
                    ) : (
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">En cours</span>
                    )}
                    {e.penalite > 0 && <p className="text-xs text-orange-600 mt-0.5">Pénalité: {formatMontant(e.penalite)}</p>}
                  </TableCell>
                  {filtre === 'EN_COURS' && (
                    <TableCell>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => { if (confirm('Confirmer le retour ?')) retourner.mutate(e.id); }}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Retourner</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  )}
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
export function BibliothequeView() {
  const { data: livres = [] } = useQuery({ queryKey: ['livres', ''], queryFn: async () => (await api.get('/api/v1/bibliotheque/livres')).data.data });
  const { data: emprunts = [] } = useQuery({ queryKey: ['emprunts', 'EN_COURS'], queryFn: async () => (await api.get('/api/v1/bibliotheque/emprunts?statut=EN_COURS')).data.data });

  const enRetard = (emprunts as any[]).filter((e: any) => new Date(e.dateRetourPrevue) < new Date()).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bibliothèque</h1>
        <p className="text-muted-foreground text-sm mt-1">Catalogue des livres, emprunts et retours</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Livres au catalogue', value: (livres as any[]).length, icon: Library, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Emprunts en cours', value: (emprunts as any[]).length, icon: BookOpen, color: 'bg-violet-500/10 text-violet-500' },
          { label: 'En retard', value: enRetard, icon: AlertTriangle, color: enRetard > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="catalogue">
        <TabsList>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="emprunts">Emprunts</TabsTrigger>
        </TabsList>
        <TabsContent value="catalogue" className="mt-4"><CatalogueTab /></TabsContent>
        <TabsContent value="emprunts" className="mt-4"><EmpruntsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
