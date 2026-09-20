'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, GraduationCap, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [code, setCode] = useState('');
  const { login, completerConnexion } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const allerApres = (isSuperAdmin?: boolean) => {
    toast.success('Connexion réussie');
    router.push(isSuperAdmin ? '/super-admin' : '/dashboard');
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    try {
      const resultat = await login(data.email, data.password);
      if (resultat.requiresTwoFactor === true) {
        setPendingToken(resultat.pendingToken);
        return;
      }
      allerApres(resultat.user.isSuperAdmin);
    } catch {
      setError('Email ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitCode = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/v1/auth/2fa/verify', { pendingToken, code });
      completerConnexion(data.data.accessToken, data.data.refreshToken, data.data.user);
      allerApres(data.data.user.isSuperAdmin);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Code incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mx-auto">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SmartSchool ERP</h1>
          <p className="text-slate-400 text-sm">Gestion Scolaire Multi-Établissements</p>
        </div>

        <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-sm shadow-2xl">
          {!pendingToken ? (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl text-white">Connexion</CardTitle>
                <CardDescription className="text-slate-400">
                  Entrez vos identifiants pour accéder à votre espace
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="bg-red-950/50 border-red-800">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@ecole.cd"
                        className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-400 text-xs">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                        {...register('password')}
                      />
                    </div>
                    {errors.password && (
                      <p className="text-red-400 text-xs">{errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all duration-200"
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      'Se connecter'
                    )}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="pt-0 flex-col gap-2">
                <p className="text-xs text-slate-500 text-center w-full">
                  Mot de passe oublié ?{' '}
                  <Link href="/forgot-password" className="text-blue-400 hover:underline">Réinitialiser</Link>
                </p>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />Vérification en 2 étapes
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Entrez le code à 6 chiffres de votre application d&apos;authentification (ou un code de secours).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); onSubmitCode(); }} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="bg-red-950/50 border-red-800">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-slate-300">Code</Label>
                    <Input
                      id="code"
                      autoFocus
                      inputMode="numeric"
                      placeholder="123456"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 text-center text-lg tracking-widest"
                      value={code}
                      onChange={(e) => setCode(e.target.value.trim())}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all duration-200"
                    disabled={isLoading || !code}
                    size="lg"
                  >
                    {isLoading ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Vérification...</> : 'Vérifier'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-slate-400 hover:text-white gap-2"
                    onClick={() => { setPendingToken(''); setCode(''); setError(''); }}
                  >
                    <ArrowLeft className="w-4 h-4" />Retour
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-slate-600">
          Smart IT Solution © {new Date().getFullYear()} — SmartSchool ERP v1.0
        </p>
      </div>
    </div>
  );
}
