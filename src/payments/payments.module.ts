import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { PaymentsService } from './payments.service';

@Module({
  imports: [MetricsModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
