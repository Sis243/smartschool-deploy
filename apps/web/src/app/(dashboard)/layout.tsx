'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();

  // Un super admin n'appartient à aucune école — ces écrans (élèves,
  // finances...) n'ont pas de sens pour lui, sa console est /super-admin.
  useEffect(() => {
    if (user?.isSuperAdmin) router.replace('/super-admin');
  }, [user, router]);

  if (user?.isSuperAdmin) return null;

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
