import type { Metadata } from 'next';
import { SuperAdminView } from '@/components/super-admin/super-admin-view';

export const metadata: Metadata = { title: 'Super Administration' };

export default function SuperAdminPage() {
  return <SuperAdminView />;
}
