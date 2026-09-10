'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Mail, Phone, Send, Users, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';

const canalConfig: Record<string, { label: string; icon: any; color: string }> = {
  SMS:       { label: 'SMS',       icon: Phone,          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  EMAIL:     { label: 'Email',     icon: Mail,           color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  WHATSAPP:  { label: 'WhatsApp',  icon: MessageSquare,  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  PUSH:      { label: 'Push',      icon: Send,           color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
};

const statutConfig: Record<string, { label: string; icon: any; cls: string }> = {
  ENVOYE:    { label: 'Envoyé',    icon: CheckCircle, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  EN_COURS:  { label: 'En cours',  icon: Clock,       cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  ECHEC:     { label: 'Échec',     icon: XCircle,     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  EN_ATTENTE:{ label: 'En attente',icon: Clock,       cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

// ─── Onglet Composer ──────────────────────────────────────────────────────────
function ComposerTab() {
  const qc = useQueryClient();
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [canaux, setCanaux] = useState<string[]>(['SMS']);
  const [cible, setCible] = useState<'tous' | 'parents' | 'personnel'>('parents');

  const { data: personnel = [] } = useQuery({
    queryKey: ['personnel'],
    queryFn: async () => (await api.get('/api/v1/rh/personnel')).data.data,
  });
  const { data: parents = [] } = useQuery({
    queryKey: ['parents'],
    queryFn: async () => (await api.get('/api/v1/eleves/parents')).data.data,
  });

  const toggleCanal = (canal: string) =>
    setCanaux((prev) => prev.includes(canal) ? prev.filter((c) => c !== canal) : [...prev, canal]);

  const destinataires = cible === 'personnel'
    ? (personnel as any[]).map((p: any) => p.id)
    : (parents as any[]).map((p: any) => p.id);

  const send = useMutation({
    mutationFn: () => api.post('/api/v1/communication/notifications', {
      titre, contenu, canaux, destinataires, cible: cible === 'personnel' ? 'personnel' : 'parents',
    }),
    onSuccess: () => {
      toast.success(`Envoi lancé vers ${destinataires.length} destinataire(s) — voir l'historique pour le statut de livraison`);
      qc.invalidateQueries({ queryKey: ['notifications'] });
      setTitre(''); setContenu('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de l\'envoi'),
  });

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Composer un message</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Canaux */}
        <div className="space-y-2">
          <Label>Canaux d'envoi</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(canalConfig).map(([key, { label, icon: Icon, color }]) => (
              <button
                key={key}
                onClick={() => toggleCanal(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  canaux.includes(key)
                    ? `${color} border-current`
                    : 'bg-muted/50 text-muted-foreground border-border hover:border-foreground/20'
                }`}
              >
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Destinataires */}
        <div className="space-y-2">
          <Label>Destinataires</Label>
          <div className="flex gap-2">
            {[
              { key: 'parents', label: `Parents (${(parents as any[]).length})`, icon: Users },
              { key: 'personnel', label: `Personnel (${(personnel as any[]).length})`, icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setCible(key as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  cible === key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-muted/50 text-muted-foreground border-border hover:border-foreground/20'
                }`}
              >
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Message */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Titre / Objet *</Label>
            <Input
              placeholder="ex: Réunion des parents le 20 mai"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Message *</Label>
            <textarea
              rows={5}
              placeholder="Rédigez votre message ici..."
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{contenu.length} caractères</p>
          </div>
        </div>

        {/* Résumé + envoi */}
        <div className="bg-muted/40 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{destinataires.length}</span> destinataire(s) via{' '}
            <span className="font-medium text-foreground">{canaux.join(', ') || '—'}</span>
          </div>
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-500"
            disabled={!titre || !contenu || !canaux.length || !destinataires.length || send.isPending}
            onClick={() => send.mutate()}
          >
            <Send className="w-4 h-4" />
            {send.isPending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Onglet Historique ────────────────────────────────────────────────────────
function HistoriqueTab() {
  const [search, setSearch] = useState('');
  const { data: notificationsToutes = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/api/v1/communication/notifications?limit=30')).data.data,
  });
  const notifications = (notificationsToutes as any[]).filter((n) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${n.titre} ${n.contenu}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3">
      {(notificationsToutes as any[]).length > 0 && (
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher un message..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}
      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
      ) : (notifications as any[]).length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{search ? `Aucun message ne correspond à « ${search} »` : 'Aucune notification envoyée'}</p>
          </CardContent>
        </Card>
      ) : (
        (notifications as any[]).map((n: any) => {
          const s = statutConfig[n.statut] ?? { label: n.statut, icon: Clock, cls: '' };
          const SIcon = s.icon;
          return (
            <Card key={n.id} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{n.titre}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.contenu}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{n._count?.destinataires ?? 0} destinataire(s)</span>
                      <span>{new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${s.cls}`}>
                    <SIcon className="w-3 h-3" />{s.label}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ─── Vue principale ───────────────────────────────────────────────────────────
export function CommunicationView() {
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/api/v1/communication/notifications?limit=100')).data.data,
  });
  const notifs = notifications as any[];
  const envoyes = notifs.filter((n: any) => n.statut === 'ENVOYE').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communication</h1>
        <p className="text-muted-foreground text-sm mt-1">Envoi de notifications SMS, Email, WhatsApp et Push</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Notifications envoyées', value: envoyes, icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-500' },
          { label: 'Total messages', value: notifs.length, icon: MessageSquare, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Canaux disponibles', value: '4', icon: Send, color: 'bg-violet-500/10 text-violet-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="composer">
        <TabsList>
          <TabsTrigger value="composer">Composer</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>
        <TabsContent value="composer" className="mt-4"><ComposerTab /></TabsContent>
        <TabsContent value="historique" className="mt-4"><HistoriqueTab /></TabsContent>
      </Tabs>
    </div>
  );
}
