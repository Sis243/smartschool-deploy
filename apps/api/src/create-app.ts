import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Configuration partagée entre le serveur classique (main.ts, Docker/local)
// et la fonction serverless Vercel (api/index.ts) — seule la présence ou
// non de app.listen() diffère entre les deux usages.
export async function createApp() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // En production, ne jamais démarrer avec les secrets JWT par défaut codés
  // en dur dans configuration.ts — sinon n'importe qui peut forger un jeton
  // (y compris super admin) en connaissant ces valeurs publiques du dépôt.
  if (nodeEnv === 'production') {
    const secretsParDefaut = ['smartschool-secret-change-in-production', 'smartschool-refresh-secret'];
    const jwtSecret = configService.get<string>('jwt.secret');
    const jwtRefreshSecret = configService.get<string>('jwt.refreshSecret');
    if (!jwtSecret || !jwtRefreshSecret || secretsParDefaut.includes(jwtSecret) || secretsParDefaut.includes(jwtRefreshSecret)) {
      throw new Error(
        'JWT_SECRET / JWT_REFRESH_SECRET doivent être définis à des valeurs réelles en production — arrêt du démarrage.',
      );
    }
  }

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SmartSchool ERP API')
      .setDescription('API de gestion scolaire multi-établissements - Smart IT Solution')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Authentification et autorisation')
      .addTag('Tenants', 'Gestion des établissements')
      .addTag('Users', 'Gestion des utilisateurs')
      .addTag('Eleves', 'Gestion des élèves')
      .addTag('Academique', 'Gestion académique')
      .addTag('Notes', 'Gestion des notes')
      .addTag('Finances', 'Gestion financière')
      .addTag('RH', 'Ressources humaines')
      .addTag('Communication', 'Communication')
      .addTag('Transport', 'Transport scolaire')
      .addTag('Bibliotheque', 'Bibliothèque')
      .addTag('Autisme', 'Module autisme')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  logger.log(`Environnement: ${nodeEnv}`);
  return app;
}
