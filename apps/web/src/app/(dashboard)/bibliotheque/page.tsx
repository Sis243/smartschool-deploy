import type { Metadata } from 'next';
import { BibliothequeView } from '@/components/bibliotheque/bibliotheque-view';

export const metadata: Metadata = { title: 'Bibliothèque' };

export default function BibliotequePage() {
  return <BibliothequeView />;
}
