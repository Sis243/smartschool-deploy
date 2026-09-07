import { Module } from '@nestjs/common';
import { NotifParentService } from './notif-parent.service';

@Module({
  providers: [NotifParentService],
  exports: [NotifParentService],
})
export class NotifParentModule {}
