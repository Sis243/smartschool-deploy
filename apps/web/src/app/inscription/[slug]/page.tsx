'use client';

import { useState, use } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, School, User, Users, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const publicApi = axios.create({ baseURL: API_URL });

const NIVEAUX = ['Maternelle', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '1ère A', '2ème A', '3ème A', '4ème A', '5ème A', '6ème A', 'Autre'];

type Step = 'enfant' | 'parent' | 'confirmation';

export default function InscriptionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [step, setStep] = useState<Step>('enfant');
  const [submitted, setSubmitted] = useState(false);

  const [enfant, setEnfant] = useState({
    prenomEnfant: '',
    nomEnfant: '',
    dateNaissance: '',
    lieuNaissance: '',
    genre: '',
    classeVisee: '',
    anneeScolaire: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
  });

  const [parent, setParent] = useState({
    prenomParent: '',
    nomParent: '',
    telephone: '',
    email: '',
    adresse: '',
    lienFiliation: '',
  });

  const { data: etablissement } = useQuery({
    queryKey: ['etablissement', slug],
    queryFn: async () => (await publicApi.get(`/api/v1/inscriptions/etablissement/${slug}`)).data.data,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => publicApi.post(`/api/v1/inscriptions/soumettre/${slug}`, { ...enfant, ...parent }),
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error('Erreur lors de l\'envoi. Vérifiez les informations et réessayez.'),
  });

  const etab = etablissement as any;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold">Demande envoyée !</h2>
            <p className="text-muted-foreground text-sm">
              Votre demande d'inscription pour <strong>{enfant.prenomEnfant} {enfant.nomEnfant}</strong> a bien été reçue.
              L'école vous contactera dans les plus brefs délais au <strong>{parent.telephone}</strong>.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setStep('enfant'); setEnfant({ prenomEnfant: '', nomEnfant: '', dateNaissance: '', lieuNaissance: '', genre: '', classeVisee: '', anneeScolaire: enfant.anneeScolaire }); setParent({ prenomParent: '', nomParent: '', telephone: '', email: '', adresse: '', lienFiliation: '' }); }}>
              Nouvelle demande
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps: { id: Step; label: string; icon: any }[] = [
    { id: 'enfant', label: 'Enfant', icon: User },
    { id: 'parent', label: 'Parent', icon: Users },
    { id: 'confirmation', label: 'Confirmation', icon: CheckCircle },
  ];
  const currentIdx = steps.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-xl mx-auto">
        {/* En-tête école */}
        <div className="text-center py-8 space-y-2">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <School className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">{etab?.name ?? 'Inscription scolaire'}</h1>
          <p className="text-sm text-muted-foreground">Formulaire d'inscription en ligne — Année {enfant.anneeScolaire}</p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = i < currentIdx;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-white/60 text-muted-foreground'}`}>
                  <Icon className="w-3.5 h-3.5" />{s.label}
                </div>
                {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 space-y-5">

            {/* Étape 1 : Enfant */}
            {step === 'enfant' && (
              <>
                <CardHeader className="px-0 pt-0 pb-2">
                  <CardTitle className="text-base">Informations sur l'enfant</CardTitle>
                </CardHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Prénom *</Label>
                    <Input placeholder="ex: Marie" value={enfant.prenomEnfant} onChange={e => setEnfant({ ...enfant, prenomEnfant: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nom *</Label>
                    <Input placeholder="ex: Kabila" value={enfant.nomEnfant} onChange={e => setEnfant({ ...enfant, nomEnfant: e.target.value.toUpperCase() })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Date de naissance</Label>
                    <Input type="date" value={enfant.dateNaissance} onChange={e => setEnfant({ ...enfant, dateNaissance: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Genre</Label>
                    <Select onValueChange={v => setEnfant({ ...enfant, genre: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MASCULIN">Masculin</SelectItem>
                        <SelectItem value="FEMININ">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Lieu de naissance</Label>
                  <Input placeholder="ex: Kinshasa" value={enfant.lieuNaissance} onChange={e => setEnfant({ ...enfant, lieuNaissance: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Classe souhaitée</Label>
                  <Select onValueChange={v => setEnfant({ ...enfant, classeVisee: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner la classe" /></SelectTrigger>
                    <SelectContent>
                      {NIVEAUX.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-500 gap-2"
                  disabled={!enfant.prenomEnfant || !enfant.nomEnfant}
                  onClick={() => setStep('parent')}>
                  Suivant <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Étape 2 : Parent */}
            {step === 'parent' && (
              <>
                <CardHeader className="px-0 pt-0 pb-2">
                  <CardTitle className="text-base">Informations du parent / tuteur</CardTitle>
                </CardHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Prénom *</Label>
                    <Input placeholder="ex: Jean" value={parent.prenomParent} onChange={e => setParent({ ...parent, prenomParent: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nom *</Label>
                    <Input placeholder="ex: Kabila" value={parent.nomParent} onChange={e => setParent({ ...parent, nomParent: e.target.value.toUpperCase() })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone *</Label>
                  <Input placeholder="+243 812 345 678" value={parent.telephone} onChange={e => setParent({ ...parent, telephone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" placeholder="email@exemple.com" value={parent.email} onChange={e => setParent({ ...parent, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Adresse</Label>
                  <Input placeholder="Quartier, avenue, n°..." value={parent.adresse} onChange={e => setParent({ ...parent, adresse: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Lien de filiation</Label>
                  <Select onValueChange={v => setParent({ ...parent, lienFiliation: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERE">Père</SelectItem>
                      <SelectItem value="MERE">Mère</SelectItem>
                      <SelectItem value="TUTEUR">Tuteur légal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep('enfant')}>
                    <ChevronLeft className="w-4 h-4" /> Retour
                  </Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-500 gap-2"
                    disabled={!parent.prenomParent || !parent.nomParent || !parent.telephone}
                    onClick={() => setStep('confirmation')}>
                    Suivant <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Étape 3 : Confirmation */}
            {step === 'confirmation' && (
              <>
                <CardHeader className="px-0 pt-0 pb-2">
                  <CardTitle className="text-base">Récapitulatif</CardTitle>
                </CardHeader>
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Enfant</p>
                    <p className="font-semibold">{enfant.prenomEnfant} {enfant.nomEnfant}</p>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      {enfant.dateNaissance && <p>Né(e) le {new Date(enfant.dateNaissance).toLocaleDateString('fr-FR')}{enfant.lieuNaissance ? ` à ${enfant.lieuNaissance}` : ''}</p>}
                      {enfant.classeVisee && <p>Classe souhaitée : {enfant.classeVisee}</p>}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent / Tuteur</p>
                    <p className="font-semibold">{parent.prenomParent} {parent.nomParent}</p>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p>{parent.telephone}</p>
                      {parent.email && <p>{parent.email}</p>}
                      {parent.adresse && <p>{parent.adresse}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep('parent')}>
                    <ChevronLeft className="w-4 h-4" /> Retour
                  </Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-500 gap-2"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate()}>
                    {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi...</> : <>Soumettre la demande</>}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 pb-8">
          Powered by SmartSchool ERP — Vos données sont sécurisées
        </p>
      </div>
    </div>
  );
}
