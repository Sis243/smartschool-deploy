import type { Metadata } from 'next';
import { FinancesView } from '@/components/finances/finances-view';

export const metadata: Metadata = { title: 'Finances' };

export default function FinancesPage() {
  return <FinancesView />;
}
