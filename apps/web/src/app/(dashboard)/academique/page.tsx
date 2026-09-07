import type { Metadata } from 'next';
import { AcademiqueView } from '@/components/academique/academique-view';

export const metadata: Metadata = { title: 'Académique' };

export default function AcademiquePage() {
  return <AcademiqueView />;
}
