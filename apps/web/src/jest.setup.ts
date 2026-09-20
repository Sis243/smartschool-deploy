// jsdom (l'environnement de test) n'expose pas `structuredClone`, contrairement
// à un vrai navigateur — nécessaire à fake-indexeddb pour cloner les valeurs
// stockées. Nos objets de file (url/method/body/label/createdAt) sont de
// simples JSON, donc un clone JSON suffit pour les tests.
if (typeof structuredClone === 'undefined') {
  (global as unknown as { structuredClone: (v: unknown) => unknown }).structuredClone = (v: unknown) =>
    JSON.parse(JSON.stringify(v));
}
