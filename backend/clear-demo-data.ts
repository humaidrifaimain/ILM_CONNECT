import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearDemoData() {
  console.log('🧹 Cleaning up demo details from the database...');

  try {
    // 1. Delete audit logs
    const auditRes = await prisma.auditLog.deleteMany();
    console.log(`Deleted ${auditRes.count} audit logs.`);

    // 2. Delete demo messages / support tickets if any
    const msgRes = await prisma.message.deleteMany();
    console.log(`Deleted ${msgRes.count} messages.`);
    const ticketRes = await prisma.supportTicket.deleteMany();
    console.log(`Deleted ${ticketRes.count} support tickets.`);

    // 3. Delete demo sessions, slots, and subscriptions
    const sessionRes = await prisma.session.deleteMany();
    console.log(`Deleted ${sessionRes.count} sessions.`);
    const slotRes = await prisma.availabilitySlot.deleteMany();
    console.log(`Deleted ${slotRes.count} availability slots.`);
    const subRes = await prisma.subscription.deleteMany();
    console.log(`Deleted ${subRes.count} subscriptions.`);
    const progRes = await prisma.studentProgress.deleteMany();
    console.log(`Deleted ${progRes.count} student progress entries.`);

    // 4. Identify demo users to remove
    const demoEmails = [
      'ahmed.raza@ilmconnect.com',
      'student1@ilmconnect.com',
      'student2@ilmconnect.com',
      'student3@ilmconnect.com',
    ];

    const demoUsers = await prisma.user.findMany({
      where: { email: { in: demoEmails } },
      select: { id: true, email: true },
    });

    const demoUserIds = demoUsers.map((u) => u.id);

    if (demoUserIds.length > 0) {
      // Delete profiles
      const spRes = await prisma.studentProfile.deleteMany({
        where: { userId: { in: demoUserIds } },
      });
      console.log(`Deleted ${spRes.count} demo student profiles.`);

      const lpRes = await prisma.lecturerProfile.deleteMany({
        where: { userId: { in: demoUserIds } },
      });
      console.log(`Deleted ${lpRes.count} demo lecturer profiles.`);

      // Delete demo users
      const uRes = await prisma.user.deleteMany({
        where: { id: { in: demoUserIds } },
      });
      console.log(`Deleted ${uRes.count} demo users (${demoEmails.join(', ')}).`);
    } else {
      console.log('No demo users found to delete.');
    }

    // Verify remaining users
    const remainingUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
    });
    console.log('Remaining users in database:', remainingUsers);

    console.log('✅ Demo details cleanup completed successfully.');
  } catch (error) {
    console.error('Error during demo cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearDemoData();
