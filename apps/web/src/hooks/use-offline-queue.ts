'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { drainQueue, getQueueItems, QUEUE_CHANGED_EVENT } from '@/lib/offline-queue';

// Filet de sécurité qui marche sur tous les navigateurs (y compris iOS
// Safari, qui ne supporte pas Background Sync) : tant que l'app est ouverte,
// on retente la file dès que `navigator.onLine` repasse à vrai. Le service
// worker (sync-presences) prend le relais si l'onglet est fermé, sur les
// navigateurs qui le supportent.
export function useOfflineQueue() {
  const [pending, setPending] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    const items = await getQueueItems();
    setPending(items.length);
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const { synced, failed } = await drainQueue(api);
      if (synced > 0) {
        toast.success(`${synced} action${synced > 1 ? 's' : ''} synchronisée${synced > 1 ? 's' : ''} après reconnexion`);
      }
      if (failed > 0) {
        toast.error(`${failed} action${failed > 1 ? 's' : ''} en attente n'a/n'ont pas pu être appliquée${failed > 1 ? 's' : ''}`);
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refresh();

    const onOnline = () => { setIsOnline(true); sync(); };
    const onOffline = () => setIsOnline(false);
    const onChanged = () => refresh();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener(QUEUE_CHANGED_EVENT, onChanged);

    // Le service worker peut lui-même vider la file en arrière-plan
    // (Background Sync, onglet potentiellement inactif) — on rafraîchit le
    // badge quand il nous prévient.
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'offline-queue-synced') refresh();
    };
    navigator.serviceWorker?.addEventListener?.('message', onSwMessage);

    if (navigator.onLine) sync();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener(QUEUE_CHANGED_EVENT, onChanged);
      navigator.serviceWorker?.removeEventListener?.('message', onSwMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pending, isOnline, syncing };
}
