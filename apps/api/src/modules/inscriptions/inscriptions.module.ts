import { Module } from '@nestjs/common';
import { InscriptionsService } from './inscriptions.service';
import { InscriptionsPublicController, InscriptionsAdminController } from './inscriptions.controller';
import { ElevesModule } from '../eleves/eleves.module';

@Module({
  imports: [ElevesModule],
  controllers: [InscriptionsPublicController, InscriptionsAdminController],
  providers: [InscriptionsService],
})
export class InscriptionsModule {}
