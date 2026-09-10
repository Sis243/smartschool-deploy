'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Sun, Moon, Utensils, Plus, User, Baby, Search } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import api from '@/lib/api';

const COMPORTEMENTS = ['Calme', 'Agité', 'Sociable', 'Timide', 'Pleureur', 'Joyeux', 'Fatigué', 'Coopératif'];
const ACTIVITES_MAT = ['Dessin', 'Peinture', 'Puzzle', 'Lecture', 'Chant', 'Danse', 'Jeu libre', 'Modelage', 'Coloriage', 'Sport'];

const REPAS = ['Bien mangé', 'Peu mangé', 'Refusé de manger', 'Mangé la moitié'];

// ─── Dialog Suivi journalier ──────────────────────────────────────────────────
function SuiviDialog({ open, onClose, eleveId, eleveName }: { open: boolean; onClose: () => void; eleveId: string; eleveName: string }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today,
    aMangeQuoi: '',
    aFaitSieste: false,
    dureesSieste: '',
    comportement: '',
    activites: [] as string[],
    observations: '',
  });

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/maternelle/suivis', {
      eleveId,
      date: form.date,
      aMangeQuoi: form.aMangeQuoi,
      aFaitSieste: form.aFaitSieste,
      dureesSieste: form.dureesSieste ? Number(form.dureesSieste) : undefined,
      comportement: form.comportement,
      activites: form.activites,
      observations: form.observations,
    }),
    onSuccess: () => {
      toast.success(`Suivi de ${eleveName} enregistré`);
      qc.invalidateQueries({ queryKey: ['suivis-mat'] });
      onClose();
      setForm({ date: today, aMangeQuoi: '', aFaitSieste: false, dureesSieste: '', comportement: '', activites: [], observations: '' });
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Suivi journalier — {eleveName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>

          {/* Repas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-500" />Repas</Label>
            <div className="flex flex-wrap gap-2">
              {REPAS.map(r => (
                <button key={r} type="button"
                  onClick={() => setForm({ ...form, aMangeQuoi: form.aMangeQuoi === r ? '' : r })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${form.aMangeQuoi === r ? 'bg-orange-500 text-white border-orange-500' : 'border-border text-muted-foreground hover:border-orange-400'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Sieste */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
            <Moon className="w-4 h-4 text-indigo-500" />
            <div className="flex-1">
              <Label className="cursor-pointer">Sieste</Label>
            </div>
            <Switch
              checked={form.aFaitSieste}
              onCheckedChange={v => setForm({ ...form, aFaitSieste: v })}
            />
            {form.aFaitSieste && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="min"
                  className="w-20 h-8 text-sm"
                  value={form.dureesSieste}
                  onChange={e => setForm({ ...form, dureesSieste: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            )}
          </div>

          {/* Comportement */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Heart className="w-4 h-4 text-pink-500" />Comportement</Label>
            <div className="flex flex-wrap gap-2">
              {COMPORTEMENTS.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm({ ...form, comportement: form.comportement === c ? '' : c })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${form.comportement === c ? 'bg-pink-500 text-white border-pink-500' : 'border-border text-muted-foreground hover:border-pink-400'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Activités */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Sun className="w-4 h-4 text-yellow-500" />Activités réalisées</Label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITES_MAT.map(a => (
                <button key={a} type="button"
                  onClick={() => setForm({ ...form, activites: toggle(form.activites, a) })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${form.activites.includes(a) ? 'bg-yellow-500 text-white border-yellow-500' : 'border-border text-muted-foreground hover:border-yellow-400'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observations</Label>
            <textarea rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })}
              placeholder="Message pour les parents..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.date || mutation.isPending} className="bg-pink-600 hover:bg-pink-500">
            {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet Élèves ────────────────────────────────────────────────────────────
function ElevesTab({ onNewSuivi }: { onNewSuivi: (id: string, name: string) => void }) {
  const [search, setSearch] = useState('');
  const { data: elevesData = [], isLoading } = useQuery({
    queryKey: ['eleves-maternelle'],
    queryFn: async () => {
      try {
        return (await api.get('/api/v1/maternelle/eleves')).data.data ?? [];
      } catch {
        return (await api.get('/api/v1/eleves?limit=200')).data.data ?? [];
      }
    },
  });

  const elevesList = (elevesData as any[]).filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${e.prenom} ${e.nom} ${e.matricule} ${e.classe?.nom ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {(elevesData as any[]).length > 0 && (
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher un élève..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
      ) : elevesList.length === 0 ? (
        <Card className="col-span-full border-border/50 border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Baby className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {search ? <p>Aucun élève ne correspond à « {search} »</p> : (
              <>
                <p>Aucun élève de maternelle trouvé</p>
                <p className="text-xs mt-1">Créez des classes avec le niveau MATERNELLE dans le module Académique</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        elevesList.map(e => {
          const age = e.dateNaissance
            ? Math.floor((Date.now() - new Date(e.dateNaissance).getTime()) / (365.25 * 24 * 3600 * 1000))
            : null;
          return (
            <Card key={e.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-pink-100 text-pink-700 font-semibold">
                    {e.prenom?.[0]}{e.nom?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{e.prenom} {e.nom}</p>
                  <p className="text-xs text-muted-foreground">{e.classe?.nom ?? '—'}{age ? ` • ${age} ans` : ''}</p>
                  <p className="font-mono text-xs text-blue-600 dark:text-blue-400">{e.matricule}</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 h-8 px-2.5 gap-1 text-xs"
                  onClick={() => onNewSuivi(e.id, `${e.prenom} ${e.nom}`)}>
                  <Plus className="w-3 h-3" />Suivi
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}
      </div>
    </div>
  );
}

// ─── Onglet Journal ───────────────────────────────────────────────────────────
function JournalTab() {
  const today = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [search, setSearch] = useState('');

  const { data: suivisToutes = [], isLoading } = useQuery({
    queryKey: ['suivis-mat', dateFilter],
    queryFn: async () => (await api.get(`/api/v1/maternelle/suivis?date=${dateFilter}`)).data.data ?? [],
  });

  const suivisList = (suivisToutes as any[]).filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${s.eleve?.prenom} ${s.eleve?.nom}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-sm text-muted-foreground shrink-0">Date :</Label>
        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-44" />
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Rechercher un élève..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <span className="text-sm text-muted-foreground">{suivisList.length} suivi(s) ce jour</span>
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
      ) : suivisList.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-14 text-center text-muted-foreground">
            <Heart className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{search ? `Aucun suivi ne correspond à « ${search} »` : 'Aucun suivi enregistré pour cette date'}</p>
          </CardContent>
        </Card>
      ) : (
        suivisList.map((s: any) => (
          <Card key={s.id} className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-pink-100 text-pink-700 text-xs font-semibold">
                    {s.eleve?.prenom?.[0]}{s.eleve?.nom?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{s.eleve?.prenom} {s.eleve?.nom}</p>
                    {s.eleve?.classe?.nom && (
                      <Badge variant="secondary" className="text-xs">{s.eleve.classe.nom}</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {s.aMangeQuoi && (
                      <span className="flex items-center gap-1">
                        <Utensils className="w-3 h-3 text-orange-500" />{s.aMangeQuoi}
                      </span>
                    )}
                    {s.aFaitSieste !== undefined && (
                      <span className="flex items-center gap-1">
                        <Moon className="w-3 h-3 text-indigo-500" />
                        {s.aFaitSieste ? `Sieste${s.dureesSieste ? ` (${s.dureesSieste} min)` : ''}` : 'Pas de sieste'}
                      </span>
                    )}
                    {s.comportement && (
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-pink-500" />{s.comportement}
                      </span>
                    )}
                  </div>

                  {s.activites?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.activites.map((a: string) => (
                        <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{a}</span>
                      ))}
                    </div>
                  )}

                  {s.observations && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-pink-300 pl-2">{s.observations}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Vue principale ───────────────────────────────────────────────────────────
export function MaternelleView() {
  const [dialogState, setDialogState] = useState<{ open: boolean; eleveId: string; eleveName: string }>({
    open: false, eleveId: '', eleveName: '',
  });

  const { data: suivisAujourdhui = [] } = useQuery({
    queryKey: ['suivis-mat', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const date = new Date().toISOString().split('T')[0];
      return (await api.get(`/api/v1/maternelle/suivis?date=${date}`)).data.data ?? [];
    },
  });

  const { data: eleves = [] } = useQuery({
    queryKey: ['eleves-maternelle'],
    queryFn: async () => {
      try {
        return (await api.get('/api/v1/maternelle/eleves')).data.data ?? [];
      } catch {
        return (await api.get('/api/v1/eleves?limit=200')).data.data ?? [];
      }
    },
  });

  return (
    <div className="space-y-6">
      <SuiviDialog
        open={dialogState.open}
        onClose={() => setDialogState({ open: false, eleveId: '', eleveName: '' })}
        eleveId={dialogState.eleveId}
        eleveName={dialogState.eleveName}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maternelle</h1>
        <p className="text-muted-foreground text-sm mt-1">Suivi quotidien des tout-petits — repas, sieste, activités</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Élèves maternelle', value: (eleves as any[]).length, icon: Baby, color: 'bg-pink-500/10 text-pink-500' },
          { label: 'Suivis aujourd\'hui', value: (suivisAujourdhui as any[]).length, icon: Heart, color: 'bg-rose-500/10 text-rose-500' },
          { label: 'Activités proposées', value: ACTIVITES_MAT.length, icon: Sun, color: 'bg-yellow-500/10 text-yellow-500' },
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

      <Tabs defaultValue="eleves">
        <TabsList>
          <TabsTrigger value="eleves">Élèves</TabsTrigger>
          <TabsTrigger value="journal">Journal du jour</TabsTrigger>
        </TabsList>
        <TabsContent value="eleves" className="mt-4">
          <ElevesTab onNewSuivi={(id, name) => setDialogState({ open: true, eleveId: id, eleveName: name })} />
        </TabsContent>
        <TabsContent value="journal" className="mt-4">
          <JournalTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
