import { Module } from '@nestjs/common';
import { AutismeService } from './autisme.service';
import { AutismeController } from './autisme.controller';

@Module({
  controllers: [AutismeController],
  providers: [AutismeService],
  exports: [AutismeService],
})
export class AutismeModule {}
