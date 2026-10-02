import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CartService', () => {
    let cartService: CartService;
    let prisma: {
        cartItem: {
            findMany: jest.Mock;
            findUnique: jest.Mock;
            upsert: jest.Mock;
            update: jest.Mock;
            delete: jest.Mock;
            deleteMany: jest.Mock;
        };
        book: { findUnique: jest.Mock };
    };

    beforeEach(() => {
        prisma = {
            cartItem: {
                findMany: jest.fn().mockResolvedValue([]),
                findUnique: jest.fn(),
                upsert: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                deleteMany: jest.fn(),
            },
            book: { findUnique: jest.fn() },
        };
        cartService = new CartService(prisma as unknown as PrismaService);
    });

    describe('getCart', () => {
        it('calculates item count and rounded total', async () => {
            prisma.cartItem.findMany.mockResolvedValue([
                { quantity: 2, book: { price: '12.345' } },
                { quantity: 1, book: { price: 7.1 } },
            ]);

            await expect(cartService.getCart('user-1')).resolves.toEqual({
                items: expect.any(Array),
                itemCount: 3,
                total: 31.79,
            });
        });
    });

    describe('addItem', () => {
        it('rejects an unknown book', async () => {
            prisma.book.findUnique.mockResolvedValue(null);

            await expect(cartService.addItem('user-1', { bookId: 'book-1', quantity: 1 })).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('rejects quantities above available stock', async () => {
            prisma.book.findUnique.mockResolvedValue({ id: 'book-1', stock: 2 });

            await expect(cartService.addItem('user-1', { bookId: 'book-1', quantity: 3 })).rejects.toBeInstanceOf(
                BadRequestException,
            );
            expect(prisma.cartItem.upsert).not.toHaveBeenCalled();
        });

        it('upserts a valid item and returns the refreshed cart', async () => {
            prisma.book.findUnique.mockResolvedValue({ id: 'book-1', stock: 5 });
            prisma.cartItem.findMany.mockResolvedValue([{ quantity: 2, book: { price: 10 } }]);

            await expect(cartService.addItem('user-1', { bookId: 'book-1', quantity: 2 })).resolves.toMatchObject({
                itemCount: 2,
                total: 20,
            });
            expect(prisma.cartItem.upsert).toHaveBeenCalledWith({
                where: { userId_bookId: { userId: 'user-1', bookId: 'book-1' } },
                update: { quantity: { increment: 2 } },
                create: { userId: 'user-1', bookId: 'book-1', quantity: 2 },
            });
        });
    });

    it('rejects updating an item that is not in the cart', async () => {
        prisma.cartItem.findUnique.mockResolvedValue(null);

        await expect(cartService.updateItem('user-1', 'book-1', { quantity: 2 })).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('removes an existing item and returns the refreshed cart', async () => {
        prisma.cartItem.findUnique.mockResolvedValue({ id: 'item-1' });

        await expect(cartService.removeItem('user-1', 'book-1')).resolves.toEqual({
            items: [],
            itemCount: 0,
            total: 0,
        });
        expect(prisma.cartItem.delete).toHaveBeenCalledWith({
            where: { userId_bookId: { userId: 'user-1', bookId: 'book-1' } },
        });
    });

    it('clears all items for a user', async () => {
        await expect(cartService.clearCart('user-1')).resolves.toEqual({ cleared: true });
        expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });
});
