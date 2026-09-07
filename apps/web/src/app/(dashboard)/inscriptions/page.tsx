import type { Metadata } from 'next';
import { InscriptionsView } from '@/components/inscriptions/inscriptions-view';

export const metadata: Metadata = { title: 'Inscriptions en ligne' };

export default function InscriptionsPage() {
  return <InscriptionsView />;
}
