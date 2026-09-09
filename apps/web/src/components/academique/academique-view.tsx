'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, BookOpen, Clock, Users, Plus, Calendar, CheckCircle, FileText, UserCheck, TrendingUp, ScanFace, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { chargerModeles, extraireEmpreinte, trouverCorrespondance, EleveAvecVisage } from '@/lib/face-recognition';

const niveaux = ['MATERNELLE', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '1ère', '2ème', '3ème', '4ème', '5ème', '6ème', '7ème'];

// ─── Dialog Classe ────────────────────────────────────────────────────────────
function ClasseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [nom, setNom] = useState('');
  const [niveau, setNiveau] = useState('');
  const [capacite, setCapacite] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/academique/classes', { nom, niveau, effectifMax: capacite ? Number(capacite) : undefined }),
    onSuccess: () => { toast.success('Classe créée'); qc.invalidateQueries({ queryKey: ['classes'] }); onClose(); setNom(''); setNiveau(''); setCapacite(''); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de la création'),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouvelle classe</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Nom *</Label><Input placeholder="ex: 6ème A" value={nom} onChange={(e) => setNom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Niveau *</Label>
            <Select onValueChange={setNiveau}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
              <SelectContent>{niveaux.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Capacité</Label><Input type="number" placeholder="ex: 40" value={capacite} onChange={(e) => setCapacite(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!nom || !niveau || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">{mutation.isPending ? 'Création...' : 'Créer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Matière ───────────────────────────────────────────────────────────
function MatiereDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [coeff, setCoeff] = useState('1');
  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/academique/matieres', { nom, code, coefficient: Number(coeff) }),
    onSuccess: () => { toast.success('Matière créée'); qc.invalidateQueries({ queryKey: ['matieres'] }); onClose(); setNom(''); setCode(''); setCoeff('1'); },
    onError: () => toast.error('Erreur lors de la création'),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouvelle matière</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Nom *</Label><Input placeholder="ex: Mathématiques" value={nom} onChange={(e) => setNom(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Code</Label><Input placeholder="ex: MATH" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></div>
            <div className="space-y-1.5"><Label>Coefficient</Label><Input type="number" min="1" max="10" value={coeff} onChange={(e) => setCoeff(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!nom || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">{mutation.isPending ? 'Création...' : 'Créer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Année scolaire ────────────────────────────────────────────────────
function AnneeScolaireDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    libelle: `${currentYear}-${currentYear + 1}`,
    dateDebut: `${currentYear}-09-01`,
    dateFin: `${currentYear + 1}-07-31`,
  });
  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/academique/annee-scolaire', form),
    onSuccess: () => { toast.success('Année scolaire créée et activée'); qc.invalidateQueries({ queryKey: ['annees-scolaires'] }); qc.invalidateQueries({ queryKey: ['annee-active'] }); onClose(); },
    onError: () => toast.error('Erreur lors de la création'),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouvelle année scolaire</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">L'année créée sera automatiquement activée. L'ancienne sera désactivée.</p>
          <div className="space-y-1.5"><Label>Libellé *</Label><Input placeholder="ex: 2026-2027" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Début</Label><Input type="date" value={form.dateDebut} onChange={e => setForm({ ...form, dateDebut: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Fin</Label><Input type="date" value={form.dateFin} onChange={e => setForm({ ...form, dateFin: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.libelle || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">{mutation.isPending ? 'Création...' : 'Créer et activer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Période ───────────────────────────────────────────────────────────
function PeriodeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ libelle: '', dateDebut: '', dateFin: '', ordre: '1' });
  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/academique/periodes', { ...form, ordre: Number(form.ordre) }),
    onSuccess: () => { toast.success('Période créée'); qc.invalidateQueries({ queryKey: ['periodes'] }); onClose(); setForm({ libelle: '', dateDebut: '', dateFin: '', ordre: '1' }); },
    onError: () => toast.error('Erreur lors de la création'),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouvelle période</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>Libellé *</Label><Input placeholder="ex: 1er Trimestre" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Ordre</Label><Input type="number" min="1" value={form.ordre} onChange={e => setForm({ ...form, ordre: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Date début</Label><Input type="date" value={form.dateDebut} onChange={e => setForm({ ...form, dateDebut: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Date fin</Label><Input type="date" value={form.dateFin} onChange={e => setForm({ ...form, dateFin: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.libelle || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">{mutation.isPending ? 'Création...' : 'Créer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Examen ────────────────────────────────────────────────────────────
function ExamenDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ classeId: '', matiereId: '', periodeId: '', libelle: '', date: '', duree: '120', surNote: '20' });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: async () => (await api.get('/api/v1/academique/classes')).data.data });
  const { data: matieres = [] } = useQuery({ queryKey: ['matieres'], queryFn: async () => (await api.get('/api/v1/academique/matieres')).data.data });
  const { data: periodes = [] } = useQuery({ queryKey: ['periodes'], queryFn: async () => (await api.get('/api/v1/academique/periodes')).data.data });
  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/academique/examens', form),
    onSuccess: () => { toast.success('Examen programmé'); qc.invalidateQueries({ queryKey: ['examens'] }); onClose(); setForm({ classeId: '', matiereId: '', periodeId: '', libelle: '', date: '', duree: '120', surNote: '20' }); },
    onError: () => toast.error('Erreur lors de la création'),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Programmer un examen</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Libellé *</Label><Input placeholder="ex: Examen 1er Trimestre" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Classe *</Label>
              <Select onValueChange={v => setForm({ ...form, classeId: v })}><SelectTrigger><SelectValue placeholder="Classe" /></SelectTrigger>
                <SelectContent>{(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Matière *</Label>
              <Select onValueChange={v => setForm({ ...form, matiereId: v })}><SelectTrigger><SelectValue placeholder="Matière" /></SelectTrigger>
                <SelectContent>{(matieres as any[]).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Date *</Label><Input type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Période</Label>
              <Select onValueChange={v => setForm({ ...form, periodeId: v })}><SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>{(periodes as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.libelle}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Durée (min)</Label><Input type="number" value={form.duree} onChange={e => setForm({ ...form, duree: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Sur note</Label><Input type="number" value={form.surNote} onChange={e => setForm({ ...form, surNote: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.libelle || !form.classeId || !form.matiereId || !form.date || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">{mutation.isPending ? 'Programmation...' : 'Programmer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet Classes ───────────────────────────────────────────────────────────
function ClassesTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: classes = [], isLoading } = useQuery({ queryKey: ['classes'], queryFn: async () => (await api.get('/api/v1/academique/classes')).data.data });
  return (
    <>
      <ClasseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Classes ({(classes as any[]).length})</CardTitle>
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Nouvelle classe</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Nom</TableHead><TableHead>Niveau</TableHead><TableHead>Titulaire</TableHead><TableHead>Capacité</TableHead><TableHead>Élèves</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)
                : (classes as any[]).length === 0 ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground"><p>Aucune classe configurée</p><Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Créer</Button></TableCell></TableRow>
                : (classes as any[]).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.nom}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.niveau}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.titulaire ? `${c.titulaire.firstName} ${c.titulaire.lastName}` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.effectifMax ?? '—'}</TableCell>
                    <TableCell><div className="flex items-center gap-1.5 text-sm"><Users className="w-3.5 h-3.5 text-muted-foreground" />{c._count?.eleves ?? 0}</div></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Onglet Matières ──────────────────────────────────────────────────────────
function MatieresTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: matieres = [], isLoading } = useQuery({ queryKey: ['matieres'], queryFn: async () => (await api.get('/api/v1/academique/matieres')).data.data });
  return (
    <>
      <MatiereDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Matières ({(matieres as any[]).length})</CardTitle>
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Nouvelle matière</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Matière</TableHead><TableHead>Code</TableHead><TableHead>Coefficient</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 3 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)
                : (matieres as any[]).length === 0 ? <TableRow><TableCell colSpan={3} className="py-12 text-center text-muted-foreground"><p>Aucune matière</p><Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Ajouter</Button></TableCell></TableRow>
                : (matieres as any[]).map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nom}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{m.code || '—'}</Badge></TableCell>
                    <TableCell><span className="text-sm font-semibold text-blue-600 dark:text-blue-400">×{m.coefficient}</span></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Onglet Horaires ──────────────────────────────────────────────────────────
function HorairesTab() {
  const [classeId, setClasseId] = useState('');
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: async () => (await api.get('/api/v1/academique/classes')).data.data });
  const { data: horaires = [], isLoading } = useQuery({ queryKey: ['horaires', classeId], enabled: !!classeId, queryFn: async () => (await api.get(`/api/v1/academique/horaires/${classeId}`)).data.data });
  const jours = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
  const joursLabels: Record<string, string> = { LUNDI: 'Lundi', MARDI: 'Mardi', MERCREDI: 'Mercredi', JEUDI: 'Jeudi', VENDREDI: 'Vendredi', SAMEDI: 'Samedi' };
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="w-56">
          <Select onValueChange={setClasseId}><SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
            <SelectContent>{(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!classeId ? <div className="py-16 text-center text-muted-foreground"><Clock className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Sélectionnez une classe</p></div>
          : isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          : (horaires as any[]).length === 0 ? <div className="py-16 text-center text-muted-foreground"><Clock className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Aucun horaire configuré</p></div>
          : <div className="space-y-5">{jours.map(jour => { const items = (horaires as any[]).filter((h: any) => h.jourSemaine === jour); if (!items.length) return null; return (<div key={jour}><p className="text-sm font-semibold mb-2 text-muted-foreground">{joursLabels[jour]}</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{items.map((h: any) => (<div key={h.id} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3"><p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{h.matiere?.nom}</p><p className="text-xs text-muted-foreground mt-1">{h.heureDebut} – {h.heureFin}</p>{h.enseignant && <p className="text-xs text-muted-foreground">{h.enseignant.firstName} {h.enseignant.lastName}</p>}</div>))}</div><Separator className="mt-4" /></div>); })}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Onglet Année scolaire ────────────────────────────────────────────────────
function AnneeScolaireTab() {
  const qc = useQueryClient();
  const [anneeDialog, setAnneeDialog] = useState(false);
  const [periodeDialog, setPeriodeDialog] = useState(false);

  const { data: annees = [], isLoading: loadingAnnees } = useQuery({ queryKey: ['annees-scolaires'], queryFn: async () => (await api.get('/api/v1/academique/annees-scolaires')).data.data ?? [] });
  const { data: periodes = [], isLoading: loadingPeriodes } = useQuery({ queryKey: ['periodes'], queryFn: async () => (await api.get('/api/v1/academique/periodes')).data.data ?? [] });

  const activerPeriode = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/academique/periodes/${id}/activer`),
    onSuccess: () => { toast.success('Période activée'); qc.invalidateQueries({ queryKey: ['periodes'] }); },
  });

  const activerAnnee = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/academique/annees-scolaires/${id}/activer`),
    onSuccess: () => { toast.success('Année activée'); qc.invalidateQueries({ queryKey: ['annees-scolaires'] }); qc.invalidateQueries({ queryKey: ['annee-active'] }); },
  });

  const anneesList = annees as any[];
  const periodesList = periodes as any[];
  const anneeActive = anneesList.find((a: any) => a.isActive);

  return (
    <>
      <AnneeScolaireDialog open={anneeDialog} onClose={() => setAnneeDialog(false)} />
      <PeriodeDialog open={periodeDialog} onClose={() => setPeriodeDialog(false)} />

      <div className="space-y-5">
        {/* Années scolaires */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Années scolaires</CardTitle>
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setAnneeDialog(true)}><Plus className="w-4 h-4" />Nouvelle année</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Libellé</TableHead><TableHead>Début</TableHead><TableHead>Fin</TableHead><TableHead>Périodes</TableHead><TableHead>Classes</TableHead><TableHead>Statut</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {loadingAnnees ? Array.from({ length: 2 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)
                  : anneesList.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground"><Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Aucune année scolaire</p><Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setAnneeDialog(true)}><Plus className="w-4 h-4" />Créer la première année</Button></TableCell></TableRow>
                  : anneesList.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-semibold">{a.libelle}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(a.dateDebut).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(a.dateFin).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-muted-foreground">{a._count?.periodes ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground">{a._count?.classes ?? 0}</TableCell>
                      <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{a.isActive ? 'Active' : 'Inactive'}</span></TableCell>
                      <TableCell>{!a.isActive && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => activerAnnee.mutate(a.id)}>Activer</Button>}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Périodes */}
        {anneeActive && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Périodes — {anneeActive.libelle}</CardTitle>
                </div>
                <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setPeriodeDialog(true)}><Plus className="w-4 h-4" />Nouvelle période</Button>
              </div>
            </CardHeader>
            <CardContent className="mt-4">
              {loadingPeriodes ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                : periodesList.length === 0 ? <div className="py-10 text-center text-muted-foreground"><Clock className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Aucune période créée</p><Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setPeriodeDialog(true)}><Plus className="w-4 h-4" />Créer la 1ère période</Button></div>
                : <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {periodesList.map((p: any) => (
                    <div key={p.id} className={`p-4 rounded-lg border-2 transition-all ${p.isActive ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-border'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{p.libelle}</span>
                        {p.isActive ? <CheckCircle className="w-4 h-4 text-blue-600" /> : <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => activerPeriode.mutate(p.id)}>Activer</Button>}
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(p.dateDebut).toLocaleDateString('fr-FR')} → {new Date(p.dateFin).toLocaleDateString('fr-FR')}</p>
                      {p.isActive && <Badge className="text-xs mt-2 bg-blue-100 text-blue-700">En cours</Badge>}
                    </div>
                  ))}
                </div>
              }
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

// ─── Onglet Examens ───────────────────────────────────────────────────────────
function ExamensTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: examens = [], isLoading } = useQuery({ queryKey: ['examens'], queryFn: async () => (await api.get('/api/v1/academique/examens')).data.data ?? [] });
  return (
    <>
      <ExamenDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Examens ({(examens as any[]).length})</CardTitle>
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Programmer un examen</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Examen</TableHead><TableHead>Classe</TableHead><TableHead>Matière</TableHead><TableHead>Date</TableHead><TableHead>Durée</TableHead><TableHead>Sur</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)
                : (examens as any[]).length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Aucun examen programmé</p><Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Programmer</Button></TableCell></TableRow>
                : (examens as any[]).map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.libelle}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{e.classe?.nom}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{e.matiere?.nom}</TableCell>
                    <TableCell className="text-sm">{new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell className="text-muted-foreground">{e.duree ? `${e.duree} min` : '—'}</TableCell>
                    <TableCell className="font-semibold text-blue-600 dark:text-blue-400">/{e.surNote}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Onglet Présences ────────────────────────────────────────────────────────
const STATUTS = [
  { value: 'PRESENT', label: 'Présent', cls: 'bg-emerald-100 text-emerald-700' },
  { value: 'ABSENT',  label: 'Absent',  cls: 'bg-red-100 text-red-700' },
  { value: 'RETARD',  label: 'Retard',  cls: 'bg-orange-100 text-orange-700' },
  { value: 'EXCUSE',  label: 'Excusé',  cls: 'bg-blue-100 text-blue-700' },
];

// ─── Pointage facial ──────────────────────────────────────────────────────────
const COOLDOWN_MS = 60_000; // évite de repointer/renotifier le même élève en boucle

function PointageFacialTab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dernierPointageRef = useRef<Map<string, number>>(new Map());
  const enTraitementRef = useRef(false);

  const [classeId, setClasseId] = useState('');
  const [actif, setActif] = useState(false);
  const [pretModeles, setPretModeles] = useState(false);
  const [erreur, setErreur] = useState('');
  const [dernierePersonne, setDernierePersonne] = useState<{ eleve: EleveAvecVisage; heure: string } | null>(null);
  const [historique, setHistorique] = useState<{ eleve: EleveAvecVisage; heure: string }[]>([]);

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: async () => (await api.get('/api/v1/academique/classes')).data.data });

  const { data: eleves = [] } = useQuery({
    queryKey: ['eleves-visage', classeId],
    queryFn: async () => (await api.get(`/api/v1/eleves/avec-visage${classeId ? `?classeId=${classeId}` : ''}`)).data.data as EleveAvecVisage[],
    enabled: actif,
    refetchInterval: actif ? 5 * 60_000 : false,
  });

  const scanMutation = useMutation({
    mutationFn: (eleveId: string) => api.post('/api/v1/academique/presences/scan', { eleveId }),
  });

  useEffect(() => {
    if (!actif) return;
    let annule = false;

    chargerModeles().then(() => { if (!annule) setPretModeles(true); }).catch(() => setErreur('Impossible de charger le module de reconnaissance faciale'));

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (annule) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setErreur('Accès à la caméra refusé ou indisponible sur cet appareil'));

    return () => {
      annule = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setPretModeles(false);
    };
  }, [actif]);

  useEffect(() => {
    if (!actif || !pretModeles || eleves.length === 0) return;

    const intervalle = setInterval(async () => {
      if (enTraitementRef.current || !videoRef.current || !canvasRef.current) return;
      if (videoRef.current.readyState < 2) return;
      enTraitementRef.current = true;
      try {
        const canvas = canvasRef.current;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const empreinte = await extraireEmpreinte(canvas);
        if (!empreinte) return;

        const resultat = trouverCorrespondance(empreinte, eleves);
        if (!resultat) return;

        const derniereFois = dernierPointageRef.current.get(resultat.eleve.id) ?? 0;
        if (Date.now() - derniereFois < COOLDOWN_MS) return;
        dernierPointageRef.current.set(resultat.eleve.id, Date.now());

        const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        setDernierePersonne({ eleve: resultat.eleve, heure });
        setHistorique((prev) => [{ eleve: resultat.eleve, heure }, ...prev].slice(0, 15));

        scanMutation.mutate(resultat.eleve.id, {
          onError: () => toast.error(`Erreur lors du pointage de ${resultat.eleve.prenom} ${resultat.eleve.nom}`),
        });
      } finally {
        enTraitementRef.current = false;
      }
    }, 1500);

    return () => clearInterval(intervalle);
  }, [actif, pretModeles, eleves]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="border-border/50 shadow-sm lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Pointage par reconnaissance faciale</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={classeId} onValueChange={(v) => setClasseId(v === '_all' ? '' : v)} disabled={actif}>
                <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Toutes les classes</SelectItem>
                  {(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className={actif ? 'bg-red-600 hover:bg-red-500 gap-2' : 'bg-blue-600 hover:bg-blue-500 gap-2'}
                onClick={() => { setActif((a) => !a); setErreur(''); }}
              >
                <ScanFace className="w-4 h-4" />{actif ? 'Arrêter' : 'Démarrer le pointage'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!actif ? (
            <div className="aspect-video rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-2">
              <ScanFace className="w-8 h-8 opacity-30" />
              <p className="text-sm">Cliquez sur « Démarrer le pointage » pour activer la caméra</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                <canvas ref={canvasRef} className="hidden" />
                {!pretModeles && !erreur && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />Initialisation...
                  </div>
                )}
                {dernierePersonne && (
                  <div className="absolute bottom-3 left-3 right-3 bg-white/95 dark:bg-slate-900/95 rounded-lg p-3 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-bottom-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{dernierePersonne.eleve.prenom} {dernierePersonne.eleve.nom}</p>
                      <p className="text-xs text-muted-foreground">Pointé(e) à {dernierePersonne.heure} — parent notifié</p>
                    </div>
                  </div>
                )}
              </div>
              {erreur && <p className="text-xs text-red-500">{erreur}</p>}
              {eleves.length === 0 && pretModeles && !erreur && (
                <p className="text-xs text-muted-foreground">Aucun élève avec un visage enregistré {classeId ? 'dans cette classe' : ''} — enregistrez des visages depuis la liste des élèves.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Pointés récemment</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {historique.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucun pointage pour l'instant</p>
          ) : (
            historique.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                <span className="font-medium">{h.eleve.prenom} {h.eleve.nom}</span>
                <span className="text-xs text-muted-foreground">{h.heure}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PresencesTab() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [classeId, setClasseId] = useState('');
  const [date, setDate] = useState(today);
  const [statutsMap, setStatutsMap] = useState<Record<string, string>>({});

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: async () => (await api.get('/api/v1/academique/classes')).data.data });

  const { data: lignes = [], isLoading, isFetched } = useQuery({
    queryKey: ['presences', classeId, date],
    enabled: !!classeId && !!date,
    queryFn: async () => {
      const r = await api.get(`/api/v1/academique/presences?classeId=${classeId}&date=${date}`);
      const data = r.data.data as { eleve: any; presence: any }[];
      const map: Record<string, string> = {};
      data.forEach((l) => { map[l.eleve.id] = l.presence?.statut ?? 'PRESENT'; });
      setStatutsMap(map);
      return data;
    },
  });

  const sauvegarder = useMutation({
    mutationFn: () => {
      const presences = Object.entries(statutsMap).map(([eleveId, statut]) => ({ eleveId, statut }));
      return api.put('/api/v1/academique/presences', { presences, date });
    },
    onSuccess: () => { toast.success('Présences enregistrées'); qc.invalidateQueries({ queryKey: ['presences', classeId, date] }); },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const lignesArr = lignes as { eleve: any; presence: any }[];
  const presents = Object.values(statutsMap).filter((s) => s === 'PRESENT').length;
  const absents = Object.values(statutsMap).filter((s) => s === 'ABSENT').length;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <Select value={classeId} onValueChange={(v) => { setClasseId(v); setStatutsMap({}); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
              <SelectContent>{(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setStatutsMap({}); }} className="w-44 h-9 text-sm" />
          </div>
          {classeId && isFetched && (
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => sauvegarder.mutate()} disabled={sauvegarder.isPending}>
              <CheckCircle className="w-4 h-4" />{sauvegarder.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          )}
        </div>

        {classeId && isFetched && lignesArr.length > 0 && (
          <div className="flex gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium"><TrendingUp className="w-4 h-4" />{presents} présents</span>
            <span className="flex items-center gap-1.5 text-red-600 font-medium"><UserCheck className="w-4 h-4" />{absents} absents</span>
            <span className="text-muted-foreground">{lignesArr.length} élèves total</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0 mt-4">
        {!classeId ? (
          <div className="py-12 text-center text-muted-foreground border-t">
            <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Sélectionnez une classe pour marquer les présences</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : lignesArr.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border-t">Aucun élève actif dans cette classe</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Matricule</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignesArr.map(({ eleve }) => {
                const statut = statutsMap[eleve.id] ?? 'PRESENT';
                const cfg = STATUTS.find((s) => s.value === statut);
                return (
                  <TableRow key={eleve.id}>
                    <TableCell><span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{eleve.matricule}</span></TableCell>
                    <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg?.cls ?? ''}`}>{cfg?.label}</span>
                        <Select value={statut} onValueChange={(v) => setStatutsMap((prev) => ({ ...prev, [eleve.id]: v }))}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUTS.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Vue principale ───────────────────────────────────────────────────────────
export function AcademiqueView() {
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: async () => (await api.get('/api/v1/academique/classes')).data.data });
  const { data: matieres = [] } = useQuery({ queryKey: ['matieres'], queryFn: async () => (await api.get('/api/v1/academique/matieres')).data.data });
  const { data: annee } = useQuery({ queryKey: ['annee-active'], queryFn: async () => (await api.get('/api/v1/academique/annee-scolaire/active')).data.data });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Académique</h1>
          <p className="text-muted-foreground text-sm mt-1">Classes, matières, horaires, années scolaires et examens</p>
        </div>
        {annee && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Année : {(annee as any).libelle}</Badge>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Classes actives', value: (classes as any[]).length, icon: GraduationCap, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Matières', value: (matieres as any[]).length, icon: BookOpen, color: 'bg-violet-500/10 text-violet-500' },
          { label: 'Total élèves', value: (classes as any[]).reduce((s: number, c: any) => s + (c._count?.eleves ?? 0), 0), icon: Users, color: 'bg-emerald-500/10 text-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="classes">
        <TabsList>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="matieres">Matières</TabsTrigger>
          <TabsTrigger value="horaires">Horaires</TabsTrigger>
          <TabsTrigger value="annee">Année scolaire</TabsTrigger>
          <TabsTrigger value="examens">Examens</TabsTrigger>
          <TabsTrigger value="presences">Présences</TabsTrigger>
          <TabsTrigger value="pointage-facial" className="gap-1.5"><ScanFace className="w-3.5 h-3.5" />Pointage facial</TabsTrigger>
        </TabsList>
        <TabsContent value="classes" className="mt-4"><ClassesTab /></TabsContent>
        <TabsContent value="matieres" className="mt-4"><MatieresTab /></TabsContent>
        <TabsContent value="horaires" className="mt-4"><HorairesTab /></TabsContent>
        <TabsContent value="annee" className="mt-4"><AnneeScolaireTab /></TabsContent>
        <TabsContent value="examens" className="mt-4"><ExamensTab /></TabsContent>
        <TabsContent value="presences" className="mt-4"><PresencesTab /></TabsContent>
        <TabsContent value="pointage-facial" className="mt-4"><PointageFacialTab /></TabsContent>
      </Tabs>
    </div>
  );
}
