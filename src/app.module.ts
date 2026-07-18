import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        // Keep request logs structured (method, url, status, duration) so
        // they're easy to ship to a log aggregator later without rewriting
        // every log statement in the app.
        customProps: () => ({ context: 'HTTP' }),
        redact: ['req.headers.authorization'],
      },
    }),
    PrismaModule,
    MetricsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    BooksModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
