'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SCHOOL_TYPES = [
  { value: 'MATERNELLE', label: 'Maternelle' },
  { value: 'PRIMAIRE', label: 'Primaire' },
  { value: 'SECONDAIRE', label: 'Secondaire' },
  { value: 'TECHNIQUE', label: 'Technique' },
  { value: 'SPECIALISE', label: 'Spécialisé' },
  { value: 'THERAPEUTIQUE', label: 'Thérapeutique' },
] as const;

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const registerSchema = z.object({
  name: z.string().min(2, 'Nom requis'),
  slug: z.string().min(2, 'Identifiant requis').regex(/^[a-z0-9-]+$/, 'Lettres minuscules, chiffres et tirets uniquement'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  address: z.string().optional(),
  schoolType: z.enum(['MATERNELLE', 'PRIMAIRE', 'SECONDAIRE', 'TECHNIQUE', 'SPECIALISE', 'THERAPEUTIQUE']),
  adminFirstName: z.string().min(2, 'Prénom requis'),
  adminLastName: z.string().min(2, 'Nom requis'),
  adminEmail: z.string().email('Email invalide'),
  adminPassword: z.string().min(8, 'Minimum 8 caractères'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { schoolType: 'PRIMAIRE' } });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError('');
    try {
      await api.post('/api/v1/tenants/register', data);
      toast.success('Établissement créé — connectez-vous avec le compte administrateur');
      router.push('/login');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la création de l\'établissement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mx-auto">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SmartSchool ERP</h1>
          <p className="text-slate-400 text-sm">Créez le compte de votre établissement</p>
        </div>

        <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white">Nouvel établissement</CardTitle>
            <CardDescription className="text-slate-400">
              Cette étape crée l'établissement et le compte administrateur principal
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-950/50 border-red-800">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Établissement</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-slate-300">Nom de l'école *</Label>
                  <Input
                    placeholder="École Bon Départ"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    {...register('name', {
                      onChange: (e) => setValue('slug', slugify(e.target.value)),
                    })}
                  />
                  {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-slate-300">Identifiant unique *</Label>
                  <Input
                    placeholder="ecole-bon-depart"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    {...register('slug')}
                  />
                  <p className="text-slate-500 text-xs">Utilisé pour identifier votre établissement — lettres minuscules et tirets</p>
                  {errors.slug && <p className="text-red-400 text-xs">{errors.slug.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Email de contact *</Label>
                  <Input
                    type="email"
                    placeholder="info@ecole.cd"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    {...register('email')}
                  />
                  {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Téléphone</Label>
                  <Input
                    placeholder="+243 ..."
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    {...register('phone')}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-slate-300">Type d'établissement *</Label>
                  <Select value={watch('schoolType')} onValueChange={(v) => setValue('schoolType', v as RegisterForm['schoolType'])}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCHOOL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-slate-700" />

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Compte administrateur</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Prénom *</Label>
                  <Input
                    placeholder="Jean"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    {...register('adminFirstName')}
                  />
                  {errors.adminFirstName && <p className="text-red-400 text-xs">{errors.adminFirstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Nom *</Label>
                  <Input
                    placeholder="Directeur"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    {...register('adminLastName')}
                  />
                  {errors.adminLastName && <p className="text-red-400 text-xs">-{errors.adminLastName.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-slate-300">Email administrateur (pour se connecter) *</Label>
                  <Input
                    type="email"
                    placeholder="admin@ecole.cd"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    {...register('adminEmail')}
                  />
                  {errors.adminEmail && <p className="text-red-400 text-xs">{errors.adminEmail.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-slate-300">Mot de passe *</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    {...register('adminPassword')}
                  />
                  {errors.adminPassword && <p className="text-red-400 text-xs">{errors.adminPassword.message}</p>}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer l'établissement"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-0">
            <p className="text-xs text-slate-500 text-center w-full">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-blue-400 hover:underline">Se connecter</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
