'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Lock, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const schema = z.object({ newPassword: z.string().min(6, 'Minimum 6 caractères') });
type FormData = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const bienvenue = searchParams.get('bienvenue') === '1';
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) { setError('Lien invalide — le jeton est manquant'); return; }
    setIsLoading(true);
    setError('');
    try {
      await api.post('/api/v1/auth/reset-password', { token, newPassword: data.newPassword });
      toast.success(bienvenue ? 'Compte activé, connectez-vous' : 'Mot de passe réinitialisé, connectez-vous');
      router.push('/login');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Lien invalide ou expiré');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mx-auto">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SmartSchool ERP</h1>
        </div>

        <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white">{bienvenue ? 'Activez votre compte' : 'Nouveau mot de passe'}</CardTitle>
            <CardDescription className="text-slate-400">
              {bienvenue ? 'Choisissez votre mot de passe pour accéder à votre espace' : 'Choisissez un nouveau mot de passe pour votre compte'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!token ? (
              <Alert variant="destructive" className="bg-red-950/50 border-red-800">
                <AlertDescription>Ce lien est invalide. Redemandez un lien de réinitialisation.</AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="bg-red-950/50 border-red-800">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-300">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      {...register('newPassword')}
                    />
                  </div>
                  {errors.newPassword && <p className="text-red-400 text-xs">{errors.newPassword.message}</p>}
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={isLoading} size="lg">
                  {isLoading ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Envoi...</> : bienvenue ? 'Activer mon compte' : 'Réinitialiser le mot de passe'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="pt-0">
            <Link href="/login" className="text-xs text-blue-400 hover:underline mx-auto">Retour à la connexion</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
