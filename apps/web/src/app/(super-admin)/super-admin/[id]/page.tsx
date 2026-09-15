import type { Metadata } from 'next';
import { SuperAdminDetailView } from '@/components/super-admin/super-admin-detail-view';

export const metadata: Metadata = { title: "Tableau de bord de l'établissement" };

export default async function SuperAdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SuperAdminDetailView tenantId={id} />;
}
