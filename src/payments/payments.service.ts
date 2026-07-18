import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { PaymentStatus } from '@prisma/client';
import { Histogram } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_DURATION_METRIC } from '../metrics/metrics.module';

export interface ChargeResult {
  status: PaymentStatus;
  paymentId: string;
}

/**
 * A mock payment provider. There is no real gateway here on purpose -
 * integrating Stripe/Adyen/etc. is exactly the kind of business-logic
 * rabbit hole this project is trying to avoid. What it does give us is a
 * step in the request path with configurable latency and a configurable
 * failure rate, which is genuinely useful once we start building metrics,
 * dashboards, and alerts around a "payment service".
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectMetric(PAYMENT_DURATION_METRIC) private readonly paymentDuration: Histogram<string>,
  ) {}

  async charge(orderId: string, amount: number): Promise<ChargeResult> {
    const minLatency = this.configService.get<number>('payments.minLatencyMs')!;
    const maxLatency = this.configService.get<number>('payments.maxLatencyMs')!;
    const failureRate = this.configService.get<number>('payments.failureRate')!;

    const latency = minLatency + Math.random() * (maxLatency - minLatency);
    await new Promise((resolve) => setTimeout(resolve, latency));

    const succeeded = Math.random() >= failureRate;
    const status = succeeded ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    this.paymentDuration.observe({ status }, latency / 1000);

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount,
        status,
        provider: 'mock',
      },
    });

    this.logger.log(`Payment ${payment.id} for order ${orderId} -> ${status} (${latency.toFixed(0)}ms)`);

    return { status, paymentId: payment.id };
  }
}
