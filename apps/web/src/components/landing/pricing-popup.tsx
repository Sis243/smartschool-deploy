'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { PRIX_MENSUEL_USD, PRIX_ANNUEL_USD } from '@/lib/abonnement';

const WHATSAPP_CONTACT = 'https://wa.me/243979710633';
const CLE_SESSION = 'ss-pricing-popup-vu';

export function PricingPopup() {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CLE_SESSION)) return;
    } catch {}
    const t = setTimeout(() => setOuvert(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const fermer = () => {
    setOuvert(false);
    try { sessionStorage.setItem(CLE_SESSION, '1'); } catch {}
  };

  if (!ouvert) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative rounded-2xl border border-blue-500/30 bg-slate-900 shadow-2xl shadow-blue-950/50 p-5 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
        <button onClick={fermer} aria-label="Fermer" className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[11px] font-semibold mb-3">
          <Sparkles className="w-3 h-3" />Meilleure offre
        </div>
        <h3 className="text-white font-bold text-lg leading-tight">Abonnement annuel : -30%</h3>
        <p className="text-slate-400 text-sm mt-1.5">
          <span className="line-through text-slate-600">{PRIX_MENSUEL_USD * 12}$</span>{' '}
          <span className="text-white font-semibold">{PRIX_ANNUEL_USD}$ / an</span> au lieu de payer mois par mois — soit {PRIX_MENSUEL_USD}$/mois seulement.
        </p>
        <Link
          href={WHATSAPP_CONTACT}
          target="_blank"
          rel="noopener noreferrer"
          onClick={fermer}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          En profiter maintenant <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
