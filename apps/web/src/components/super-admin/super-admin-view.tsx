'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, GraduationCap, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/lib/api';
import { MODULES_ACTIVABLES, MODULES_LABELS, ModuleCle } from '@/lib/modules';

function ModulesDialog({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [modules, setModules] = useState<ModuleCle[]>(tenant?.modulesActifs ?? []);

  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/v1/tenants/${tenant.id}/modules`, { modules }),
    onSuccess: () => {
      toast.success('Modules mis à jour');
      qc.invalidateQueries({ queryKey: ['tenants-super-admin'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const toggle = (m: ModuleCle) =>
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  return (
    <Dialog open={!!tenant} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Modules — {tenant?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {MODULES_ACTIVABLES.map((m) => (
            <div key={m} className="flex items-center justify-between py-1">
              <span className="text-sm">{MODULES_LABELS[m]}</span>
              <Switch checked={modules.includes(m)} onCheckedChange={() => toggle(m)} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SuperAdminView() {
  const qc = useQueryClient();
  const [tenantModules, setTenantModules] = useState<any | null>(null);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants-super-admin'],
    queryFn: async () => (await api.get('/api/v1/tenants')).data.data,
  });

  const toggleActif = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/tenants/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenants-super-admin'] }),
    onError: () => toast.error('Erreur'),
  });

  const totalEcoles = tenants.length;
  const totalEleves = tenants.reduce((s: number, t: any) => s + (t._count?.eleves ?? 0), 0);
  const totalUsers = tenants.reduce((s: number, t: any) => s + (t._count?.users ?? 0), 0);

  return (
    <div className="space-y-6">
      {tenantModules && <ModulesDialog tenant={tenantModules} onClose={() => setTenantModules(null)} />}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Super Administration</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestion des établissements et de leurs modules souscrits</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Établissements', value: totalEcoles, icon: Building2, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Élèves (total)', value: totalEleves, icon: GraduationCap, color: 'bg-emerald-500/10 text-emerald-500' },
          { label: 'Utilisateurs (total)', value: totalUsers, icon: Users, color: 'bg-purple-500/10 text-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader><CardTitle className="text-base">Établissements</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>École</TableHead><TableHead>Type</TableHead>
                <TableHead>Modules actifs</TableHead><TableHead>Statut</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : tenants.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Aucun établissement</TableCell></TableRow>
              ) : tenants.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.slug}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.schoolType}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(t.modulesActifs ?? []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">Aucun</span>
                      ) : t.modulesActifs.map((m: ModuleCle) => (
                        <Badge key={m} variant="secondary" className="text-[10px]">{MODULES_LABELS[m] ?? m}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleActif.mutate(t.id)} className="cursor-pointer">
                      <Badge variant={t.isActive ? 'default' : 'destructive'} className="text-xs">
                        {t.isActive ? 'Actif' : 'Suspendu'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setTenantModules(t)}>
                      <Settings2 className="w-3.5 h-3.5" />Modules
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
