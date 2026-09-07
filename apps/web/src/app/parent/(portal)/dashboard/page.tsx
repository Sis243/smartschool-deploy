'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import parentApi from '@/lib/parent-api';
import { clearParentSession } from '@/lib/parent-auth';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF', minimumFractionDigits: 0 }).format(n);

export default function ParentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi.get('/api/v1/parent/dashboard')
      .then((r) => setData(r.data.data))
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    clearParentSession();
    router.push('/parent/login');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-600 text-white rounded-2xl p-4">
          <p className="text-3xl font-bold">{data?.eleves?.length ?? 0}</p>
          <p className="text-xs opacity-80 mt-1">Enfant{(data?.eleves?.length ?? 0) > 1 ? 's' : ''} inscrits</p>
        </div>
        <div className="bg-amber-500 text-white rounded-2xl p-4">
          <p className="text-3xl font-bold">{data?.notifNonLues ?? 0}</p>
          <p className="text-xs opacity-80 mt-1">Notification{(data?.notifNonLues ?? 0) > 1 ? 's' : ''} non lues</p>
        </div>
      </div>

      {/* Children */}
      {data?.eleves?.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-600 mb-2">Mes enfants</h2>
          <div className="space-y-2">
            {data.eleves.map((e: any) => (
              <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {e.prenom[0]}{e.nom[0]}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">{e.prenom} {e.nom}</p>
                  <p className="text-xs text-gray-500">{e.classe?.nom ?? 'Aucune classe'} · {e.matricule}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending invoices */}
      {data?.facturesEnAttente?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-600">Factures en attente</h2>
            <Link href="/parent/factures" className="text-xs text-blue-600 font-medium">Voir tout</Link>
          </div>
          <div className="space-y-2">
            {data.facturesEnAttente.map((f: any) => (
              <div key={f.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{f.libelle}</p>
                    <p className="text-xs text-gray-500">{f.eleve.prenom} {f.eleve.nom}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{fmt(f.montantDu)}</p>
                    <p className="text-xs text-gray-400">restant</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition"
      >
        Se déconnecter
      </button>
    </div>
  );
}
