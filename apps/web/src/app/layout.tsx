import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// PWA app-wide : manifest "staff" par défaut (tableau de bord), remplacé par
// le manifest "Portail Parent" pour les pages sous /parent (app/parent/layout.tsx).
// L'enregistrement du service worker se fait une seule fois ici, à la racine.
export const metadata: Metadata = {
  title: {
    template: '%s | SmartSchool ERP',
    default: 'SmartSchool ERP - Gestion Scolaire',
  },
  description: 'Plateforme de gestion scolaire multi-établissements - Smart IT Solution',
  manifest: '/manifest-app.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SmartSchool' },
  other: { 'mobile-web-app-capable': 'yes' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          <PwaRegister />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#363636', color: '#fff' },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
