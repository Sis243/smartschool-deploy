'use client';

import { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';

// Android/Chrome : capte l'évènement natif et déclenche l'invite d'installation.
// iOS Safari ne déclenche jamais beforeinstallprompt — on y affiche à la
// place l'explication manuelle (Partager > Sur l'écran d'accueil).
export function InstallPwaButton() {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [installe, setInstalle] = useState(false);
  const [afficherInstructionsIos, setAfficherInstructionsIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (standalone) { setInstalle(true); return; }

    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: any) => { e.preventDefault(); setPromptEvent(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const onInstalled = () => setInstalle(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installe) return null;
  if (!promptEvent && !isIos) return null;

  const installer = async () => {
    if (promptEvent) {
      promptEvent.prompt();
      await promptEvent.userChoice;
      setPromptEvent(null);
    } else if (isIos) {
      setAfficherInstructionsIos(true);
    }
  };

  return (
    <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
      <button
        type="button"
        onClick={installer}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-700"
      >
        <Download className="w-4 h-4" />
        Installer l&apos;application sur mon téléphone
      </button>
      {afficherInstructionsIos && (
        <p className="mt-2 text-xs text-blue-600 flex items-center gap-1.5 justify-center text-center">
          <Share className="w-3.5 h-3.5 shrink-0" />
          Appuyez sur le bouton Partager de Safari, puis « Sur l&apos;écran d&apos;accueil ».
        </p>
      )}
    </div>
  );
}
