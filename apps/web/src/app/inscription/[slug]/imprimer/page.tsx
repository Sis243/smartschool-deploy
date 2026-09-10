'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const publicApi = axios.create({ baseURL: API_URL });

// Ligne à remplir à la main — un simple soulignement, pas un champ de formulaire.
function Ligne({ label, large }: { label: string; large?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${large ? 'col-span-2' : ''}`}>
      <span className="text-sm whitespace-nowrap">{label} :</span>
      <span className="flex-1 border-b border-black h-6" />
    </div>
  );
}

export default function ImprimerInscriptionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const { data: etablissement } = useQuery({
    queryKey: ['etablissement', slug],
    queryFn: async () => (await publicApi.get(`/api/v1/inscriptions/etablissement/${slug}`)).data.data,
    retry: false,
  });
  const etab = etablissement as any;

  return (
    <div className="min-h-screen bg-white text-black p-8 print:p-0">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 1.5cm; } }`}</style>

      <div className="no-print flex justify-end max-w-3xl mx-auto mb-4">
        <Button onClick={() => window.print()} className="gap-2 bg-blue-600 hover:bg-blue-500">
          <Printer className="w-4 h-4" />Imprimer / Enregistrer en PDF
        </Button>
      </div>

      <div className="max-w-3xl mx-auto space-y-6 font-serif">
        <div className="flex items-center gap-3 border-b-2 border-black pb-4">
          {etab?.logoUrl ? (
            <img src={etab.logoUrl} alt="" className="w-14 h-14 object-contain" />
          ) : (
            <School className="w-10 h-10" />
          )}
          <div>
            <h1 className="text-xl font-bold">{etab?.name ?? 'École'}</h1>
            <p className="text-sm">Formulaire de demande d&apos;inscription</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="font-bold text-sm uppercase tracking-wide border-b border-black pb-1">1. Informations sur l&apos;enfant</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
            <Ligne label="Prénom" />
            <Ligne label="Nom" />
            <Ligne label="Date de naissance" />
            <Ligne label="Lieu de naissance" />
            <Ligne label="Genre (M / F)" />
            <Ligne label="Classe souhaitée" />
            <Ligne label="École précédente" large />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-sm uppercase tracking-wide border-b border-black pb-1">2. Santé & contact d&apos;urgence</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
            <Ligne label="Besoins particuliers / santé" large />
            <Ligne label="Contact d'urgence (nom)" />
            <Ligne label="Téléphone" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-sm uppercase tracking-wide border-b border-black pb-1">3. Parent / Tuteur</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
            <Ligne label="Prénom" />
            <Ligne label="Nom" />
            <Ligne label="Téléphone" />
            <Ligne label="Email" />
            <Ligne label="Adresse" large />
            <Ligne label="Lien de filiation (Père / Mère / Tuteur)" large />
          </div>
        </section>

        <section className="pt-8 flex justify-between text-sm">
          <div>Date : ______ / ______ / __________</div>
          <div>Signature du parent / tuteur :</div>
        </section>

        <p className="text-xs text-center pt-8 border-t border-black">
          Formulaire à remettre en main propre au secrétariat de l&apos;établissement.
        </p>
      </div>
    </div>
  );
}
