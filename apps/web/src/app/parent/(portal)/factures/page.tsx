'use client';

import { useEffect, useRef, useState } from 'react';
import parentApi from '@/lib/parent-api';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF', minimumFractionDigits: 0 }).format(n);

const statutBadge: Record<string, string> = {
  EN_ATTENTE: 'bg-yellow-100 text-yellow-700',
  PARTIEL: 'bg-orange-100 text-orange-700',
  PAYE: 'bg-green-100 text-green-700',
  ANNULE: 'bg-gray-100 text-gray-500',
};

const statutLabel: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  PARTIEL: 'Partiel',
  PAYE: 'Payée',
  ANNULE: 'Annulée',
};

export default function ParentFacturesPage() {
  const [factures, setFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({
    montant: '',
    modePaiement: 'MOBILE_MONEY',
    reference: '',
  });
  const [fichier, setFichier] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    parentApi.get('/api/v1/parent/factures')
      .then((r) => setFactures(r.data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleSoumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setMsg('');

    let fichierUrl: string | undefined;
    let fichierNom: string | undefined;

    // Upload file if virement + file selected
    if (fichier) {
      try {
        const fd = new FormData();
        fd.append('file', fichier);
        const uploadRes = await parentApi.post('/api/v1/uploads/preuve-paiement', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fichierUrl = uploadRes.data.data?.url;
        fichierNom = uploadRes.data.data?.nom;
      } catch {
        setMsg('Erreur lors de l\'upload du reçu');
        setSubmitting(false);
        return;
      }
    }

    try {
      await parentApi.post('/api/v1/parent/paiements/preuve', {
        factureId: selected.id,
        montant: Number(form.montant),
        modePaiement: form.modePaiement,
        reference: form.reference || undefined,
        fichierUrl,
        fichierNom,
      });
      setMsg('Preuve envoyée ! L\'école va valider votre paiement.');
      setSelected(null);
      // Refresh
      const r = await parentApi.get('/api/v1/parent/factures');
      setFactures(r.data.data ?? []);
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
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
      <h1 className="text-lg font-bold text-gray-900">Mes factures</h1>

      {msg && (
        <div className={`p-3 rounded-xl text-sm ${msg.includes('Erreur') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {msg}
        </div>
      )}

      {factures.length === 0 ? (
        <p className="text-center text-gray-400 py-12 text-sm">Aucune facture</p>
      ) : (
        <div className="space-y-3">
          {factures.map((f) => {
            const preuveEnAttente = f.preuves?.[0]?.statut === 'EN_ATTENTE';
            return (
              <div key={f.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{f.libelle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{f.eleve.prenom} {f.eleve.nom}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statutBadge[f.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                    {statutLabel[f.statut] ?? f.statut}
                  </span>
                </div>

                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium">{fmt(f.montant)}</span>
                </div>
                {f.montantDu > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-500">Restant</span>
                    <span className="font-bold text-red-600">{fmt(f.montantDu)}</span>
                  </div>
                )}

                {preuveEnAttente && (
                  <div className="mt-3 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
                    Preuve de paiement en cours de validation...
                  </div>
                )}

                {f.statut !== 'PAYE' && f.statut !== 'ANNULE' && !preuveEnAttente && (
                  <button
                    onClick={() => {
                      setSelected(f);
                      setForm({ montant: String(f.montantDu), modePaiement: 'MOBILE_MONEY', reference: '' });
                      setFichier(null);
                      setMsg('');
                    }}
                    className="mt-3 w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
                  >
                    Envoyer une preuve de paiement
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom sheet / modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="text-base font-bold text-gray-900 mb-1">Preuve de paiement</h2>
            <p className="text-xs text-gray-500 mb-4">{selected.libelle}</p>

            <form onSubmit={handleSoumettre} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                <select
                  value={form.modePaiement}
                  onChange={(e) => setForm({ ...form, modePaiement: e.target.value })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="VIREMENT">Virement bancaire</option>
                  <option value="ESPECE">Espèces</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant payé (CDF)</label>
                <input
                  type="number"
                  value={form.montant}
                  onChange={(e) => setForm({ ...form, montant: e.target.value })}
                  required
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Référence de transaction
                </label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="Ex: MP-2024-XXXXX"
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {form.modePaiement === 'VIREMENT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reçu bancaire (photo / PDF)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition"
                  >
                    {fichier ? `✓ ${fichier.name}` : '+ Ajouter le reçu'}
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl text-sm disabled:opacity-60"
                >
                  {submitting ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
