import { Module } from '@nestjs/common';
import { ElevesService } from './eleves.service';
import { ElevesController } from './eleves.controller';

@Module({
  controllers: [ElevesController],
  providers: [ElevesService],
  exports: [ElevesService],
})
export class ElevesModule {}
