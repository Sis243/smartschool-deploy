const CACHE_NAME = 'smartschool-v2';
// '/' et '/parent' sont des redirections serveur (next/navigation redirect()) —
// Cache.addAll() rejette toute réponse redirigée et ferait échouer l'install
// entière du service worker si on les incluait ici. On précache uniquement
// de vraies pages statiques.
const STATIC_ASSETS = ['/login', '/parent/login'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  let payload = { title: 'SmartSchool', body: '' };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    payload.body = event.data ? event.data.text() : '';
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'SmartSchool', {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

// ── File d'attente hors-ligne (présences) ───────────────────────────────────
// Schéma IndexedDB dupliqué depuis src/lib/offline-queue.ts (aucun bundler
// pour ce fichier, donc pas d'import possible) : garder les deux en phase si
// ce schéma évolue. Permet de rejouer les présences mises en attente même si
// l'onglet a été fermé, dès que le système accorde une opportunité de sync
// (Chrome/Android uniquement — Safari/iOS n'a pas Background Sync, mais la
// page elle-même rejoue la file au premier plan dès la reconnexion).
const OFFLINE_DB_NAME = 'smartschool-offline';
const OFFLINE_DB_VERSION = 1;

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getOfflineQueue(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly');
    const req = tx.objectStore('queue').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getStoredAccessToken(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get('access_token');
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

function deleteOfflineQueueItem(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function drainOfflineQueueInBackground() {
  const db = await openOfflineDb();
  const token = await getStoredAccessToken(db);
  const items = await getOfflineQueue(db);
  items.sort((a, b) => a.createdAt - b.createdAt);

  for (const item of items) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(item.url, { method: item.method, headers, body: JSON.stringify(item.body) });
      // Une réponse serveur (même une erreur métier) signifie que la requête
      // a été traitée : on la retire dans tous les cas pour ne pas la
      // rejouer indéfiniment. Seule une exception fetch (pas de réponse du
      // tout, coupure réseau) doit interrompre la boucle.
      await deleteOfflineQueueItem(db, item.id);
      if (res.ok) {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((c) => c.postMessage({ type: 'offline-queue-synced', label: item.label }));
      }
    } catch {
      break;
    }
  }
  db.close();
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-presences') {
    event.waitUntil(drainOfflineQueueInBackground());
  }
});

self.addEventListener('fetch', (event) => {
  // Network-first for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('{"error":"offline"}', {
        headers: { 'Content-Type': 'application/json' },
      })),
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
