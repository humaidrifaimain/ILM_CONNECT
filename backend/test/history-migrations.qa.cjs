const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

if (!process.env.HISTORY_QA_DATABASE_URL)
  throw new Error(
    'Set HISTORY_QA_DATABASE_URL to a disposable copy of the database before its pending migrations',
  );
process.env.DATABASE_URL = process.env.HISTORY_QA_DATABASE_URL;
delete process.env.DATABASE_URL_UNPOOLED;
delete process.env.DIRECT_URL;
process.env.NODE_ENV = 'test';
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { HistoryService } = require('../dist/src/admin/history.service');

(async () => {
  const prisma = new PrismaService();
  const results = [];
  const service = new HistoryService(prisma);
  try {
    await prisma.$connect();
    const accounts = [];
    for (const role of ['STUDENT', 'LECTURER']) {
      const user = await prisma.user.findFirst({
        where: { role },
        select: { id: true, role: true },
      });
      assert(user, `A ${role} account is required on the isolated branch`);
      accounts.push(user);
      await assert.rejects(
        service.getHistory(user.id),
        (error) =>
          error.code === 'P2022' && error.message.includes('student_joined_at'),
      );
      results.push({
        role,
        before: 'P2022: student attendance column missing',
      });
    }
    await assert.rejects(
      prisma.courseAssessment.count(),
      (error) => error.code === 'P2021',
    );
    console.log(
      'REPRODUCED: both histories fail before attendance migration; course assessment table is also missing',
    );
    const migrate = spawnSync('npm', ['run', 'vercel-build'], {
      cwd: path.resolve(__dirname, '..'),
      env: process.env,
      stdio: 'inherit',
    });
    assert.equal(
      migrate.status,
      0,
      'The Vercel build hook must migrate the database before building',
    );
    for (const user of accounts) {
      const start = Date.now();
      const data = await service.getHistory(user.id);
      assert.equal(data.account.role, user.role);
      assert(Array.isArray(data.sessions));
      assert(Array.isArray(data.assessments));
      assert.equal(typeof data.summary.totalSessions, 'number');
      results.find((result) => result.role === user.role).after = {
        passed: true,
        elapsedMs: Date.now() - start,
      };
    }
    const migrations =
      await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    for (const name of [
      '20261007060000_course_assessments',
      '20261007120000_student_attendance',
    ])
      assert(migrations.some((row) => row.migration_name === name));
    const output = path.resolve(
      __dirname,
      '../../output/playwright/admin-history',
    );
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(
      path.join(output, 'migration-results.json'),
      JSON.stringify(results, null, 2),
    );
    console.log(
      'PASS: real database histories recovered after the Vercel migration/build hook',
    );
  } finally {
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
