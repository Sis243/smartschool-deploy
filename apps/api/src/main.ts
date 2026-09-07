import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createApp } from './create-app';

// Point d'entrée pour un déploiement serveur classique (Docker/local) — la
// fonction serverless Vercel (api/index.ts) réutilise createApp() sans appeler
// listen().
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await createApp();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  await app.listen(port);
  logger.log(`SmartSchool API démarrée sur: http://localhost:${port}`);
}

bootstrap();
