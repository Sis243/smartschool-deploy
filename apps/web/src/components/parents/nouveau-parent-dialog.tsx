'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/lib/api';

export function NouveauParentDialog({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (parent: any) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '', email: '' });

  const mutation = useMutation({
    mutationFn: () => api.post('/api/v1/eleves/parents', {
      prenom: form.prenom, nom: form.nom, telephone: form.telephone, email: form.email,
    }),
    onSuccess: (res: any) => {
      toast.success('Parent ajouté');
      qc.invalidateQueries({ queryKey: ['parents'] });
      onCreated(res.data.data);
      setForm({ prenom: '', nom: '', telephone: '', email: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erreur lors de l\'ajout'),
  });

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const valide = form.prenom.trim() && form.nom.trim() && form.telephone.trim() && emailValide;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouveau parent / tuteur</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prénom *</Label>
              <Input placeholder="ex: Alice" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input placeholder="ex: Mutamba" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Téléphone *</Label>
            <Input placeholder="+243 8XX XXX XXX" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" placeholder="ex: alice@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <p className="text-xs text-muted-foreground">Obligatoire — le code d&apos;accès au portail parent est envoyé à cette adresse.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} disabled={!valide || mutation.isPending} className="bg-blue-600 hover:bg-blue-500">
            {mutation.isPending ? 'Ajout...' : 'Ajouter le parent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
