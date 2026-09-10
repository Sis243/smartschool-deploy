import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { BrevoModule } from './common/services/brevo.module';
import { PushModule } from './common/services/push.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UsersModule } from './modules/users/users.module';
import { ElevesModule } from './modules/eleves/eleves.module';
import { AcademiqueModule } from './modules/academique/academique.module';
import { NotesModule } from './modules/notes/notes.module';
import { FinancesModule } from './modules/finances/finances.module';
import { RhModule } from './modules/rh/rh.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { TransportModule } from './modules/transport/transport.module';
import { BibliothequeModule } from './modules/bibliotheque/bibliotheque.module';
import { AutismeModule } from './modules/autisme/autisme.module';
import { MaternelleModule } from './modules/maternelle/maternelle.module';
import { InscriptionsModule } from './modules/inscriptions/inscriptions.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { NotifParentModule } from './modules/notif-parent/notif-parent.module';
import { ParentPortalModule } from './modules/parent-portal/parent-portal.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    BrevoModule,
    PushModule,
    AuthModule,
    TenantModule,
    UsersModule,
    ElevesModule,
    AcademiqueModule,
    NotesModule,
    FinancesModule,
    RhModule,
    CommunicationModule,
    TransportModule,
    BibliothequeModule,
    AutismeModule,
    MaternelleModule,
    InscriptionsModule,
    UploadsModule,
    NotifParentModule,
    ParentPortalModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
