import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { id: 'asc' },
    });

    const total = items.reduce((sum, item) => sum + Number(item.book.price) * item.quantity, 0);

    return {
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      total: Number(total.toFixed(2)),
    };
  }

  async addItem(userId: string, dto: AddItemDto) {
    const book = await this.prisma.book.findUnique({ where: { id: dto.bookId } });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    if (book.stock < dto.quantity) {
      throw new BadRequestException('Not enough stock available');
    }

    await this.prisma.cartItem.upsert({
      where: { userId_bookId: { userId, bookId: dto.bookId } },
      update: { quantity: { increment: dto.quantity } },
      create: { userId, bookId: dto.bookId, quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async updateItem(userId: string, bookId: string, dto: UpdateItemDto) {
    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    if (!existing) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.prisma.cartItem.update({
      where: { userId_bookId: { userId, bookId } },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, bookId: string) {
    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    if (!existing) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.prisma.cartItem.delete({ where: { userId_bookId: { userId, bookId } } });
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return { cleared: true };
  }
}
