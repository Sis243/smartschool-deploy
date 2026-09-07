import { Module } from '@nestjs/common';
import { BibliothequeService } from './bibliotheque.service';
import { BibliothequeController } from './bibliotheque.controller';

@Module({
  controllers: [BibliothequeController],
  providers: [BibliothequeService],
  exports: [BibliothequeService],
})
export class BibliothequeModule {}
