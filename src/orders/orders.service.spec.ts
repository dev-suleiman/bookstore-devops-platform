import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('OrdersService', () => {
  let ordersService: OrdersService;
  let prisma: {
    cartItem: { findMany: jest.Mock; deleteMany: jest.Mock };
    order: { create: jest.Mock; update: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let transaction: { book: { update: jest.Mock }; order: { create: jest.Mock }; cartItem: { deleteMany: jest.Mock } };
  let paymentsService: { charge: jest.Mock };
  let notificationsService: { notify: jest.Mock };
  let ordersTotal: { inc: jest.Mock };

  beforeEach(() => {
    transaction = {
      book: { update: jest.fn() },
      order: { create: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
    };
    prisma = {
      cartItem: { findMany: jest.fn(), deleteMany: jest.fn() },
      order: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    };
    paymentsService = { charge: jest.fn() };
    notificationsService = { notify: jest.fn().mockResolvedValue(undefined) };
    ordersTotal = { inc: jest.fn() };
    ordersService = new OrdersService(
      prisma as unknown as PrismaService,
      paymentsService as unknown as PaymentsService,
      notificationsService as unknown as NotificationsService,
      ordersTotal as never,
    );
  });

  it('rejects an empty cart', async () => {
    prisma.cartItem.findMany.mockResolvedValue([]);

    await expect(ordersService.createOrder('user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an order when stock is insufficient', async () => {
    prisma.cartItem.findMany.mockResolvedValue([
      { bookId: 'book-1', quantity: 3, book: { title: 'Dune', price: '10.00', stock: 2 } },
    ]);

    await expect(ordersService.createOrder('user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reserves stock, charges payment, and marks the order paid', async () => {
    const pendingOrder = { id: 'order-1', items: [] };
    const paidOrder = { ...pendingOrder, status: OrderStatus.PAID, payment: { status: 'SUCCESS' } };
    prisma.cartItem.findMany.mockResolvedValue([
      { bookId: 'book-1', quantity: 2, book: { title: 'Dune', price: '12.50', stock: 5 } },
    ]);
    transaction.order.create.mockResolvedValue(pendingOrder);
    paymentsService.charge.mockResolvedValue({ status: 'SUCCESS', paymentId: 'payment-1' });
    prisma.order.update.mockResolvedValue(paidOrder);

    await expect(ordersService.createOrder('user-1')).resolves.toEqual(paidOrder);
    expect(transaction.book.update).toHaveBeenCalledWith({
      where: { id: 'book-1' },
      data: { stock: { decrement: 2 } },
    });
    expect(transaction.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(paymentsService.charge).toHaveBeenCalledWith('order-1', 25);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: OrderStatus.PAID }, where: { id: 'order-1' } }),
    );
    expect(ordersTotal.inc).toHaveBeenCalledWith({ status: OrderStatus.PAID });
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'order.paid' }));
  });

  it('marks an order failed when payment fails', async () => {
    const pendingOrder = { id: 'order-2', items: [] };
    prisma.cartItem.findMany.mockResolvedValue([
      { bookId: 'book-1', quantity: 1, book: { title: 'Dune', price: '10.00', stock: 1 } },
    ]);
    transaction.order.create.mockResolvedValue(pendingOrder);
    paymentsService.charge.mockResolvedValue({ status: 'FAILED', paymentId: 'payment-2' });
    prisma.order.update.mockResolvedValue({ ...pendingOrder, status: OrderStatus.FAILED });

    await ordersService.createOrder('user-1');

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: OrderStatus.FAILED } }),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'order.payment_failed' }));
  });

  it('protects orders belonging to another user', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'order-1', userId: 'other-user' });

    await expect(ordersService.findOneForUser('user-1', 'order-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when an order does not exist', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    await expect(ordersService.findOneForUser('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
