import type { Metadata } from 'next';
import { CommunicationView } from '@/components/communication/communication-view';

export const metadata: Metadata = { title: 'Communication' };

export default function CommunicationPage() {
  return <CommunicationView />;
}
