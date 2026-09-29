import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { OrderStatus } from '@prisma/client';
import { Counter } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ORDERS_TOTAL_METRIC } from '../metrics/metrics.module';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
    @InjectMetric(ORDERS_TOTAL_METRIC) private readonly ordersTotal: Counter<string>,
  ) { }

  async createOrder(userId: string) {
    const tracer = trace.getTracer('bookstore-api');
    const cartItems = await tracer.startActiveSpan('db.get-cart', async (span) => {
      try {
        return await this.prisma.cartItem.findMany({
          where: { userId },
          include: { book: true },
        });
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cannot place an order with an empty cart');
    }

    await tracer.startActiveSpan('db.check-stock', async (span) => {
      try {
        for (const item of cartItems) {
          if (item.book.stock < item.quantity) {
            throw new BadRequestException(`Not enough stock for "${item.book.title}"`);
          }
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });

    const totalAmount = cartItems.reduce((sum, item) => sum + Number(item.book.price) * item.quantity, 0);

    // Reserve stock, create the order + line items, and clear the cart
    // atomically. If any part fails, none of it applies - we don't want
    // stock decremented without a corresponding order.
    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of cartItems) {
        await tx.book.update({
          where: { id: item.bookId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const created = await tracer.startActiveSpan('db.create-order', async (span) => {
        try {
          return await tx.order.create({
            data: {
              userId,
              status: OrderStatus.PENDING,
              totalAmount,
              items: {
                create: cartItems.map((item) => ({
                  bookId: item.bookId,
                  quantity: item.quantity,
                  price: item.book.price,
                })),
              },
            },
            include: { items: true },
          });
        } catch (error) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
          throw error;
        } finally {
          span.end();
        }
      });

      await tx.cartItem.deleteMany({ where: { userId } });

      return created;
    });

    this.logger.log(`Order ${order.id} created for user ${userId}, total ${totalAmount}`);

    // Payment happens after the order is durably persisted, so a slow or
    // failed payment never risks losing the order or the stock reservation.
    const { status: paymentStatus } = await tracer.startActiveSpan('payment.process', async (span) => {
      try {
        return await this.paymentsService.charge(order.id, totalAmount);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });

    const finalStatus = paymentStatus === 'SUCCESS' ? OrderStatus.PAID : OrderStatus.FAILED;
    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: finalStatus },
      include: { items: true, payment: true },
    });
    this.ordersTotal.inc({ status: finalStatus });

    await tracer.startActiveSpan('notifications.send', async (span) => {
      try {
        return await this.notificationsService.notify({
          userId,
          orderId: order.id,
          type: finalStatus === OrderStatus.PAID ? 'order.paid' : 'order.payment_failed',
          message:
            finalStatus === OrderStatus.PAID
              ? `Your order ${order.id} was placed and paid successfully. Total: $${totalAmount.toFixed(2)}`
              : `Payment failed for order ${order.id}. Please try again.`,
        });
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
        throw error;
      } finally {
        span.end();
      }
    });

    return updatedOrder;
  }

  async findAllForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { book: true } }, payment: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }
}
