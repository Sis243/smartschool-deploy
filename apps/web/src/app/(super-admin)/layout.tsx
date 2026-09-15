'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';

// Coquille volontairement distincte du tableau de bord d'école (pas de
// Sidebar avec les modules d'une école : Élèves, Finances... n'ont aucun
// sens pour un compte qui n'appartient à aucun établissement).
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && !user.isSuperAdmin) router.replace('/dashboard');
  }, [user, router]);

  if (user && !user.isSuperAdmin) return null;

  // `dark` forcé (indépendant du thème choisi par l'utilisateur) : la
  // console super admin est une coquille volontairement distincte du reste
  // de l'app, pas juste une page de plus dans le dashboard d'école.
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">SmartSchool</p>
              <p className="text-muted-foreground text-xs leading-tight">Super Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.firstName} {user?.lastName}</span>
            <Button variant="ghost" size="sm" className="gap-2" onClick={logout}>
              <LogOut className="w-4 h-4" />Déconnexion
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
