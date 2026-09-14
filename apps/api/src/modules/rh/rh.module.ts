import { Module } from '@nestjs/common';
import { RhService } from './rh.service';
import { RhController } from './rh.controller';
import { AuthModule } from '../auth/auth.module';
import { PayslipPdfService } from '../../common/services/payslip-pdf.service';

@Module({
  imports: [AuthModule],
  controllers: [RhController],
  providers: [RhService, PayslipPdfService],
  exports: [RhService],
})
export class RhModule {}
