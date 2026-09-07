import { Module } from '@nestjs/common';
import { MaternelleService } from './maternelle.service';
import { MaternelleController } from './maternelle.controller';

@Module({
  controllers: [MaternelleController],
  providers: [MaternelleService],
})
export class MaternelleModule {}
