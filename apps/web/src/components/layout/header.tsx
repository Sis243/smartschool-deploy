'use client';

import { Bell, BellOff, LogOut, Moon, Sun, Settings, User, WifiOff, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { getInitials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

export function Header() {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  const { pending, isOnline, syncing } = useOfflineQueue();

  const handleTogglePush = async () => {
    if (!isSupported) {
      toast.error("Les notifications push ne sont pas supportées sur cet appareil/navigateur");
      return;
    }
    if (isSubscribed) {
      await unsubscribe();
      toast.success('Notifications push désactivées');
    } else {
      const ok = await subscribe();
      toast[ok ? 'success' : 'error'](
        ok ? 'Notifications push activées' : 'Autorisation refusée ou indisponible',
      );
    }
  };

  return (
    <header className="h-14 border-b border-border/60 bg-background/95 backdrop-blur-sm flex items-center justify-between px-5 sticky top-0 z-40">
      <div>
        <p className="text-sm text-muted-foreground">
          Bienvenue,{' '}
          <span className="font-semibold text-foreground">
            {user?.firstName} {user?.lastName}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-1">
        {/* Hors-ligne / synchronisation en attente */}
        {(!isOnline || pending > 0) && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 mr-1">
                {!isOnline ? <WifiOff className="w-3.5 h-3.5" /> : <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />}
                {!isOnline
                  ? (pending > 0 ? `Hors connexion · ${pending} en attente` : 'Hors connexion')
                  : `Synchronisation... ${pending}`}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {!isOnline
                ? "Connexion perdue : les présences saisies sont enregistrées localement et seront envoyées automatiquement dès le retour de la connexion."
                : 'Envoi des actions enregistrées hors-ligne en cours.'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Theme toggle */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 text-muted-foreground"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Changer le thème</TooltipContent>
        </Tooltip>

        {/* Notifications push */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={loading}
              onClick={handleTogglePush}
              className="h-9 w-9 text-muted-foreground relative"
            >
              {isSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {isSubscribed && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border border-background" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSubscribed ? 'Notifications push activées (cliquer pour désactiver)' : 'Activer les notifications push'}
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 flex items-center gap-2 px-2 rounded-lg">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                  {user ? getInitials(user.firstName, user.lastName) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">{user?.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/parametres')}>
              <User className="mr-2 h-4 w-4" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/parametres')}>
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
