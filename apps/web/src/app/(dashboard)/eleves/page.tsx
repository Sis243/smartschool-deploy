import type { Metadata } from 'next';
import { ElevesTable } from '@/components/eleves/eleves-table';

export const metadata: Metadata = { title: 'Gestion des élèves' };

export default function ElevesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Élèves</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestion des inscriptions et dossiers élèves</p>
        </div>
      </div>
      <ElevesTable />
    </div>
  );
}
