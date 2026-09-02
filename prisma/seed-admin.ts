import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('🌱 Inisialisasi Admin Provisioning (npm run seed:admin)...');

  const email = process.env.ADMIN_EMAIL || 'admin@dreamacademy.id';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'admin',
      passwordHash,
    },
    create: {
      email,
      passwordHash,
      fullName: 'System Administrator',
      role: 'admin',
    },
  });

  console.log(`✅ Admin berhasil di-provision: ${admin.email} (Role: ${admin.role}, ID: ${admin.id})`);
}

seedAdmin()
  .catch((e) => {
    console.error('❌ Gagal menginisialisasi admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
