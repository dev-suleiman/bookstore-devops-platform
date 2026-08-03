import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider, getToken } from '@willsoto/nestjs-prometheus';

// Custom, business-relevant metrics live here rather than only relying on
// generic HTTP metrics. These are deliberately coarse-grained (order
// outcomes, payment latency) - exactly the kind of signal we want to build
// dashboards and alerts against later, without needing deep app knowledge
// to interpret them.
export const ORDERS_TOTAL_METRIC = 'orders_total';
export const PAYMENT_DURATION_METRIC = 'payment_duration_seconds';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: ORDERS_TOTAL_METRIC,
      help: 'Total number of orders placed, labeled by final status',
      labelNames: ['status'],
    }),
    makeHistogramProvider({
      name: PAYMENT_DURATION_METRIC,
      help: 'Duration of mock payment processing in seconds',
      labelNames: ['status'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2],
    }),
  ],
  exports: [PrometheusModule, getToken(ORDERS_TOTAL_METRIC), getToken(PAYMENT_DURATION_METRIC)],
})
export class MetricsModule {}
