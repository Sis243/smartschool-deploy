'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, FileText, Award, Save, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';

const mentionConfig: Record<string, string> = {
  'Excellent':   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Très Bien':   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Bien':        'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'Assez Bien':  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Passable':    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Insuffisant': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function SaisieNotesTab() {
  const [classeId, setClasseId] = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [periodeId, setPeriodeId] = useState('');
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: async () => (await api.get('/api/v1/academique/classes')).data.data });
  const { data: matieres = [] } = useQuery({ queryKey: ['matieres'], queryFn: async () => (await api.get('/api/v1/academique/matieres')).data.data });
  const { data: periodes = [] } = useQuery({ queryKey: ['periodes'], queryFn: async () => (await api.get('/api/v1/academique/periodes')).data.data });

  // Tous les élèves de la classe (même sans notes)
  const { data: eleves = [], isLoading: elevesLoading } = useQuery({
    queryKey: ['eleves-classe', classeId],
    enabled: !!classeId,
    queryFn: async () => (await api.get(`/api/v1/eleves?classeId=${classeId}&limit=200`)).data.data ?? [],
  });

  // Notes existantes pour classe + période
  const { data: notesExistantes = [] } = useQuery({
    queryKey: ['notes-saisie', classeId, periodeId],
    enabled: !!classeId && !!periodeId,
    queryFn: async () => (await api.get(`/api/v1/notes/classe/${classeId}?periodeId=${periodeId}`)).data.data ?? [],
  });

  // Quand la matière change : pré-remplir notesMap depuis les notes existantes
  const handleMatiereChange = (newMatiereId: string) => {
    setMatiereId(newMatiereId);
    const map: Record<string, string> = {};
    (notesExistantes as any[])
      .filter((n: any) => n.matiereId === newMatiereId)
      .forEach((n: any) => { map[n.eleveId] = String(n.valeur ?? ''); });
    setNotesMap(map);
  };

  const saveNotes = useMutation({
    mutationFn: () => {
      const notes = Object.entries(notesMap)
        .filter(([, v]) => v !== '')
        .map(([eleveId, valeur]) => ({ eleveId, matiereId, periodeId, valeur: Number(valeur) }));
      return api.post('/api/v1/notes/encoder', { notes });
    },
    onSuccess: () => {
      toast.success('Notes enregistrées');
      qc.invalidateQueries({ queryKey: ['notes-saisie', classeId, periodeId] });
      qc.invalidateQueries({ queryKey: ['rapport-classe'] });
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const elevesArr = eleves as any[];
  const ready = classeId && matiereId && periodeId;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Saisie des notes</CardTitle>
          {ready && elevesArr.length > 0 && (
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>
              <Save className="w-4 h-4" />{saveNotes.isPending ? 'Enregistrement...' : `Enregistrer (${Object.values(notesMap).filter(Boolean).length} notes)`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Classe *</label>
            <Select onValueChange={(v) => { setClasseId(v); setMatiereId(''); setNotesMap({}); }}>
              <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
              <SelectContent>{(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Période *</label>
            <Select onValueChange={(v) => { setPeriodeId(v); setNotesMap({}); }}>
              <SelectTrigger><SelectValue placeholder="Choisir une période" /></SelectTrigger>
              <SelectContent>{(periodes as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.libelle}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Matière *</label>
            <Select value={matiereId} onValueChange={handleMatiereChange}>
              <SelectTrigger><SelectValue placeholder="Choisir une matière" /></SelectTrigger>
              <SelectContent>{(matieres as any[]).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nom} (×{m.coefficient})</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {!ready ? (
          <div className="border border-dashed border-border rounded-lg py-12 text-center text-sm text-muted-foreground">
            Sélectionnez une classe, une période et une matière pour commencer
          </div>
        ) : elevesLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Matricule</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead className="w-36">Note /20</TableHead>
                <TableHead className="w-16 text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elevesArr.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                  Aucun élève actif dans cette classe
                </TableCell></TableRow>
              ) : elevesArr.map((eleve: any) => {
                const val = notesMap[eleve.id] ?? '';
                const hasNote = val !== '';
                return (
                  <TableRow key={eleve.id}>
                    <TableCell><span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{eleve.matricule}</span></TableCell>
                    <TableCell className="font-medium">{eleve.prenom} {eleve.nom}</TableCell>
                    <TableCell>
                      <Input
                        type="number" min="0" max="20" step="0.25"
                        className="w-28 h-8 text-sm"
                        value={val}
                        onChange={(e) => setNotesMap((prev) => ({ ...prev, [eleve.id]: e.target.value }))}
                        placeholder="—"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {hasNote && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Note saisie" />}
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

function BulletinsTab() {
  const [classeId, setClasseId] = useState('');
  const [periodeId, setPeriodeId] = useState('');

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: async () => (await api.get('/api/v1/academique/classes')).data.data });
  const { data: periodes = [] } = useQuery({ queryKey: ['periodes'], queryFn: async () => (await api.get('/api/v1/academique/periodes')).data.data });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes-bulletins', classeId, periodeId],
    enabled: !!classeId && !!periodeId,
    queryFn: async () => (await api.get(`/api/v1/notes/classe/${classeId}?periodeId=${periodeId}`)).data.data,
  });

  // Agréger les notes par élève
  const elevesMap: Record<string, any> = {};
  (notes as any[]).forEach((n: any) => {
    if (!elevesMap[n.eleveId]) elevesMap[n.eleveId] = { eleve: n.eleve, notes: [], total: 0, coeff: 0 };
    elevesMap[n.eleveId].notes.push(n);
    elevesMap[n.eleveId].total += (n.valeur ?? 0) * (n.matiere?.coefficient ?? 1);
    elevesMap[n.eleveId].coeff += (n.matiere?.coefficient ?? 1);
  });
  const bulletins = Object.values(elevesMap).map((e: any) => ({
    ...e,
    moyenne: e.coeff > 0 ? e.total / e.coeff : 0,
  })).sort((a, b) => b.moyenne - a.moyenne).map((e, i) => ({ ...e, rang: i + 1 }));

  const getMention = (moy: number) => {
    if (moy >= 18) return 'Excellent';
    if (moy >= 16) return 'Très Bien';
    if (moy >= 14) return 'Bien';
    if (moy >= 12) return 'Assez Bien';
    if (moy >= 10) return 'Passable';
    return 'Insuffisant';
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3">
            <Select onValueChange={setClasseId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Classe" /></SelectTrigger>
              <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
            </Select>
            <Select onValueChange={setPeriodeId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Période" /></SelectTrigger>
              <SelectContent>{periodes.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.libelle ?? `Période ${p.numero}`}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {bulletins.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" />Exporter bulletins</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 mt-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Rang</TableHead><TableHead>Élève</TableHead>
              <TableHead>Moyenne</TableHead><TableHead>Mention</TableHead>
              <TableHead>Bulletin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!classeId || !periodeId ? (
              <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Sélectionnez une classe et une période</TableCell></TableRow>
            ) : isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)
            ) : bulletins.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Aucune note disponible pour cette sélection</TableCell></TableRow>
            ) : (
              bulletins.map((b: any) => {
                const mention = getMention(b.moyenne);
                return (
                  <TableRow key={b.eleve?.id}>
                    <TableCell><span className="font-bold text-lg text-muted-foreground">#{b.rang}</span></TableCell>
                    <TableCell className="font-medium">{b.eleve?.prenom} {b.eleve?.nom}</TableCell>
                    <TableCell><span className="text-lg font-bold">{b.moyenne.toFixed(2)}</span><span className="text-muted-foreground text-sm">/20</span></TableCell>
                    <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mentionConfig[mention] ?? ''}`}>{mention}</span></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" />PDF</Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function NotesView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notes & Bulletins</h1>
        <p className="text-muted-foreground text-sm mt-1">Encodage des notes et génération des bulletins scolaires</p>
      </div>
      <Tabs defaultValue="saisie">
        <TabsList>
          <TabsTrigger value="saisie">Saisie des notes</TabsTrigger>
          <TabsTrigger value="bulletins">Bulletins</TabsTrigger>
        </TabsList>
        <TabsContent value="saisie" className="mt-4"><SaisieNotesTab /></TabsContent>
        <TabsContent value="bulletins" className="mt-4"><BulletinsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
