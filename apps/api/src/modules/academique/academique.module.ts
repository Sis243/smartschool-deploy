import { Module } from '@nestjs/common';
import { AcademiqueService } from './academique.service';
import { AcademiqueController } from './academique.controller';
import { NotifParentModule } from '../notif-parent/notif-parent.module';

@Module({
  imports: [NotifParentModule],
  controllers: [AcademiqueController],
  providers: [AcademiqueService],
  exports: [AcademiqueService],
})
export class AcademiqueModule {}
