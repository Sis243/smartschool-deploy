import type { Metadata } from 'next';

// Le staff et les parents ont chacun leur PWA : le service worker s'enregistre
// une seule fois au niveau racine (app/layout.tsx) pour toute l'app, seul le
// manifest change ici pour donner au portail parent son propre nom/icône/
// start_url à l'installation, distincts du tableau de bord staff.
export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SmartSchool' },
  other: { 'mobile-web-app-capable': 'yes' },
  icons: { apple: '/icon-192.png' },
};

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
