import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Hash password
  const hash = await bcrypt.hash('admin123', 12);

  // Create admin user
  const admin = await prisma.utilisateur.create({
    data: {
      nom: 'Super Admin',
      email: 'admin@trouvetout.com',
      motDePasse: hash,
      roles: {
        create: {
          type: 'ADMIN',
        },
      },
      panier: {
        create: {},
      },
      pointsFidelite: {
        create: {},
      },
    },
  });

  console.log('Admin created:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

