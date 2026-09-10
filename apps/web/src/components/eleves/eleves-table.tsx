'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, QrCode, FileDown, ChevronLeft, ChevronRight, Pencil, Trash2, KeyRound, ScanFace, Loader2, CheckCircle2, Camera, Upload } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { chargerModeles, extraireEmpreinte } from '@/lib/face-recognition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NouveauParentDialog } from '@/components/parents/nouveau-parent-dialog';

// ─── Schéma formulaire ───────────────────────────────────────────────────────

const eleveSchema = z.object({
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  genre: z.enum(['MASCULIN', 'FEMININ']),
  dateNaissance: z.string().optional(),
  lieuNaissance: z.string().optional(),
  adresse: z.string().optional(),
  groupeSanguin: z.string().optional(),
  classeId: z.string().optional(),
  parentId: z.string().optional(),
});

type EleveForm = z.infer<typeof eleveSchema>;

// ─── Dialog Nouvel élève ─────────────────────────────────────────────────────

function NouvelEleveDialog({
  open, onClose, eleveToEdit,
}: { open: boolean; onClose: () => void; eleveToEdit?: any }) {
  const queryClient = useQueryClient();

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => (await api.get('/api/v1/academique/classes')).data.data,
    enabled: open,
  });

  const { data: parents } = useQuery({
    queryKey: ['parents'],
    queryFn: async () => (await api.get('/api/v1/eleves/parents')).data.data,
    enabled: open,
  });
  const [parentDialogOpen, setParentDialogOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EleveForm>({
    resolver: zodResolver(eleveSchema),
    defaultValues: eleveToEdit ? {
      prenom: eleveToEdit.prenom,
      nom: eleveToEdit.nom,
      genre: eleveToEdit.genre,
      dateNaissance: eleveToEdit.dateNaissance?.split('T')[0],
      lieuNaissance: eleveToEdit.lieuNaissance,
      adresse: eleveToEdit.adresse,
      groupeSanguin: eleveToEdit.groupeSanguin,
      classeId: eleveToEdit.classeId,
      parentId: eleveToEdit.parentId,
    } : { genre: 'MASCULIN' },
  });
  const watchParentId = watch('parentId');

  const mutation = useMutation({
    mutationFn: (data: EleveForm) =>
      eleveToEdit
        ? api.put(`/api/v1/eleves/${eleveToEdit.id}`, data)
        : api.post('/api/v1/eleves', data),
    onSuccess: () => {
      toast.success(eleveToEdit ? 'Élève modifié' : 'Élève inscrit avec succès');
      queryClient.invalidateQueries({ queryKey: ['eleves'] });
      reset();
      onClose();
    },
    onError: () => toast.error('Une erreur est survenue'),
  });

  return (
    <>
      <NouveauParentDialog
        open={parentDialogOpen}
        onClose={() => setParentDialogOpen(false)}
        onCreated={(parent) => { setValue('parentId', parent.id); setParentDialogOpen(false); }}
      />
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{eleveToEdit ? 'Modifier l\'élève' : 'Inscrire un nouvel élève'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5 py-2">
          {/* Identité */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Identité</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prénom *</Label>
                <Input placeholder="ex: Amani" {...register('prenom')} />
                {errors.prenom && <p className="text-xs text-red-500">{errors.prenom.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input placeholder="ex: Mutamba" {...register('nom')} />
                {errors.nom && <p className="text-xs text-red-500">{errors.nom.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Genre *</Label>
                <Select defaultValue="MASCULIN" onValueChange={(v) => setValue('genre', v as 'MASCULIN' | 'FEMININ')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASCULIN">Masculin</SelectItem>
                    <SelectItem value="FEMININ">Féminin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Groupe sanguin</Label>
                <Select onValueChange={(v) => setValue('groupeSanguin', v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date de naissance</Label>
                <Input type="date" {...register('dateNaissance')} />
              </div>
              <div className="space-y-1.5">
                <Label>Lieu de naissance</Label>
                <Input placeholder="ex: Kinshasa" {...register('lieuNaissance')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Adresse</Label>
                <Input placeholder="Adresse de résidence" {...register('adresse')} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Scolarité */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Scolarité</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Classe</Label>
                <Select onValueChange={(v) => setValue('classeId', v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                  <SelectContent>
                    {(classes ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom} — {c.niveau}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Parent / Tuteur</Label>
                <div className="flex gap-2">
                  <Select value={watchParentId} onValueChange={(v) => setValue('parentId', v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir un parent" /></SelectTrigger>
                    <SelectContent>
                      {(parents ?? []).map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom} — {p.telephone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setParentDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {(parents ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun parent enregistré — cliquez sur + pour en ajouter un.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
              {mutation.isPending ? 'Enregistrement...' : eleveToEdit ? 'Enregistrer' : 'Inscrire l\'élève'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Dialog Reconnaissance faciale ──────────────────────────────────────────
function VisageDialog({ open, onClose, eleve }: { open: boolean; onClose: () => void; eleve: any }) {
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<'camera' | 'fichier'>('camera');
  const [pretModeles, setPretModeles] = useState(false);
  const [pretCamera, setPretCamera] = useState(false);
  const [empreinte, setEmpreinte] = useState<Float32Array | null>(null);
  const [capture, setCapture] = useState<string | null>(null);
  const [erreur, setErreur] = useState('');
  const [analyse, setAnalyse] = useState(false);

  useEffect(() => {
    if (!open) return;
    let annule = false;

    chargerModeles()
      .then(() => { if (!annule) setPretModeles(true); })
      .catch(() => setErreur('Impossible de charger le module de reconnaissance faciale'));

    return () => { annule = true; };
  }, [open]);

  useEffect(() => {
    if (!open || mode !== 'camera') {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setPretCamera(false);
      return;
    }
    let annule = false;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (annule) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPretCamera(true);
      })
      .catch(() => setErreur('Accès à la caméra refusé ou indisponible sur cet appareil'));

    return () => {
      annule = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setPretCamera(false);
    };
  }, [open, mode]);

  useEffect(() => {
    if (!open) {
      setEmpreinte(null);
      setCapture(null);
      setErreur('');
      setMode('camera');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  const capturer = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setAnalyse(true);
    setErreur('');
    try {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const descripteur = await extraireEmpreinte(canvas);
      if (!descripteur) {
        setErreur('Aucun visage net détecté — rapprochez-vous et réessayez');
        return;
      }
      setEmpreinte(descripteur);
      setCapture(canvas.toDataURL('image/jpeg', 0.85));
    } finally {
      setAnalyse(false);
    }
  };

  const importerFichier = async (fichier: File) => {
    if (!canvasRef.current) return;
    setAnalyse(true);
    setErreur('');
    try {
      const image = new Image();
      const url = URL.createObjectURL(fichier);
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Image illisible'));
        image.src = url;
      });

      const canvas = canvasRef.current;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);

      const descripteur = await extraireEmpreinte(canvas);
      if (!descripteur) {
        setErreur('Aucun visage net détecté sur cette photo — utilisez une photo de face, bien éclairée');
        return;
      }
      setEmpreinte(descripteur);
      setCapture(canvas.toDataURL('image/jpeg', 0.85));
    } catch {
      setErreur('Impossible de lire ce fichier — utilisez une image (JPG, PNG)');
    } finally {
      setAnalyse(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!empreinte || !canvasRef.current) throw new Error('Aucune capture');
      const blob: Blob = await new Promise((resolve, reject) =>
        canvasRef.current!.toBlob((b) => (b ? resolve(b) : reject()), 'image/jpeg', 0.85),
      );
      const fd = new FormData();
      fd.append('file', blob, `${eleve.matricule}.jpg`);
      const up = await api.post('/api/v1/uploads/photo-eleve', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return api.patch(`/api/v1/eleves/${eleve.id}/visage`, {
        photoUrl: up.data.data.url,
        faceDescriptor: Array.from(empreinte),
      });
    },
    onSuccess: () => {
      toast.success('Visage enregistré — l\'élève peut être reconnu au pointage');
      qc.invalidateQueries({ queryKey: ['eleves'] });
      onClose();
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement du visage'),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reconnaissance faciale — {eleve?.prenom} {eleve?.nom}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {!capture && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button" variant={mode === 'camera' ? 'default' : 'outline'}
                className={mode === 'camera' ? 'bg-blue-600 hover:bg-blue-500 gap-1.5' : 'gap-1.5'}
                onClick={() => { setMode('camera'); setErreur(''); }}
              >
                <Camera className="w-4 h-4" />Caméra
              </Button>
              <Button
                type="button" variant={mode === 'fichier' ? 'default' : 'outline'}
                className={mode === 'fichier' ? 'bg-blue-600 hover:bg-blue-500 gap-1.5' : 'gap-1.5'}
                onClick={() => { setMode('fichier'); setErreur(''); }}
              >
                <Upload className="w-4 h-4" />Importer une photo
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {mode === 'camera'
              ? "Cadrez le visage de l'élève bien éclairé, de face, puis capturez."
              : "Importez la photo passeport ou d'identité de l'élève (visage net, de face)."}
            {' '}Cette photo servira de référence pour le pointage automatique des présences.
          </p>

          {mode === 'camera' || capture ? (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
              {capture ? (
                <img src={capture} alt="Capture" className="w-full h-full object-cover" />
              ) : (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              )}
              {mode === 'camera' && (!pretModeles || !pretCamera) && !capture && !erreur && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />Initialisation de la caméra...
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!pretModeles || analyse}
              className="w-full rounded-lg border-2 border-dashed border-border aspect-video flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
            >
              {analyse ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              <span className="text-sm">{analyse ? 'Analyse de la photo...' : 'Cliquez pour choisir une photo'}</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importerFichier(f); }}
          />

          <canvas ref={canvasRef} className="hidden" />
          {erreur && <p className="text-xs text-red-500">{erreur}</p>}
          {capture && !erreur && (
            <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Visage détecté</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          {capture ? (
            <>
              <Button variant="outline" onClick={() => { setCapture(null); setEmpreinte(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                Reprendre
              </Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
                {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </>
          ) : mode === 'camera' ? (
            <Button onClick={capturer} disabled={!pretModeles || !pretCamera || analyse} className="bg-blue-600 hover:bg-blue-500 gap-2">
              {analyse ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace className="w-4 h-4" />}
              {analyse ? 'Analyse...' : 'Capturer'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table principale ─────────────────────────────────────────────────────────

export function ElevesTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eleveToEdit, setEleveToEdit] = useState<any>(null);
  const [visageEleve, setVisageEleve] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['eleves', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await api.get(`/api/v1/eleves?${params}`);
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/eleves/${id}`),
    onSuccess: () => {
      toast.success('Élève archivé');
      queryClient.invalidateQueries({ queryKey: ['eleves'] });
    },
    onError: () => toast.error('Erreur lors de l\'archivage'),
  });

  const eleves = data?.data ?? [];
  const meta = data?.meta;

  const openNew = () => { setEleveToEdit(null); setDialogOpen(true); };
  const openEdit = (e: any) => { setEleveToEdit(e); setDialogOpen(true); };

  return (
    <>
      <NouvelEleveDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        eleveToEdit={eleveToEdit}
      />
      {visageEleve && (
        <VisageDialog open={!!visageEleve} onClose={() => setVisageEleve(null)} eleve={visageEleve} />
      )}

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un élève..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <FileDown className="w-4 h-4" />Exporter
              </Button>
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={openNew}>
                <Plus className="w-4 h-4" />Nouvel élève
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Matricule</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-28 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : eleves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <p className="font-medium">{search ? 'Aucun résultat pour cette recherche' : 'Aucun élève enregistré'}</p>
                      {!search && (
                        <Button size="sm" variant="outline" className="mt-2 gap-2" onClick={openNew}>
                          <Plus className="w-4 h-4" />Inscrire le premier élève
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                eleves.map((eleve: any) => (
                  <TableRow key={eleve.id}>
                    <TableCell>
                      <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                        {eleve.matricule}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={`text-xs font-semibold ${eleve.genre === 'FEMININ' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                            {eleve.prenom?.[0]}{eleve.nom?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{eleve.prenom} {eleve.nom}</p>
                          {eleve.dateNaissance && (
                            <p className="text-xs text-muted-foreground">{formatDate(eleve.dateNaissance)}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {eleve.classe ? (
                        <Badge variant="secondary" className="text-xs">{eleve.classe.nom}</Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{eleve.parent?.nom || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{eleve.parent?.telephone || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(eleve)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Modifier</TooltipContent>
                        </Tooltip>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <QrCode className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>QR Code</TooltipContent>
                        </Tooltip>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${eleve.faceDescriptor ? 'text-emerald-500' : 'text-muted-foreground'}`}
                              onClick={() => setVisageEleve(eleve)}
                            >
                              <ScanFace className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{eleve.faceDescriptor ? 'Visage enregistré — recapturer' : 'Enregistrer le visage (pointage facial)'}</TooltipContent>
                        </Tooltip>
                        {eleve.parentId && (
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                                onClick={async () => {
                                  try {
                                    const r = await api.post(`/api/v1/parent/admin/parents/${eleve.parentId}/access-code`);
                                    toast.success(
                                      r.data.data.envoye
                                        ? `Lien d'activation envoyé par e-mail au parent (code : ${r.data.data.accessCode})`
                                        : `L'e-mail n'a pas pu être envoyé — code à transmettre manuellement : ${r.data.data.accessCode}`,
                                      { duration: 7000 },
                                    );
                                  } catch (e: any) {
                                    toast.error(e?.response?.data?.message ?? 'Erreur génération code');
                                  }
                                }}
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Envoyer le lien d&apos;activation du portail parent (par e-mail)</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-500"
                              onClick={() => {
                                if (confirm(`Archiver ${eleve.prenom} ${eleve.nom} ?`))
                                  deleteMutation.mutate(eleve.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Archiver</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {meta && meta.total > 0 && (
            <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between text-sm text-muted-foreground">
              <p>{meta.total} élève{meta.total > 1 ? 's' : ''} au total</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 gap-1">
                  <ChevronLeft className="w-3 h-3" />Précédent
                </Button>
                <span className="px-2 text-xs">Page {page} / {meta.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="h-8 gap-1">
                  Suivant<ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
