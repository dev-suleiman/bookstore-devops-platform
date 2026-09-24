const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bookstore.local' },
    update: {},
    create: {
      email: 'admin@bookstore.local',
      passwordHash: adminPasswordHash,
      name: 'Store Admin',
      role: Role.ADMIN,
    },
  });

  console.log(`Seeded admin user: ${admin.email} (password: Admin123!)`);

  const books = [
    {
      title: 'The Pragmatic Programmer',
      author: 'David Thomas & Andrew Hunt',
      description: 'A classic guide to software craftsmanship.',
      price: 34.99,
      stock: 50,
    },
    {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      description: 'A handbook of agile software craftsmanship.',
      price: 29.99,
      stock: 40,
    },
    {
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      description: 'The big ideas behind reliable, scalable systems.',
      price: 44.99,
      stock: 30,
    },
    {
      title: 'Site Reliability Engineering',
      author: 'Niall Richard Murphy et al.',
      description: 'How Google runs production systems.',
      price: 39.99,
      stock: 25,
    },
    {
      title: 'Kubernetes Up & Running',
      author: 'Kelsey Hightower et al.',
      description: 'Dive into the future of infrastructure.',
      price: 42.5,
      stock: 20,
    },
    {
      title: 'Observability Engineering',
      author: 'Charity Majors et al.',
      description: 'Achieving production excellence.',
      price: 45.0,
      stock: 15,
    },
  ];

  for (const book of books) {
    const existing = await prisma.book.findFirst({
      where: { title: book.title },
    });

if (!existing) {
  await prisma.book.create({
    data: book,
  });
}

  }

  console.log(`Seeded ${books.length} books.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
