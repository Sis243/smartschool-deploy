import { useCallback, useEffect, useState } from 'react';
import type { AxiosInstance } from 'axios';
import api from '@/lib/api';

// Une clé VAPID publique arrive en base64url — l'API PushManager attend un
// Uint8Array brut, d'où cette conversion (standard pour Web Push).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(client: AxiosInstance = api) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supporte = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supporte);
    if (!supporte) return;
    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    setLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') return false;

      const { data } = await client.get('/api/v1/push/public-key');
      const publicKey = data.data?.publicKey;
      if (!publicKey) return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const json = subscription.toJSON();
      await client.post('/api/v1/push/subscribe', {
        endpoint: json.endpoint,
        keys: json.keys,
      });
      setIsSubscribed(true);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await client.delete('/api/v1/push/unsubscribe', { data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe };
}
