'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { isParentLoggedIn, getParentInfo } from '@/lib/parent-auth';
import parentApi from '@/lib/parent-api';

const NAV = [
  {
    href: '/parent/dashboard',
    label: 'Accueil',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/parent/factures',
    label: 'Paiements',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: '/parent/notifications',
    label: 'Notifs',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

export default function ParentPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [parent, setParent] = useState<any>(null);

  useEffect(() => {
    if (!isParentLoggedIn()) {
      router.replace('/parent/login');
      return;
    }
    setParent(getParentInfo());
  }, [router]);

  // Actualisation toutes les 30s pour un badge quasi temps réel sans
  // nécessiter d'infrastructure websocket.
  const { data: dashboard } = useQuery({
    queryKey: ['parent-dashboard-badge'],
    queryFn: async () => (await parentApi.get('/api/v1/parent/dashboard')).data.data,
    enabled: !!parent,
    refetchInterval: 30_000,
  });
  const notifNonLues: number = dashboard?.notifNonLues ?? 0;

  if (!parent) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Top bar */}
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-xs opacity-80">Portail Parent</p>
          <p className="font-semibold text-sm">{parent.prenom} {parent.nom}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
          {parent.prenom?.[0]}{parent.nom?.[0]}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 flex z-10">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const isNotifs = item.href === '/parent/notifications';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors relative ${
                active ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <span className="relative">
                {item.icon}
                {isNotifs && notifNonLues > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {notifNonLues > 9 ? '9+' : notifNonLues}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
