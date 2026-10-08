const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { z } = require('../../frontend/node_modules/zod');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const bcrypt = require('bcrypt');

process.env.DATABASE_URL =
  process.env.QA_DATABASE_URL ||
  'postgresql://history_qa@127.0.0.1:55449/history_qa';
if (
  !['127.0.0.1', 'localhost'].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error('History QA requires an isolated local database');
require('dotenv').config({ quiet: true });
process.env.NODE_ENV = 'test';
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const {
  EmailNotificationService,
} = require('../dist/src/notification/email-notification.service');
const {
  WhatsAppNotificationService,
} = require('../dist/src/notification/whatsapp-notification.service');
const out = path.resolve(__dirname, '../../output/playwright/admin-history');
const apiBase = 'http://127.0.0.1:3022/api/v1';
const personSchema = z.object({ userId: z.string(), fullName: z.string() });
const historySchema = z.object({
  account: z.object({
    id: z.string(),
    email: z.email(),
    role: z.enum(['STUDENT', 'LECTURER']),
    status: z.string(),
    createdAt: z.iso.datetime(),
  }),
  profile: personSchema.passthrough(),
  summary: z.record(z.string(), z.union([z.number(), z.array(z.string())])),
  sessions: z.array(
    z
      .object({
        id: z.string(),
        status: z.string(),
        startsAt: z.iso.datetime(),
        student: personSchema,
        lecturer: personSchema,
      })
      .passthrough(),
  ),
  reports: z.array(
    z.object({
      id: z.string(),
      periodMonth: z.string(),
      studentId: z.string(),
    }),
  ),
  assessments: z.array(
    z.object({
      reportId: z.string(),
      title: z.string().optional(),
      score: z.number().optional(),
      student: personSchema,
      lecturer: personSchema,
    }),
  ),
  tickets: z.array(
    z.object({
      id: z.string(),
      messages: z.array(z.object({ id: z.string(), message: z.string() })),
    }),
  ),
  auditLogs: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      actor: z.object({ email: z.email() }),
    }),
  ),
});
const results = [];
let app, db, course;
const ids = [];
async function check(name, work) {
  await work();
  results.push({ name, passed: true, at: new Date().toISOString() });
  console.log(`PASS ${name}`);
}
async function request(endpoint, token, expected = 200, method = 'GET', body) {
  const response = await fetch(`${apiBase}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    expected,
    `${endpoint}: ${JSON.stringify(data)}`,
  );
  assert.match(response.headers.get('content-type'), /application\/json/);
  if (expected >= 400) assert.equal(typeof data.message, 'string');
  return { data, headers: response.headers };
}
async function cleanup() {
  if (course) await db.learningPath.delete({ where: { id: course.id } });
  if (db && ids.length)
    await db.user.deleteMany({ where: { id: { in: ids } } });
  if (app) await app.close();
  await fs.rm(path.join(out, 'fixture.json'), { force: true });
}
async function run() {
  await fs.mkdir(out, { recursive: true });
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  module.get(EmailNotificationService).sendEmail = async () => ({
    success: true,
  });
  module.get(WhatsAppNotificationService).sendWhatsApp = async () => ({
    success: true,
  });
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.use(require('cookie-parser')());
  app.enableCors({ origin: 'http://localhost:3023', credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(3022, '127.0.0.1');
  db = app.get(PrismaService);
  const password = randomUUID();
  async function account(role, fullName) {
    const user = await db.user.create({
      data: {
        email: `${randomUUID()}@example.test`,
        passwordHash: await bcrypt.hash(password, 4),
        role,
        status: 'ACTIVE',
        ...(role === 'STUDENT'
          ? {
              studentProfile: {
                create: {
                  fullName,
                  phone: '000000',
                  country: 'Sri Lanka',
                  timezone: 'Asia/Colombo',
                  preferredLanguage: 'English',
                  learningGoals: 'Practice reading',
                },
              },
            }
          : {}),
        ...(role === 'LECTURER'
          ? {
              lecturerProfile: {
                create: {
                  fullName,
                  bio: 'QA biography',
                  qualifications: 'QA qualification',
                  specializations: ['Quran'],
                  languages: ['English'],
                  hourlyAvailabilityJson: [10, 11, 12, 13],
                  payoutMethod: 'bank_transfer',
                  payoutDetails: 'QA payout details',
                  status: 'ACTIVE',
                },
              },
            }
          : {}),
      },
    });
    ids.push(user.id);
    const login = await request('/auth/login', undefined, 201, 'POST', {
      email: user.email,
      password,
    });
    return {
      id: user.id,
      email: user.email,
      role,
      status: user.status,
      token: login.data.token,
    };
  }
  const admin = await account('ADMIN'),
    superAdmin = await account('SUPER_ADMIN');
  const lecturer = await account('LECTURER', 'History Lecturer'),
    oldLecturer = await account('LECTURER', 'Previous Lecturer');
  const student = await account('STUDENT', 'History Student العربية'),
    emptyStudent = await account('STUDENT', 'Empty Student');
  const otherStudent = await account('STUDENT', 'Other Student'),
    emptyLecturer = await account('LECTURER', 'Empty Lecturer');
  await db.studentProfile.updateMany({
    where: { userId: { in: [student.id, otherStudent.id] } },
    data: { assignedLecturerId: lecturer.id },
  });
  course = await db.learningPath.create({
    data: {
      title: 'History QA course',
      level: 'Beginner',
      difficulty: 'Easy',
      description: '',
      targetAudience: 'Students',
      objectives: 'Practice',
    },
  });
  await db.studentProgress.create({
    data: {
      studentId: student.id,
      currentLearningPathId: course.id,
      progressPercentage: 35,
    },
  });
  const subscription = await db.subscription.create({
    data: {
      studentId: student.id,
      tier: 'STANDARD',
      status: 'ACTIVE',
      currentPeriodStart: new Date('2026-10-01'),
      currentPeriodEnd: new Date('2026-11-01'),
      lkrAmount: 9000,
      fxRateApplied: 1,
    },
  });
  await db.payment.createMany({
    data: [
      ['SUCCESSFUL', 9000, '2026-09-01T00:00:00Z'],
      ['SUCCESSFUL', 18000, '2026-09-10T00:00:00Z'],
      ['SUCCESSFUL', 9000, '2026-09-30T20:00:00Z'],
      ['FAILED', 9000, '2026-08-01T00:00:00Z'],
      ['REFUNDED', 9000, '2026-08-02T00:00:00Z'],
      ['PENDING', 9000, '2026-07-01T00:00:00Z'],
    ].map(([status, amountLkr, processedAt]) => ({
      subscriptionId: subscription.id,
      status,
      amountLkr,
      processedAt: new Date(processedAt),
      fxRate: 1,
      gateway: 'qa',
      gatewayChargeId: randomUUID(),
    })),
  });
  const sessions = [];
  for (const [index, status] of [
    'COMPLETED',
    'COMPLETED',
    'NO_SHOW_STUDENT',
    'NO_SHOW_LECTURER',
    'CANCELED',
    'SCHEDULED',
    'IN_PROGRESS',
  ].entries()) {
    sessions.push(
      await db.session.create({
        data: {
          studentId: student.id,
          lecturerId: index === 1 ? oldLecturer.id : lecturer.id,
          status,
          startsAt: new Date(Date.UTC(2026, 9, index + 1, 10)),
          endsAt: new Date(Date.UTC(2026, 9, index + 1, 10, 40)),
        },
      }),
    );
  }
  await db.sessionNotes.create({
    data: {
      sessionId: sessions[0].id,
      lecturerId: lecturer.id,
      topicsCovered: 'Reading practice',
      homework: 'Read page 1',
      sharedNotes: 'Good progress',
      internalNotes: 'QA internal note',
      studentProgressRating: 4,
    },
  });
  await db.rating.create({
    data: {
      sessionId: sessions[0].id,
      studentId: student.id,
      lecturerId: lecturer.id,
      score: 5,
      comment: 'Helpful lesson',
    },
  });
  for (const who of [lecturer, oldLecturer])
    await db.progressReport.create({
      data: {
        studentId: student.id,
        lecturerId: who.id,
        periodMonth: '2026-10',
        contentJson: {
          assessments: [
            {
              id: randomUUID(),
              title: 'Reading assessment',
              score: 85,
              maxScore: 100,
              feedback: 'Clear reading',
              date: '2026-10-07T10:00:00Z',
            },
          ],
        },
      },
    });
  await db.progressReport.create({
    data: {
      studentId: otherStudent.id,
      lecturerId: lecturer.id,
      periodMonth: '2026-10',
      contentJson: {
        assessments: [
          null,
          false,
          { title: { invalid: true }, score: 'invalid', date: 'invalid' },
        ],
      },
    },
  });
  await db.certificate.create({
    data: {
      studentId: student.id,
      learningPathId: course.id,
      scholarId: lecturer.id,
      performanceSummary: 'Completed practice',
    },
  });
  await db.courseRequest.create({
    data: {
      studentId: student.id,
      learningPathId: course.id,
      lecturerId: lecturer.id,
      status: 'ACCEPTED',
    },
  });
  const ticket = await db.supportTicket.create({
    data: {
      userId: student.id,
      type: 'LECTURER_CHANGE',
      reason: 'QA change request',
      messages: {
        create: {
          senderId: student.id,
          senderRole: 'STUDENT',
          senderName: 'History Student',
          message: 'QA support message',
        },
      },
    },
  });
  await db.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'ADMIN_ASSIGNED_LECTURER',
      entity: 'STUDENT_PROFILE',
      entityId: student.id,
      details: { lecturerUserId: lecturer.id, requestId: ticket.id },
    },
  });
  const availableBlock = await db.sessionBlock.create({
    data: {
      studentId: student.id,
      lecturerId: lecturer.id,
      status: 'COMPLETED',
      payoutAmountLkr: 2500,
      completedAt: new Date(),
      session1Id: sessions[0].id,
    },
  });
  const reserved = await db.sessionBlock.create({
    data: {
      studentId: student.id,
      lecturerId: lecturer.id,
      status: 'PENDING',
      payoutAmountLkr: 4500,
      completedAt: new Date(),
    },
  });
  const paid = await db.sessionBlock.create({
    data: {
      studentId: student.id,
      lecturerId: lecturer.id,
      status: 'PAID_OUT',
      payoutAmountLkr: 2500,
      completedAt: new Date(),
    },
  });
  await db.sessionBlock.create({
    data: {
      studentId: student.id,
      lecturerId: lecturer.id,
      status: 'PENDING',
      payoutAmountLkr: 2500,
    },
  });
  await db.payout.createMany({
    data: [
      {
        lecturerId: lecturer.id,
        amountLkr: 4500,
        status: 'PENDING',
        method: 'bank_transfer',
        sessionBlocksIncluded: [reserved.id],
      },
      {
        lecturerId: lecturer.id,
        amountLkr: 2500,
        status: 'SUCCESSFUL',
        method: 'bank_transfer',
        sessionBlocksIncluded: [paid.id],
        completedAt: new Date(),
      },
      {
        lecturerId: lecturer.id,
        amountLkr: 1000,
        status: 'FAILED',
        method: 'bank_transfer',
        sessionBlocksIncluded: [],
        failureReason: 'QA bank failure',
      },
    ],
  });
  await db.courseAssessment.create({
    data: {
      learningPathId: course.id,
      lecturerId: lecturer.id,
      title: 'Authored QA assessment',
      questions: [{ prompt: 'QA', options: ['A', 'B'], correctOption: 0 }],
    },
  });
  const endpoint = (who) => `/admin/users/${who.id}/history`;
  let studentHistory, lecturerHistory;
  await check(
    'Admin student history contract, headers and secret exclusion',
    async () => {
      const response = await request(endpoint(student), admin.token);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      studentHistory = historySchema.parse(response.data);
      assert.doesNotMatch(
        JSON.stringify(response.data),
        /passwordHash|twoFactorSecret|tokenVersion|passwordResets/,
      );
    },
  );
  await check(
    'Attendance excludes both no-show types and cancellations',
    async () => {
      assert.equal(studentHistory.summary.attendedSessions, 2);
      for (const key of [
        'studentNoShows',
        'lecturerNoShows',
        'canceledSessions',
        'scheduledSessions',
        'inProgressSessions',
      ])
        assert.equal(studentHistory.summary[key], 1);
      assert.equal(studentHistory.sessions.length, 7);
    },
  );
  await check(
    'Payment totals, duplicate months, Colombo boundary, failed/refunded/pending exclusion',
    async () => {
      assert.equal(studentHistory.summary.paidMonths, 2);
      assert.equal(studentHistory.summary.successfulPayments, 3);
      assert.equal(studentHistory.summary.totalPaidLkr, 36000);
      assert.equal(studentHistory.summary.refundedLkr, 9000);
      assert.equal(
        (await request(endpoint(student), admin.token)).data.payments.length,
        6,
      );
    },
  );
  await check(
    'Historical lecturers, assessments, reports, notes, certificate, course, support and activity',
    async () => {
      assert.equal(studentHistory.assessments.length, 2);
      assert.equal(studentHistory.reports.length, 2);
      assert.equal(studentHistory.profile.certificates.length, 1);
      assert.equal(studentHistory.profile.courseRequests.length, 1);
      assert.equal(
        studentHistory.tickets[0].messages[0].message,
        'QA support message',
      );
      assert(
        studentHistory.auditLogs.some(
          (log) => log.action === 'ADMIN_ASSIGNED_LECTURER',
        ),
      );
      assert.equal(
        studentHistory.sessions.find((session) => session.id === sessions[0].id)
          .notes.internalNotes,
        'QA internal note',
      );
      assert.equal(studentHistory.profile.progress.progressPercentage, 35);
      assert(
        studentHistory.sessions.some(
          (session) => session.lecturer.userId === oldLecturer.id,
        ),
      );
    },
  );
  await check(
    'Lecturer history contract and payout breakdown without double counting',
    async () => {
      const response = await request(endpoint(lecturer), admin.token);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      lecturerHistory = historySchema.parse(response.data);
      assert.equal(lecturerHistory.summary.owedLkr, 7000);
      assert.equal(lecturerHistory.summary.availableLkr, 2500);
      assert.equal(lecturerHistory.summary.pendingPayoutLkr, 4500);
      assert.equal(lecturerHistory.summary.paidOutLkr, 2500);
      assert.equal(lecturerHistory.summary.assignedStudents, 2);
      assert.equal(lecturerHistory.summary.studentsTaught, 1);
      assert.equal(lecturerHistory.summary.completedSessions, 1);
      assert.equal(response.data.authoredAssessments.length, 1);
      assert.equal(response.data.profile.ratingsReceived.length, 1);
      assert(
        lecturerHistory.auditLogs.some(
          (log) => log.action === 'ADMIN_ASSIGNED_LECTURER',
        ),
      );
      assert.doesNotMatch(
        JSON.stringify(response.data),
        /passwordHash|twoFactorSecret|tokenVersion/,
      );
    },
  );
  await check('Legacy malformed assessment fields are normalized', async () => {
    const result = lecturerHistory.assessments.find(
      (item) => item.student.userId === otherStudent.id,
    );
    assert(result);
    assert.equal(result.title, undefined);
    assert.equal(result.score, undefined);
  });
  await check(
    'Student record does not contain another student reports or lecturer payout details',
    async () => {
      assert(
        studentHistory.reports.every(
          (report) => report.studentId === student.id,
        ),
      );
      assert(
        studentHistory.assessments.every(
          (item) => item.student.userId === student.id,
        ),
      );
      assert.doesNotMatch(JSON.stringify(studentHistory), /QA payout details/);
    },
  );
  await check(
    'Empty student and lecturer histories return zero totals and arrays',
    async () => {
      for (const who of [emptyStudent, emptyLecturer]) {
        const data = historySchema.parse(
          (await request(endpoint(who), admin.token)).data,
        );
        assert.equal(data.sessions.length, 0);
        assert.equal(data.assessments.length, 0);
        assert.equal(data.summary.totalSessions, 0);
        assert.equal(
          data.summary[who.role === 'STUDENT' ? 'totalPaidLkr' : 'owedLkr'],
          0,
        );
      }
    },
  );
  await check('Super admin can read both roles', async () => {
    await request(endpoint(student), superAdmin.token);
    await request(endpoint(lecturer), superAdmin.token);
  });
  await check(
    'Students and lecturers cannot read either history endpoint',
    async () => {
      for (const actor of [student, lecturer])
        for (const target of [student, lecturer])
          await request(endpoint(target), actor.token, 403);
    },
  );
  await check('Anonymous and invalid sessions rejected', async () => {
    await request(endpoint(student), undefined, 401);
    await request(endpoint(lecturer), 'invalid', 401);
  });
  await check('Missing people and admin profiles return 404', async () => {
    await request(`/admin/users/${randomUUID()}/history`, admin.token, 404);
    await request(endpoint(admin), admin.token, 404);
  });
  await check(
    'Payout failure returns reserved blocks to available balance',
    async () => {
      const payout = (
        await request(endpoint(lecturer), admin.token)
      ).data.profile.payouts.find((row) => row.status === 'PENDING');
      await request(
        `/admin/payouts/${payout.id}/status`,
        admin.token,
        200,
        'PATCH',
        { status: 'FAILED' },
      );
      const data = (await request(endpoint(lecturer), admin.token)).data;
      assert.equal(data.summary.owedLkr, 7000);
      assert.equal(data.summary.pendingPayoutLkr, 0);
      assert.equal(data.summary.availableLkr, 7000);
      await db.payout.update({
        where: { id: payout.id },
        data: { status: 'PENDING' },
      });
      await db.sessionBlock.update({
        where: { id: reserved.id },
        data: { status: 'PENDING' },
      });
    },
  );
  await fs.writeFile(
    path.join(out, 'api-results.json'),
    JSON.stringify(results, null, 2),
  );
  await fs.writeFile(
    path.join(out, 'fixture.json'),
    JSON.stringify({
      admin,
      superAdmin,
      student,
      lecturer,
      emptyStudent,
      emptyLecturer,
      availableBlock,
    }),
    { mode: 0o600 },
  );
  console.log(`PASS: ${results.length} API scenarios. QA READY`);
  if (process.argv.includes('--serve')) {
    for (const signal of ['SIGINT', 'SIGTERM'])
      process.once(signal, () => cleanup().then(() => process.exit(0)));
  } else await cleanup();
}
run().catch(async (error) => {
  console.error(error);
  await cleanup();
  process.exit(1);
});
