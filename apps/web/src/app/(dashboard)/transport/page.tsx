import type { Metadata } from 'next';
import { TransportView } from '@/components/transport/transport-view';

export const metadata: Metadata = { title: 'Transport' };

export default function TransportPage() {
  return <TransportView />;
}
