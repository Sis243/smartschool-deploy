'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { setParentSession } from '@/lib/parent-auth';
import { InstallPwaButton } from '@/components/install-pwa-button';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Mode = 'login' | 'activer';

function ParentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ telephone: '', pin: '', accessCode: '', pinConfirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Lien reçu par e-mail (?mode=activer&code=ABC123) : on ouvre directement
  // l'onglet d'activation avec le code déjà rempli.
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setForm((f) => ({ ...f, accessCode: code.toUpperCase() }));
      setMode('activer');
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/api/v1/parent/auth/login`,
        { telephone: form.telephone, pin: form.pin },
      );
      setParentSession(data.data.accessToken, data.data.parent);
      router.push('/parent/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Téléphone ou PIN incorrect');
    } finally {
      setLoading(false);
    }
  }

  async function handleActiver(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.pin !== form.pinConfirm) {
      setError('Les PINs ne correspondent pas');
      return;
    }
    if (form.pin.length < 4) {
      setError('Le PIN doit contenir au moins 4 chiffres');
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API}/api/v1/parent/auth/activer`,
        { accessCode: form.accessCode, telephone: form.telephone, pin: form.pin },
      );
      setSuccess('Portail activé ! Vous pouvez maintenant vous connecter.');
      setMode('login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Code d\'accès invalide');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SmartSchool</h1>
          <p className="text-sm text-gray-500 mt-1">Portail Parent</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1">
            {(['login', 'activer'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === m ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                }`}
              >
                {m === 'login' ? 'Se connecter' : 'Activer le compte'}
              </button>
            ))}
          </div>

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="+243 8XX XXX XXX"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  placeholder="••••"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleActiver} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code d&apos;accès (reçu par e-mail)
                </label>
                <input
                  type="text"
                  value={form.accessCode}
                  onChange={(e) => setForm({ ...form, accessCode: e.target.value.toUpperCase() })}
                  placeholder="ABC123"
                  maxLength={6}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Votre numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="+243 8XX XXX XXX"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Choisissez un PIN (4-6 chiffres)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  placeholder="••••"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pinConfirm}
                  onChange={(e) => setForm({ ...form, pinConfirm: e.target.value })}
                  placeholder="••••"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
              >
                {loading ? 'Activation...' : 'Activer mon compte'}
              </button>
            </form>
          )}

          <InstallPwaButton />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          SmartSchool ERP &copy; Smart IT Solution
        </p>
      </div>
    </div>
  );
}

export default function ParentLoginPage() {
  return (
    <Suspense fallback={null}>
      <ParentLoginForm />
    </Suspense>
  );
}
