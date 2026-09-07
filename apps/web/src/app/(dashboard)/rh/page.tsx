import type { Metadata } from 'next';
import { RhView } from '@/components/rh/rh-view';

export const metadata: Metadata = { title: 'Ressources Humaines' };

export default function RhPage() {
  return <RhView />;
}
