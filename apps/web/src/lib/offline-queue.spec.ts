import 'fake-indexeddb/auto';

// On exerce le vrai IndexedDB (via le polyfill fake-indexeddb, pas un mock
// de nos propres fonctions) pour prouver que les transactions/ordre/erreurs
// se comportent vraiment comme prévu — un mock de `indexedDB.open` n'aurait
// prouvé que "la fonction a été appelée", pas que la file fonctionne.
import { enqueue, getQueueItems, drainQueue, saveAuthSnapshot } from './offline-queue';

// navigator.serviceWorker n'existe pas dans jsdom : enqueue() tente
// d'enregistrer un Background Sync en best-effort, ça doit échouer
// silencieusement sans faire planter le test.
describe('offline-queue', () => {
  afterEach(async () => {
    // Repartir d'une base vide entre les tests (fake-indexeddb persiste en mémoire process).
    const items = await getQueueItems();
    const api = { request: jest.fn().mockResolvedValue(undefined) };
    for (const _ of items) await drainQueue(api as any);
  });

  it('conserve les éléments mis en attente dans leur ordre d\'ajout', async () => {
    await enqueue({ url: 'https://api.test/a', method: 'POST', body: { a: 1 }, label: 'A' });
    await enqueue({ url: 'https://api.test/b', method: 'POST', body: { b: 2 }, label: 'B' });
    await enqueue({ url: 'https://api.test/c', method: 'PUT', body: { c: 3 }, label: 'C' });

    const items = await getQueueItems();
    expect(items.map((i) => i.label)).toEqual(['A', 'B', 'C']);
    expect(items[0].method).toBe('POST');
    expect(items[2].method).toBe('PUT');
  });

  it('retire un élément de la file une fois synchronisé avec succès', async () => {
    await enqueue({ url: 'https://api.test/scan', method: 'POST', body: { eleveId: 'e1' }, label: 'Pointage' });

    const api = { request: jest.fn().mockResolvedValue({ status: 200 }) };
    const { synced, failed } = await drainQueue(api as any);

    expect(synced).toBe(1);
    expect(failed).toBe(0);
    expect(api.request).toHaveBeenCalledWith({ url: 'https://api.test/scan', method: 'POST', data: { eleveId: 'e1' } });
    expect(await getQueueItems()).toHaveLength(0);
  });

  it('arrête la synchronisation à la première vraie coupure réseau, en gardant les éléments suivants pour plus tard', async () => {
    await enqueue({ url: 'https://api.test/1', method: 'POST', body: {}, label: '1' });
    await enqueue({ url: 'https://api.test/2', method: 'POST', body: {}, label: '2' });
    await enqueue({ url: 'https://api.test/3', method: 'POST', body: {}, label: '3' });

    // Erreur réseau réelle : pas de `response` sur l'erreur (axios ne reçoit
    // aucune réponse du serveur — coupure, pas une erreur métier).
    const api = { request: jest.fn().mockRejectedValueOnce(new Error('Network Error')) };
    const { synced, failed } = await drainQueue(api as any);

    expect(synced).toBe(0);
    expect(failed).toBe(0);
    expect(api.request).toHaveBeenCalledTimes(1); // s'arrête net, ne tente pas 2 et 3
    const restants = await getQueueItems();
    expect(restants.map((i) => i.label)).toEqual(['1', '2', '3']);
  });

  it('retire définitivement un élément qui échoue avec une vraie réponse serveur (erreur métier), et continue avec le suivant', async () => {
    await enqueue({ url: 'https://api.test/invalide', method: 'POST', body: {}, label: 'Invalide' });
    await enqueue({ url: 'https://api.test/valide', method: 'POST', body: {}, label: 'Valide' });

    const erreurServeur = Object.assign(new Error('Bad Request'), { response: { status: 400 } });
    const api = {
      request: jest.fn()
        .mockRejectedValueOnce(erreurServeur)
        .mockResolvedValueOnce({ status: 200 }),
    };

    const { synced, failed } = await drainQueue(api as any);

    expect(failed).toBe(1); // "Invalide" ne sera jamais rejouée
    expect(synced).toBe(1); // "Valide" a quand même été envoyée après
    expect(await getQueueItems()).toHaveLength(0);
  });

  it('ne plante pas si aucun jeton n\'a encore été enregistré', async () => {
    await expect(saveAuthSnapshot('un-vrai-jwt')).resolves.toBeUndefined();
  });
});
