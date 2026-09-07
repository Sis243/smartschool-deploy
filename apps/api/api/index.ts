import { createApp } from '../src/create-app';

// Point d'entrée serverless Vercel : réutilise createApp() (partagé avec
// main.ts) mais appelle app.init() au lieu de app.listen() — pas de port à
// écouter en serverless, Vercel invoque directement le handler Express sous-
// jacent à chaque requête. L'instance Nest est mise en cache au niveau du
// module pour être réutilisée entre invocations "chaudes" du même conteneur.
let cachedHandler: any;

async function bootstrap() {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    cachedHandler = app.getHttpAdapter().getInstance();
  }
  return cachedHandler;
}

export default async function handler(req: any, res: any) {
  const expressApp = await bootstrap();
  return expressApp(req, res);
}
