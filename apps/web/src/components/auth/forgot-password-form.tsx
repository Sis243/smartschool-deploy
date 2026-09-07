'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Loader2, Mail, GraduationCap, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({ email: z.string().email('Email invalide') });
type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/forgot-password', data);
    } finally {
      // Toujours afficher le même message, que l'email existe ou non.
      setSent(true);
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
            <CardTitle className="text-xl text-white">Mot de passe oublié</CardTitle>
            <CardDescription className="text-slate-400">
              Entrez votre email, nous vous enverrons un lien de réinitialisation
            </CardDescription>
          </CardHeader>

          <CardContent>
            {sent ? (
              <p className="text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-800/50 rounded-lg p-4">
                Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. Vérifiez votre boîte de réception (et vos spams).
              </p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@ecole.cd"
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={isLoading} size="lg">
                  {isLoading ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Envoi...</> : 'Envoyer le lien'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="pt-0">
            <Link href="/login" className="text-sm text-blue-400 hover:underline flex items-center gap-1.5 mx-auto">
              <ArrowLeft className="w-3.5 h-3.5" />Retour à la connexion
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
