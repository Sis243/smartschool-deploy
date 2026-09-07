import type { Metadata } from 'next';
import { MaternelleView } from '@/components/maternelle/maternelle-view';

export const metadata: Metadata = { title: 'Maternelle' };

export default function MaternellePage() {
  return <MaternelleView />;
}
