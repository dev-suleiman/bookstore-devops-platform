import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { FindBooksQueryDto } from './dto/find-books-query.dto';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindBooksQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.BookWhereInput = query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { author: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, pageSize, pageCount: Math.ceil(total / pageSize) },
    };
  }

  async findById(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    return book;
  }

  async create(dto: CreateBookDto) {
    return this.prisma.book.create({ data: dto });
  }

  async update(id: string, dto: UpdateBookDto) {
    await this.findById(id);
    return this.prisma.book.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.book.delete({ where: { id } });
    return { deleted: true };
  }
}
