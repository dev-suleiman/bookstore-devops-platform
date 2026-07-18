import { Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface NotifyInput {
  userId: string;
  orderId?: string;
  type: string;
  message: string;
}

/**
 * Notifications are delivered synchronously today: we just write a record
 * and log it, standing in for "an email/SMS was sent". This is intentional
 * scope control - a real queue (BullMQ + Redis) is the planned next step
 * once the core ordering flow is proven out, at which point `notify()`
 * becomes a producer that enqueues a job instead of doing the work inline.
 * Keeping the method signature stable now means that swap won't ripple
 * into the OrdersService that calls it.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notify(input: NotifyInput) {
    // Simulate the notification "send" step. In practice this always
    // succeeds today; the status field exists so failure handling and
    // retries have somewhere to report to once real delivery is wired up.
    const status = NotificationStatus.SENT;

    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        orderId: input.orderId,
        type: input.type,
        message: input.message,
        status,
      },
    });

    this.logger.log(`Notification ${notification.id} (${input.type}) -> ${input.userId}: ${input.message}`);
    return notification;
  }
}
