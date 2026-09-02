import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function runAdminSeed() {
  const email = process.env.ADMIN_EMAIL;
  if (!email || !email.trim()) {
    throw new Error(
      'FATAL: ADMIN_EMAIL environment variable is required for admin provisioning.'
    );
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password || !password.trim()) {
    throw new Error(
      'FATAL: ADMIN_PASSWORD environment variable is required for initial admin provisioning.'
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.trim() },
  });

  if (existingUser) {
    if (existingUser.role !== 'admin') {
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'admin' },
      });
      console.log(`✅ Role user ${updated.email} diperbarui menjadi 'admin'.`);
      return updated;
    }
    console.log(`ℹ️ Admin user ${existingUser.email} sudah ada. Password existing dipertahankan.`);
    return existingUser;
  }

  const passwordHash = await bcrypt.hash(password.trim(), 10);
  const newAdmin = await prisma.user.create({
    data: {
      email: email.trim(),
      passwordHash,
      fullName: 'System Administrator',
      role: 'admin',
    },
  });

  console.log(`✅ Admin baru berhasil dibuat: ${newAdmin.email} (Role: ${newAdmin.role}, ID: ${newAdmin.id})`);
  return newAdmin;
}

if (require.main === module) {
  console.log('🌱 Inisialisasi Admin Provisioning (npm run seed:admin)...');
  runAdminSeed()
    .catch((e: any) => {
      console.error('❌ Gagal menginisialisasi admin:', e.message || e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
