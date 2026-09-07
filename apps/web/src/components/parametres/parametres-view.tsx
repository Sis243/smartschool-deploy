'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Building2, Users, Plus, Shield, Eye, EyeOff, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/auth.store';
import { getInitials } from '@/lib/utils';
import api from '@/lib/api';

const ROLES: Record<string, { label: string; color: string }> = {
  ADMIN:         { label: 'Administrateur', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  DIRECTEUR:     { label: 'Directeur',      color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  SECRETAIRE:    { label: 'Secrétaire',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ENSEIGNANT:    { label: 'Enseignant',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  COMPTABLE:     { label: 'Comptable',      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  THERAPEUTE:    { label: 'Thérapeute',     color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  BIBLIOTHECAIRE:{ label: 'Bibliothécaire', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  CHAUFFEUR:     { label: 'Chauffeur',      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

// ─── Onglet Profil ────────────────────────────────────────────────────────────
function ProfilTab() {
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: (user as any)?.phone ?? '',
  });

  const mutation = useMutation({
    mutationFn: () => api.put(`/api/v1/users/${user?.id}`, form),
    onSuccess: (res) => {
      toast.success('Profil mis à jour');
      setUser({ ...user, ...res.data.data } as any);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  return (
    <div className="max-w-lg space-y-6">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Mon profil</CardTitle>
          <CardDescription>Modifiez vos informations personnelles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                {user ? getInitials(user.firstName, user.lastName) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge className={`text-xs mt-1 ${ROLES[user?.role ?? '']?.color ?? ''}`}>
                {ROLES[user?.role ?? '']?.label ?? user?.role}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prénom</Label>
              <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <Input placeholder="+243 812 345 678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Email (non modifiable)</Label>
            <Input value={user?.email ?? ''} disabled className="bg-muted/50" />
          </div>

          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Onglet Sécurité ──────────────────────────────────────────────────────────
function SecuriteTab() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const rules = [
    { label: 'Au moins 8 caractères', ok: form.newPassword.length >= 8 },
    { label: 'Une majuscule', ok: /[A-Z]/.test(form.newPassword) },
    { label: 'Un chiffre', ok: /\d/.test(form.newPassword) },
    { label: 'Les mots de passe correspondent', ok: form.newPassword === form.confirm && form.confirm.length > 0 },
  ];

  const allOk = rules.every(r => r.ok);

  const mutation = useMutation({
    mutationFn: () => api.patch('/api/v1/auth/change-password', {
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    }),
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Mot de passe actuel incorrect'),
  });

  return (
    <div className="max-w-lg">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Changer le mot de passe</CardTitle>
          <CardDescription>Utilisez un mot de passe fort et unique</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Mot de passe actuel</Label>
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                placeholder="••••••••"
              />
              <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })}
                placeholder="••••••••"
              />
              <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowNew(!showNew)}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Confirmer le nouveau mot de passe</Label>
            <Input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} placeholder="••••••••" />
          </div>

          {/* Règles */}
          {form.newPassword.length > 0 && (
            <div className="space-y-1.5 bg-muted/40 rounded-lg p-3">
              {rules.map(r => (
                <div key={r.label} className={`flex items-center gap-2 text-xs ${r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {r.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  {r.label}
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.currentPassword || !allOk || mutation.isPending}
            className="bg-blue-600 hover:bg-blue-500"
          >
            {mutation.isPending ? 'Modification...' : 'Changer le mot de passe'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Onglet École ─────────────────────────────────────────────────────────────
function EcoleTab() {
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: async () => (await api.get('/api/v1/tenants/me')).data.data,
  });

  const t = tenant as any;
  const [form, setForm] = useState<any>(null);

  if (!form && t) {
    setForm({ name: t.name ?? '', email: t.email ?? '', phone: t.phone ?? '', address: t.address ?? '' });
  }

  const mutation = useMutation({
    mutationFn: () => api.put('/api/v1/tenants/me', form),
    onSuccess: () => toast.success('Paramètres de l\'école sauvegardés'),
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  if (isLoading) return <Skeleton className="h-64 w-full max-w-lg" />;

  return (
    <div className="max-w-lg">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Informations de l'établissement</CardTitle>
          <CardDescription>Ces informations apparaissent sur les documents officiels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">{t?.name}</p>
              <p className="text-xs text-muted-foreground">Slug : <code className="bg-muted px-1 rounded">{t?.slug}</code></p>
              <Badge variant="secondary" className="text-xs mt-0.5">{t?.subscriptionPlan} • {t?.schoolType}</Badge>
            </div>
          </div>

          <Separator />

          {form && (
            <>
              <div className="space-y-1.5">
                <Label>Nom de l'établissement</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Adresse</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
                {mutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Dialog Nouvel utilisateur ────────────────────────────────────────────────
function NouvelUtilisateurDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/users', form),
    onSuccess: () => {
      toast.success('Utilisateur créé');
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
      setForm({ firstName: '', lastName: '', email: '', phone: '', role: '', password: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la création'),
  });

  const valid = form.firstName && form.lastName && form.email && form.role && form.password.length >= 6;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouvel utilisateur</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prénom *</Label>
              <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle *</Label>
              <Select onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLES).map(([k, { label }]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mot de passe temporaire *</Label>
            <div className="relative">
              <Input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 caractères" />
              <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Création...' : 'Créer le compte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Onglet Utilisateurs ──────────────────────────────────────────────────────
function UtilisateursTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user: me } = useAuthStore();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/api/v1/users')).data.data ?? [],
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/users/${id}/toggle`),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  const list = users as any[];

  return (
    <>
      <NouvelUtilisateurDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Comptes utilisateurs ({list.length})</CardTitle>
              <CardDescription className="mt-0.5">Gérez les accès à SmartSchool ERP</CardDescription>
            </div>
            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />Nouvel utilisateur
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead className="text-center">Actif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : list.map((u: any) => {
                const r = ROLES[u.role] ?? { label: u.role, color: '' };
                const isMe = u.id === me?.id;
                return (
                  <TableRow key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-700 font-semibold">
                            {getInitials(u.firstName, u.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{u.firstName} {u.lastName} {isMe && <span className="text-xs text-muted-foreground">(moi)</span>}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.phone ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Jamais'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={u.isActive}
                        disabled={isMe || toggleMutation.isPending}
                        onCheckedChange={() => toggleMutation.mutate(u.id)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Vue principale ───────────────────────────────────────────────────────────
export function ParametresView() {
  const { user } = useAuthStore();
  // La création/modification de compte et les réglages école exigent
  // ADMIN/DIRECTEUR côté API — masquer ces onglets évite un 403 confus pour
  // les autres rôles (enseignant, comptable, etc.).
  const estPrivilegie = user?.isSuperAdmin || ['ADMIN', 'DIRECTEUR'].includes((user as any)?.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">Gérez votre profil, la sécurité et les paramètres de l'école</p>
      </div>

      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil" className="gap-2"><User className="w-4 h-4" />Profil</TabsTrigger>
          <TabsTrigger value="securite" className="gap-2"><Lock className="w-4 h-4" />Sécurité</TabsTrigger>
          {estPrivilegie && <TabsTrigger value="ecole" className="gap-2"><Building2 className="w-4 h-4" />École</TabsTrigger>}
          {estPrivilegie && <TabsTrigger value="utilisateurs" className="gap-2"><Users className="w-4 h-4" />Utilisateurs</TabsTrigger>}
        </TabsList>
        <TabsContent value="profil" className="mt-4"><ProfilTab /></TabsContent>
        <TabsContent value="securite" className="mt-4"><SecuriteTab /></TabsContent>
        {estPrivilegie && <TabsContent value="ecole" className="mt-4"><EcoleTab /></TabsContent>}
        {estPrivilegie && <TabsContent value="utilisateurs" className="mt-4"><UtilisateursTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
