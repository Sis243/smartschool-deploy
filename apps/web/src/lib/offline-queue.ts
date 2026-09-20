// File d'attente hors-ligne pour les actions de présence (pointage facial,
// présences par classe, présences du personnel). Persistée dans IndexedDB
// (contrairement à localStorage, accessible aussi depuis le service worker)
// afin qu'une synchronisation en arrière-plan (Background Sync) puisse
// rejouer les requêtes même si l'onglet a été fermé — voir sw.js.
//
// Le service worker ne peut pas importer ce module (pas de bundler pour
// public/sw.js) : le schéma IndexedDB (nom de base, stores, version) est
// dupliqué en JS pur dans sw.js. Si ce schéma change ici, le répercuter
// là-bas.
const DB_NAME = 'smartschool-offline';
const DB_VERSION = 1;
const STORE_QUEUE = 'queue';
const STORE_META = 'meta';

export const QUEUE_CHANGED_EVENT = 'smartschool-offline-queue-changed';

// La file stocke des URLs absolues : nécessaire pour que le service worker
// (fetch natif, sans baseURL axios) puisse rejouer la requête lui-même.
export function absoluteApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return `${base}${path}`;
}

export interface QueueItem {
  id: number;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  body: unknown;
  label: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
  }
}

async function tryRegisterBackgroundSync() {
  try {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register(
        'sync-presences',
      );
    }
  } catch {
    // Best-effort : pas supporté (Safari/iOS notamment) — la reprise à la
    // reconnexion pendant que l'app est ouverte (useOfflineQueue) reste le
    // filet de sécurité qui marche partout.
  }
}

// Copie du jeton d'accès dans IndexedDB à chaque fois qu'il est (re)posé en
// localStorage, pour que le service worker puisse authentifier une requête
// rejouée en arrière-plan sans jamais avoir accès au localStorage de la page.
export async function saveAuthSnapshot(accessToken: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      tx.objectStore(STORE_META).put({ key: 'access_token', value: accessToken });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Pas bloquant : au pire la synchro en arrière-plan (tab fermé) ne
    // pourra pas s'authentifier, mais la synchro au premier plan fonctionne
    // toujours via l'intercepteur axios normal.
  }
}

export async function enqueue(item: Omit<QueueItem, 'id' | 'createdAt'>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).add({ ...item, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  notifyChanged();
  await tryRegisterBackgroundSync();
}

export async function getQueueItems(): Promise<QueueItem[]> {
  const db = await openDb();
  const items = await new Promise<QueueItem[]>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const req = tx.objectStore(STORE_QUEUE).getAll();
    req.onsuccess = () => resolve(req.result as QueueItem[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

async function removeQueueItem(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

interface ApiLike {
  request(config: { url: string; method: string; data?: unknown }): Promise<unknown>;
}

// Rejoue la file dans l'ordre, en s'appuyant sur l'instance axios de la page
// (donc sur son intercepteur de refresh token existant). S'arrête à la
// première erreur réseau réelle (pas de réponse du serveur) pour préserver
// l'ordre — une erreur métier (400/401/409...) signifie que le serveur A
// répondu : la requête ne réussira pas mieux au prochain essai, on la
// retire pour ne pas bloquer les suivantes indéfiniment.
export async function drainQueue(api: ApiLike): Promise<{ synced: number; failed: number }> {
  const items = await getQueueItems();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await api.request({ url: item.url, method: item.method, data: item.body });
      await removeQueueItem(item.id);
      synced += 1;
    } catch (err) {
      const hasResponse = !!(err as { response?: unknown })?.response;
      if (hasResponse) {
        await removeQueueItem(item.id);
        failed += 1;
        continue;
      }
      // Toujours hors-ligne : on arrête ici, on réessaiera à la prochaine
      // reconnexion. Les éléments restants ne sont pas perdus.
      break;
    }
  }
  if (synced > 0 || failed > 0) notifyChanged();
  return { synced, failed };
}
