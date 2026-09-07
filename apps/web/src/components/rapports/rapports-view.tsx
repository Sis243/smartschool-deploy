'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  FileText, Download, Printer, Users, BookOpen, DollarSign, GraduationCap,
  TrendingUp, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── helpers ────────────────────────────────────────────────────────────────

function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.join(';'), ...rows.map((r) => r.join(';'))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getMentionColor(moyenne: number) {
  if (moyenne >= 80) return 'bg-emerald-100 text-emerald-800';
  if (moyenne >= 60) return 'bg-blue-100 text-blue-800';
  if (moyenne >= 50) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

// Hook partagé pour éviter la duplication
function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/api/v1/academique/classes').then((r) => r.data.data as any[]),
  });
}
function usePeriodes() {
  return useQuery({
    queryKey: ['periodes'],
    queryFn: () => api.get('/api/v1/academique/periodes').then((r) => r.data.data as any[]),
  });
}

// ─── Rapport Bulletins ───────────────────────────────────────────────────────

function BulletinsReport() {
  const [classeId, setClasseId] = useState('');
  const [periodeId, setPeriodeId] = useState('');
  const [generated, setGenerated] = useState(false);

  const { data: classes = [] } = useClasses();
  const { data: periodes = [] } = usePeriodes();

  const { data: rapport, isLoading } = useQuery({
    queryKey: ['rapport-classe', classeId, periodeId],
    queryFn: () =>
      api
        .get(`/api/v1/notes/rapport/classe/${classeId}?periodeId=${periodeId}`)
        .then((r) => r.data.data as { classe: any; periode: any; bulletins: any[] }),
    enabled: generated && !!classeId && !!periodeId,
  });

  const handleExportCSV = () => {
    if (!rapport) return;
    const headers = ['Matricule', 'Nom', 'Prénom', 'Moyenne', 'Mention'];
    const rows = rapport.bulletins.map((b: any) => [
      b.eleve.matricule,
      b.eleve.nom,
      b.eleve.prenom,
      b.moyenne.toFixed(2),
      b.mention,
    ]);
    exportCSV(`bulletins_${rapport.classe?.nom}_${rapport.periode?.libelle}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            Générer les bulletins de classe
          </CardTitle>
          <CardDescription>Sélectionnez une classe et une période pour afficher les moyennes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Classe</label>
              <Select value={classeId} onValueChange={(v) => { setClasseId(v); setGenerated(false); }}>
                <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Période</label>
              <Select value={periodeId} onValueChange={(v) => { setPeriodeId(v); setGenerated(false); }}>
                <SelectTrigger><SelectValue placeholder="Choisir une période" /></SelectTrigger>
                <SelectContent>
                  {periodes.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.libelle}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setGenerated(true)} disabled={!classeId || !periodeId} className="gap-2">
              <FileText className="w-4 h-4" />
              Générer
            </Button>
          </div>
        </CardContent>
      </Card>

      {generated && isLoading && (
        <div className="text-center py-12 text-muted-foreground">Chargement du rapport…</div>
      )}

      {rapport && (
        <Card className="print:shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {rapport.classe?.nom} — {rapport.periode?.libelle}
                </CardTitle>
                <CardDescription>{rapport.bulletins?.length} élèves</CardDescription>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
                  <Download className="w-3.5 h-3.5" />CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" />Imprimer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Matricule</TableHead>
                  <TableHead>Nom complet</TableHead>
                  <TableHead className="text-right">Moyenne</TableHead>
                  <TableHead>Mention</TableHead>
                  <TableHead className="text-right">Nb matières</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rapport.bulletins?.map((b: any) => (
                  <TableRow key={b.eleve.id}>
                    <TableCell className="font-mono text-xs">{b.eleve.matricule}</TableCell>
                    <TableCell className="font-medium">{b.eleve.nom} {b.eleve.prenom}</TableCell>
                    <TableCell className="text-right font-semibold">{b.moyenne.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getMentionColor(b.moyenne)}`}>
                        {b.mention}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{b.notes?.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rapport.bulletins?.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                Aucune note encodée pour cette classe et cette période.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Rapport Élèves ──────────────────────────────────────────────────────────

function ElevesReport() {
  const [classeId, setClasseId] = useState('all');
  const { data: classes = [] } = useClasses();

  const { data: eleves = [], isLoading } = useQuery({
    queryKey: ['eleves-rapport', classeId],
    queryFn: () =>
      api
        .get(`/api/v1/eleves?limit=500${classeId !== 'all' ? `&classeId=${classeId}` : ''}`)
        // interceptor extracts {data:[...],meta:{}} → outputs {success,data:[...],meta:{}}
        // then r.data.data gives the array directly
        .then((r) => r.data.data as any[]),
  });

  const handleExportCSV = () => {
    const headers = ['Matricule', 'Nom', 'Prénom', 'Classe', 'Date naissance', 'Parent', 'Téléphone'];
    const rows = eleves.map((e: any) => [
      e.matricule,
      e.nom,
      e.prenom,
      e.classe?.nom ?? '',
      e.dateNaissance ? format(new Date(e.dateNaissance), 'dd/MM/yyyy') : '',
      e.parent?.nom ?? '',
      e.parent?.telephone ?? '',
    ]);
    exportCSV(`liste_eleves_${classeId === 'all' ? 'tous' : classeId}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            Liste des élèves
          </CardTitle>
          <CardDescription>Exportez la liste complète ou filtrée par classe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Filtrer par classe</label>
              <Select value={classeId} onValueChange={setClasseId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleExportCSV} disabled={isLoading}>
              <Download className="w-4 h-4" />Exporter CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={isLoading}>
              <Printer className="w-4 h-4" />Imprimer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Résultats</CardTitle>
          <CardDescription>{isLoading ? '…' : `${eleves.length} élèves`}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Matricule</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Date naissance</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Téléphone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eleves.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.matricule}</TableCell>
                  <TableCell className="font-medium">{e.nom} {e.prenom}</TableCell>
                  <TableCell>
                    {e.classe && <Badge variant="outline" className="text-xs">{e.classe.nom}</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.dateNaissance ? format(new Date(e.dateNaissance), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{e.parent?.nom ?? '—'}</TableCell>
                  <TableCell className="text-sm">{e.parent?.telephone ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!isLoading && eleves.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">Aucun élève trouvé.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Rapport Finances ────────────────────────────────────────────────────────

function FinancesReport() {
  const { data: dashboard } = useQuery({
    queryKey: ['finances-dashboard'],
    queryFn: () => api.get('/api/v1/finances/dashboard').then((r) => r.data.data as any),
  });

  const { data: paiements = [], isLoading } = useQuery({
    queryKey: ['paiements-rapport'],
    // Service returns {data:[...],meta:{}} → interceptor → {success,data:[...],meta:{}} → r.data.data = [...]
    queryFn: () => api.get('/api/v1/finances/paiements?limit=500').then((r) => r.data.data as any[]),
  });

  const handleExportCSV = () => {
    const headers = ['Date', 'Élève', 'Matricule', 'Type', 'Montant', 'Mode', 'Référence'];
    const rows = paiements.map((p: any) => [
      format(new Date(p.createdAt), 'dd/MM/yyyy'),
      `${p.eleve?.nom ?? ''} ${p.eleve?.prenom ?? ''}`.trim(),
      p.eleve?.matricule ?? '',
      p.facture?.type ?? '',
      p.montant,
      p.modePaiement,
      p.reference ?? '',
    ]);
    exportCSV('rapport_paiements.csv', headers, rows);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      {dashboard && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total recettes', value: fmt(dashboard.totalRecettes), icon: TrendingUp, color: 'text-emerald-600' },
            { label: 'Ce mois', value: fmt(dashboard.recettesMois), icon: DollarSign, color: 'text-blue-600' },
            { label: 'Impayés', value: fmt(dashboard.montantImpaye), icon: AlertCircle, color: 'text-red-600' },
            { label: 'Taux recouvrement', value: `${dashboard.tauxRecouvrement.toFixed(1)} %`, icon: CheckCircle2, color: 'text-purple-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-lg font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Historique des paiements
              </CardTitle>
              <CardDescription>{isLoading ? '…' : `${paiements.length} paiements`}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={isLoading}>
                <Download className="w-3.5 h-3.5" />CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" />Imprimer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Référence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paiements.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(p.createdAt), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{p.eleve?.nom} {p.eleve?.prenom}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.eleve?.matricule}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{p.facture?.type ?? '—'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{p.modePaiement}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">{fmt(p.montant)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{p.reference ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!isLoading && paiements.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">Aucun paiement enregistré.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Rapport Examens ─────────────────────────────────────────────────────────

function ExamensReport() {
  const [classeId, setClasseId] = useState('all');
  const { data: classes = [] } = useClasses();

  const { data: examens = [], isLoading } = useQuery({
    queryKey: ['examens-rapport', classeId],
    queryFn: () =>
      api
        .get(`/api/v1/academique/examens${classeId !== 'all' ? `?classeId=${classeId}` : ''}`)
        .then((r) => r.data.data as any[]),
  });

  const handleExportCSV = () => {
    const headers = ['Date', 'Libellé', 'Classe', 'Matière', 'Durée (min)', 'Sur'];
    const rows = examens.map((e: any) => [
      format(new Date(e.date), 'dd/MM/yyyy HH:mm'),
      e.libelle,
      e.classe?.nom ?? '',
      e.matiere?.nom ?? '',
      e.duree ?? '',
      e.surNote ?? 100,
    ]);
    exportCSV('calendrier_examens.csv', headers, rows);
  };

  const now = new Date();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-600" />
            Calendrier des examens
          </CardTitle>
          <CardDescription>Consultez et exportez le programme des examens</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Filtrer par classe</label>
              <Select value={classeId} onValueChange={setClasseId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleExportCSV} disabled={isLoading}>
              <Download className="w-4 h-4" />CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />Imprimer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead className="text-right">Sur</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {examens.map((e: any) => {
                const examDate = new Date(e.date);
                const isPast = examDate < now;
                const isSoon = !isPast && examDate.getTime() - now.getTime() < 7 * 24 * 3600 * 1000;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(examDate, 'dd MMM yyyy', { locale: fr })}
                      <div className="text-xs text-muted-foreground">{format(examDate, 'HH:mm')}</div>
                    </TableCell>
                    <TableCell className="font-medium">{e.libelle}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{e.classe?.nom}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{e.matiere?.nom}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.duree ? `${e.duree} min` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{e.surNote ?? 100}</TableCell>
                    <TableCell>
                      {isPast ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3" /> Passé
                        </span>
                      ) : isSoon ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <Clock className="w-3 h-3" /> Proche
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <Clock className="w-3 h-3" /> Planifié
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!isLoading && examens.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">Aucun examen planifié.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

export function RapportsView() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rapports & Exports</h1>
        <p className="text-muted-foreground mt-1">
          Générez, consultez et exportez vos données en CSV ou via impression
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Bulletins', desc: 'Notes par classe/période', icon: GraduationCap, color: 'bg-blue-50 text-blue-600' },
          { label: 'Élèves', desc: 'Listes & annuaires', icon: Users, color: 'bg-purple-50 text-purple-600' },
          { label: 'Finances', desc: 'Paiements & recouvrement', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Examens', desc: 'Calendrier & programmes', icon: BookOpen, color: 'bg-amber-50 text-amber-600' },
        ].map((item) => (
          <Card key={item.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center mb-3`}>
                <item.icon className="w-4 h-4" />
              </div>
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bulletins">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bulletins" className="gap-2">
            <GraduationCap className="w-3.5 h-3.5" />Bulletins
          </TabsTrigger>
          <TabsTrigger value="eleves" className="gap-2">
            <Users className="w-3.5 h-3.5" />Élèves
          </TabsTrigger>
          <TabsTrigger value="finances" className="gap-2">
            <DollarSign className="w-3.5 h-3.5" />Finances
          </TabsTrigger>
          <TabsTrigger value="examens" className="gap-2">
            <BookOpen className="w-3.5 h-3.5" />Examens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulletins" className="mt-4"><BulletinsReport /></TabsContent>
        <TabsContent value="eleves" className="mt-4"><ElevesReport /></TabsContent>
        <TabsContent value="finances" className="mt-4"><FinancesReport /></TabsContent>
        <TabsContent value="examens" className="mt-4"><ExamensReport /></TabsContent>
      </Tabs>
    </div>
  );
}
