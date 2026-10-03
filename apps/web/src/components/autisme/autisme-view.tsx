'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Heart, Calendar, Plus, Clock, CheckCircle, XCircle, Activity, User, ImagePlus, Trash2, ListChecks, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';

const humeurConfig: Record<string, { label: string; color: string }> = {
  CALME:   { label: 'Calme',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  AGITE:   { label: 'Agité',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  ANXIEUX: { label: 'Anxieux', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  HEUREUX: { label: 'Heureux', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  TRISTE:  { label: 'Triste',  color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

const therapieTypeConfig: Record<string, string> = {
  ORTHOPHONIE:    'Orthophonie',
  PSYCHOMOTRICITE:'Psychomotricité',
  ERGOTHERAPIE:   'Ergothérapie',
  ABA:            'ABA',
  PSYCHOLOGIE:    'Psychologie',
  AUTRE:          'Autre',
};

const statutTherapieConfig: Record<string, { label: string; cls: string }> = {
  PLANIFIE: { label: 'Planifié', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  REALISE:  { label: 'Réalisé',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ANNULE:   { label: 'Annulé',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const COMPORTEMENTS = ['Automutilation', 'Crise', 'Répétition', 'Isolement', 'Communication', 'Coopération', 'Calme prolongé', 'Stéréotypie'];
const ACTIVITES = ['Pictogrammes', 'ABA', 'Jeu libre', 'Jeu structuré', 'Peinture', 'Musique', 'Motricité', 'Lecture', 'Puzzle', 'Comptage'];

// ─── Dialog Suivi ─────────────────────────────────────────────────────────────
function SuiviDialog({ open, onClose, eleveId }: { open: boolean; onClose: () => void; eleveId: string }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today,
    humeur: '',
    comportements: [] as string[],
    activitesRealisees: [] as string[],
    observations: '',
  });

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/autisme/suivi-comportemental', { ...form, eleveId }),
    onSuccess: () => {
      toast.success('Suivi enregistré');
      qc.invalidateQueries({ queryKey: ['suivi', eleveId] });
      onClose();
      setForm({ date: today, humeur: '', comportements: [], activitesRealisees: [], observations: '' });
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouveau suivi comportemental</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Humeur</Label>
              <Select onValueChange={v => setForm({ ...form, humeur: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(humeurConfig).map(([k, { label }]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comportements observés</Label>
            <div className="flex flex-wrap gap-2">
              {COMPORTEMENTS.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm({ ...form, comportements: toggle(form.comportements, c) })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${form.comportements.includes(c) ? 'bg-violet-600 text-white border-violet-600' : 'border-border text-muted-foreground hover:border-violet-400'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Activités réalisées</Label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITES.map(a => (
                <button key={a} type="button"
                  onClick={() => setForm({ ...form, activitesRealisees: toggle(form.activitesRealisees, a) })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${form.activitesRealisees.includes(a) ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-muted-foreground hover:border-blue-400'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observations</Label>
            <textarea rows={3} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })}
              placeholder="Notes libres sur la séance..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.date || mutation.isPending} className="bg-violet-600 hover:bg-violet-500">
            {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Thérapie ──────────────────────────────────────────────────────────
function TherapieDialog({ open, onClose, eleveId }: { open: boolean; onClose: () => void; eleveId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: '', dateSeance: '', duree: '60', objectifs: '' });

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/autisme/therapies', {
      eleveId,
      type: form.type,
      dateSeance: form.dateSeance,
      duree: Number(form.duree),
      objectifs: form.objectifs,
    }),
    onSuccess: () => {
      toast.success('Séance planifiée');
      qc.invalidateQueries({ queryKey: ['therapies', eleveId] });
      onClose();
      setForm({ type: '', dateSeance: '', duree: '60', objectifs: '' });
    },
    onError: () => toast.error('Erreur lors de la planification'),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Planifier une séance de thérapie</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Type de thérapie *</Label>
            <Select onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir le type" /></SelectTrigger>
              <SelectContent>
                {Object.entries(therapieTypeConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date & heure *</Label>
              <Input type="datetime-local" value={form.dateSeance} onChange={e => setForm({ ...form, dateSeance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Durée (min)</Label>
              <Input type="number" value={form.duree} onChange={e => setForm({ ...form, duree: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Objectifs</Label>
            <textarea rows={3} value={form.objectifs} onChange={e => setForm({ ...form, objectifs: e.target.value })}
              placeholder="Objectifs de la séance..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.type || !form.dateSeance || mutation.isPending} className="bg-violet-600 hover:bg-violet-500">
            {mutation.isPending ? 'Planification...' : 'Planifier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet Suivi comportemental ──────────────────────────────────────────────
function SuiviTab({ eleveId }: { eleveId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: suivis = [], isLoading } = useQuery({
    queryKey: ['suivi', eleveId],
    enabled: !!eleveId,
    queryFn: async () => (await api.get(`/api/v1/autisme/eleves/${eleveId}/suivi-comportemental`)).data.data,
  });

  if (!eleveId) return (
    <Card className="border-border/50 border-dashed">
      <CardContent className="py-16 text-center text-muted-foreground">
        <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>Sélectionnez un élève pour voir son suivi</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <SuiviDialog open={dialogOpen} onClose={() => setDialogOpen(false)} eleveId={eleveId} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Historique du suivi</CardTitle>
            <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-500" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />Nouveau suivi
            </Button>
          </div>
        </CardHeader>
        <CardContent className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : (suivis as any[]).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Aucun suivi enregistré pour cet élève</p>
              <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />Premier suivi
              </Button>
            </div>
          ) : (suivis as any[]).map((s: any) => {
            const h = humeurConfig[s.humeur] ?? { label: s.humeur, color: '' };
            return (
              <div key={s.id} className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  {s.humeur && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${h.color}`}>{h.label}</span>}
                </div>
                {s.comportements?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.comportements.map((c: string) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">{c}</span>
                    ))}
                  </div>
                )}
                {s.activitesRealisees?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.activitesRealisees.map((a: string) => (
                      <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{a}</span>
                    ))}
                  </div>
                )}
                {s.observations && <p className="text-xs text-muted-foreground italic">{s.observations}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}

// ─── Onglet Thérapies ─────────────────────────────────────────────────────────
function TherapiesTab({ eleveId }: { eleveId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: therapies = [], isLoading } = useQuery({
    queryKey: ['therapies', eleveId],
    enabled: !!eleveId,
    queryFn: async () => (await api.get(`/api/v1/autisme/eleves/${eleveId}/therapies`)).data.data,
  });

  if (!eleveId) return (
    <Card className="border-border/50 border-dashed">
      <CardContent className="py-16 text-center text-muted-foreground">
        <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>Sélectionnez un élève pour voir ses thérapies</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <TherapieDialog open={dialogOpen} onClose={() => setDialogOpen(false)} eleveId={eleveId} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Séances de thérapie</CardTitle>
            <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-500" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />Planifier une séance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Thérapeute</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : (therapies as any[]).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    <p>Aucune séance planifiée</p>
                    <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setDialogOpen(true)}>
                      <Plus className="w-4 h-4" />Planifier
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (therapies as any[]).map((t: any) => {
                const s = statutTherapieConfig[t.statut] ?? { label: t.statut, cls: '' };
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{therapieTypeConfig[t.type] ?? t.type}</TableCell>
                    <TableCell>{new Date(t.dateSeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell className="text-muted-foreground">{t.duree ? `${t.duree} min` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.therapeute ? `${t.therapeute.firstName} ${t.therapeute.lastName}` : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Dialog Pictogramme ───────────────────────────────────────────────────────
function PictogrammeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [categorie, setCategorie] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');

  const reset = () => { setLabel(''); setCategorie(''); setFile(null); setPreview(''); };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Image requise');
      const fd = new FormData();
      fd.append('file', file);
      const up = await api.post('/api/v1/uploads/pictogramme', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return api.post('/api/v1/autisme/pictogrammes', {
        label,
        imageUrl: up.data.data.url,
        categorie: categorie || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Pictogramme ajouté');
      qc.invalidateQueries({ queryKey: ['pictogrammes'] });
      onClose();
      reset();
    },
    onError: () => toast.error('Erreur lors de l\'ajout du pictogramme'),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouveau pictogramme</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Image *</Label>
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-lg h-32 cursor-pointer hover:border-violet-400 transition-colors overflow-hidden">
              {preview ? (
                <img src={preview} alt="Aperçu" className="h-full w-full object-contain" />
              ) : (
                <>
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Choisir une image</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setFile(f);
                  setPreview(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Libellé *</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Boire" />
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <Select value={categorie} onValueChange={setCategorie}>
              <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
              <SelectContent>
                {['ACTIONS', 'EMOTIONS', 'ALIMENTS', 'OBJETS', 'LIEUX'].map(c => (
                  <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!label || !file || mutation.isPending}
            className="bg-violet-600 hover:bg-violet-500"
          >
            {mutation.isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet Pictogrammes ──────────────────────────────────────────────────────
function PictogrammesTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categorieFiltre, setCategorieFiltre] = useState('');

  const { data: pictogrammes = [], isLoading } = useQuery({
    queryKey: ['pictogrammes', categorieFiltre],
    queryFn: async () =>
      (await api.get(`/api/v1/autisme/pictogrammes${categorieFiltre ? `?categorie=${categorieFiltre}` : ''}`)).data.data,
  });

  const supprimer = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/autisme/pictogrammes/${id}`),
    onSuccess: () => { toast.success('Pictogramme supprimé'); qc.invalidateQueries({ queryKey: ['pictogrammes'] }); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const liste = pictogrammes as any[];

  return (
    <>
      <PictogrammeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Catalogue de pictogrammes</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={categorieFiltre} onValueChange={(v) => setCategorieFiltre(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Toutes catégories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Toutes catégories</SelectItem>
                  {['ACTIONS', 'EMOTIONS', 'ALIMENTS', 'OBJETS', 'LIEUX'].map(c => (
                    <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-500" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />Ajouter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : liste.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Aucun pictogramme {categorieFiltre ? 'dans cette catégorie' : 'dans le catalogue'}</p>
              <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />Ajouter le premier
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {liste.map((p: any) => (
                <div key={p.id} className="group relative rounded-lg border border-border/60 bg-muted/20 p-2 flex flex-col items-center gap-1.5">
                  <img src={p.imageUrl} alt={p.label} className="h-16 w-16 object-contain rounded" />
                  <span className="text-xs font-medium text-center line-clamp-1">{p.label}</span>
                  {p.categorie && <span className="text-[10px] text-muted-foreground">{p.categorie}</span>}
                  {p.tenantId !== 'GLOBAL' && (
                    <button
                      type="button"
                      onClick={() => supprimer.mutate(p.id)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-background/90 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ─── Dialog Routine ───────────────────────────────────────────────────────────
function RoutineDialog({ open, onClose, eleveId }: { open: boolean; onClose: () => void; eleveId: string }) {
  const qc = useQueryClient();
  const [nom, setNom] = useState('');
  const [etapes, setEtapes] = useState<{ description: string; duree: string; pictogrammeUrl: string }[]>([
    { description: '', duree: '', pictogrammeUrl: '' },
  ]);

  const { data: pictogrammes = [] } = useQuery({
    queryKey: ['pictogrammes', ''],
    queryFn: async () => (await api.get('/api/v1/autisme/pictogrammes')).data.data,
    enabled: open,
  });

  const reset = () => { setNom(''); setEtapes([{ description: '', duree: '', pictogrammeUrl: '' }]); };

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/api/v1/autisme/routines', {
        eleveId,
        nom,
        etapes: etapes
          .filter(e => e.description.trim())
          .map((e, i) => ({
            ordre: i + 1,
            description: e.description,
            duree: e.duree ? Number(e.duree) : undefined,
            pictogrammeUrl: e.pictogrammeUrl || undefined,
          })),
      }),
    onSuccess: () => {
      toast.success('Routine créée');
      qc.invalidateQueries({ queryKey: ['routines', eleveId] });
      onClose();
      reset();
    },
    onError: () => toast.error('Erreur lors de la création de la routine'),
  });

  const etapesValides = etapes.filter(e => e.description.trim()).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvelle routine personnalisée</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nom de la routine *</Label>
            <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Routine du matin" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Étapes *</Label>
              <Button
                type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs"
                onClick={() => setEtapes([...etapes, { description: '', duree: '', pictogrammeUrl: '' }])}
              >
                <Plus className="w-3 h-3" />Étape
              </Button>
            </div>
            {etapes.map((etape, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/60 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-violet-600 w-5">{i + 1}.</span>
                  <Input
                    value={etape.description}
                    onChange={e => setEtapes(etapes.map((et, j) => j === i ? { ...et, description: e.target.value } : et))}
                    placeholder="Description de l'étape"
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"
                    disabled={i === 0}
                    onClick={() => {
                      const copy = [...etapes];
                      [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                      setEtapes(copy);
                    }}
                  ><ArrowUp className="w-3.5 h-3.5" /></Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"
                    disabled={i === etapes.length - 1}
                    onClick={() => {
                      const copy = [...etapes];
                      [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
                      setEtapes(copy);
                    }}
                  ><ArrowDown className="w-3.5 h-3.5" /></Button>
                  {etapes.length > 1 && (
                    <Button
                      type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-red-500"
                      onClick={() => setEtapes(etapes.filter((_, j) => j !== i))}
                    ><Trash2 className="w-3.5 h-3.5" /></Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pl-7">
                  <Input
                    type="number"
                    value={etape.duree}
                    onChange={e => setEtapes(etapes.map((et, j) => j === i ? { ...et, duree: e.target.value } : et))}
                    placeholder="Durée (secondes)"
                    className="h-8 text-xs"
                  />
                  <Select
                    value={etape.pictogrammeUrl}
                    onValueChange={(v) => setEtapes(etapes.map((et, j) => j === i ? { ...et, pictogrammeUrl: v } : et))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pictogramme (optionnel)" /></SelectTrigger>
                    <SelectContent>
                      {(pictogrammes as any[]).map((p: any) => (
                        <SelectItem key={p.id} value={p.imageUrl} className="text-xs">{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!nom || etapesValides === 0 || mutation.isPending}
            className="bg-violet-600 hover:bg-violet-500"
          >
            {mutation.isPending ? 'Création...' : 'Créer la routine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet Routines ──────────────────────────────────────────────────────────
function RoutinesTab({ eleveId }: { eleveId: string }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['routines', eleveId],
    enabled: !!eleveId,
    queryFn: async () => (await api.get(`/api/v1/autisme/eleves/${eleveId}/routines`)).data.data,
  });

  const desactiver = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/autisme/routines/${id}`, { isActive: false }),
    onSuccess: () => { toast.success('Routine désactivée'); qc.invalidateQueries({ queryKey: ['routines', eleveId] }); },
    onError: () => toast.error('Erreur'),
  });

  const supprimer = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/autisme/routines/${id}`),
    onSuccess: () => { toast.success('Routine supprimée'); qc.invalidateQueries({ queryKey: ['routines', eleveId] }); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  if (!eleveId) return (
    <Card className="border-border/50 border-dashed">
      <CardContent className="py-16 text-center text-muted-foreground">
        <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>Sélectionnez un élève pour voir ses routines</p>
      </CardContent>
    </Card>
  );

  const liste = routines as any[];

  return (
    <>
      <RoutineDialog open={dialogOpen} onClose={() => setDialogOpen(false)} eleveId={eleveId} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Routines personnalisées</CardTitle>
            <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-500" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />Nouvelle routine
            </Button>
          </div>
        </CardHeader>
        <CardContent className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : liste.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Aucune routine pour cet élève</p>
              <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />Créer la première
              </Button>
            </div>
          ) : liste.map((r: any) => (
            <div key={r.id} className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{r.nom}</span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => desactiver.mutate(r.id)}>
                    Désactiver
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => supprimer.mutate(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(r.etapes ?? []).map((e: any) => (
                  <div key={e.id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                    {e.pictogrammeUrl && <img src={e.pictogrammeUrl} alt="" className="w-4 h-4 object-contain" />}
                    <span>{e.ordre}. {e.description}{e.duree ? ` (${e.duree}s)` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

// ─── Vue principale ───────────────────────────────────────────────────────────
export function AutismeView() {
  const [selectedEleveId, setSelectedEleveId] = useState('');
  const [searchEleve, setSearchEleve] = useState('');

  const { data: eleves = [], isLoading: loadingEleves } = useQuery({
    queryKey: ['eleves-mini'],
    queryFn: async () => (await api.get('/api/v1/eleves?limit=200')).data.data ?? [],
  });

  const elevesList = eleves as any[];
  const elevesFiltres = elevesList.filter((e) => {
    const q = searchEleve.trim().toLowerCase();
    if (!q) return true;
    return `${e.prenom} ${e.nom} ${e.matricule}`.toLowerCase().includes(q);
  });
  const selectedEleve = elevesList.find(e => e.id === selectedEleveId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Module Autisme</h1>
            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-xs">Spécialisé</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Suivi comportemental, thérapies et routines personnalisées</p>
        </div>
      </div>

      {/* Sélecteur d'élève */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-violet-500" />
            </div>
            <div className="flex-1 max-w-sm">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Élève suivi</Label>
              <Select onValueChange={setSelectedEleveId} value={selectedEleveId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un élève..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
                    <Input
                      placeholder="Rechercher un élève..."
                      value={searchEleve}
                      onChange={(e) => setSearchEleve(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-8 text-sm"
                    />
                  </div>
                  {loadingEleves ? (
                    <SelectItem value="_" disabled>Chargement...</SelectItem>
                  ) : elevesFiltres.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">Aucun élève trouvé</div>
                  ) : elevesFiltres.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.prenom} {e.nom} — {e.matricule}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEleve && (
              <div className="flex items-center gap-2 ml-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-violet-100 text-violet-700">
                    {selectedEleve.prenom?.[0]}{selectedEleve.nom?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{selectedEleve.prenom} {selectedEleve.nom}</p>
                  <p className="text-xs text-muted-foreground">{selectedEleve.classe?.nom ?? 'Sans classe'}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="suivi">
        <TabsList>
          <TabsTrigger value="suivi">Suivi comportemental</TabsTrigger>
          <TabsTrigger value="therapies">Thérapies</TabsTrigger>
          <TabsTrigger value="routines">Routines</TabsTrigger>
          <TabsTrigger value="pictogrammes">Pictogrammes</TabsTrigger>
        </TabsList>
        <TabsContent value="suivi" className="mt-4">
          <SuiviTab eleveId={selectedEleveId} />
        </TabsContent>
        <TabsContent value="therapies" className="mt-4">
          <TherapiesTab eleveId={selectedEleveId} />
        </TabsContent>
        <TabsContent value="routines" className="mt-4">
          <RoutinesTab eleveId={selectedEleveId} />
        </TabsContent>
        <TabsContent value="pictogrammes" className="mt-4">
          <PictogrammesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
