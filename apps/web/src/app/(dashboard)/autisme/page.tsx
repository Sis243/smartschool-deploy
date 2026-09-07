import type { Metadata } from 'next';
import { AutismeView } from '@/components/autisme/autisme-view';

export const metadata: Metadata = { title: 'Module Autisme' };

export default function AutismePage() {
  return <AutismeView />;
}
