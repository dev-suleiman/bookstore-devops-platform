import { NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BooksService', () => {
  let booksService: BooksService;
  let prisma: {
    book: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      book: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    booksService = new BooksService(prisma as unknown as PrismaService);
  });

  it('returns paginated books and calculates page count', async () => {
    prisma.book.findMany.mockResolvedValue([{ id: 'book-1' }]);
    prisma.book.count.mockResolvedValue(21);
    prisma.$transaction.mockResolvedValue([[{ id: 'book-1' }], 21]);

    await expect(booksService.findAll({ page: 2, pageSize: 10, q: 'asimov' })).resolves.toEqual({
      items: [{ id: 'book-1' }],
      meta: { total: 21, page: 2, pageSize: 10, pageCount: 3 },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: {
          OR: [
            { title: { contains: 'asimov', mode: 'insensitive' } },
            { author: { contains: 'asimov', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('throws when a book cannot be found', async () => {
    prisma.book.findUnique.mockResolvedValue(null);

    await expect(booksService.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a book and checks existence before updating', async () => {
    const dto = { title: 'Dune', author: 'Frank Herbert', price: 15, stock: 4 };
    prisma.book.create.mockResolvedValue({ id: 'book-1', ...dto });
    prisma.book.findUnique.mockResolvedValue({ id: 'book-1' });
    prisma.book.update.mockResolvedValue({ id: 'book-1', ...dto, stock: 5 });

    await expect(booksService.create(dto)).resolves.toMatchObject({ id: 'book-1' });
    await expect(booksService.update('book-1', { stock: 5 })).resolves.toMatchObject({ stock: 5 });
    expect(prisma.book.update).toHaveBeenCalledWith({ where: { id: 'book-1' }, data: { stock: 5 } });
  });

  it('deletes an existing book', async () => {
    prisma.book.findUnique.mockResolvedValue({ id: 'book-1' });

    await expect(booksService.remove('book-1')).resolves.toEqual({ deleted: true });
    expect(prisma.book.delete).toHaveBeenCalledWith({ where: { id: 'book-1' } });
  });
});
