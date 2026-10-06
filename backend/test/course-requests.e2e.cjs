const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcrypt');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { z } = require('../../frontend/node_modules/zod');

if (
  !process.env.DATABASE_URL ||
  !['127.0.0.1', 'localhost'].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
) {
  throw new Error(
    'Run course-request tests with an isolated local DATABASE_URL',
  );
}
process.env.NODE_ENV = 'test';
const { AppModule } = require('../dist/src/app.module.js');
const { PrismaService } = require('../dist/src/prisma/prisma.service.js');
const requestSchema = z.object({
  id: z.uuid(),
  studentId: z.uuid(),
  lecturerId: z.uuid(),
  learningPathId: z.uuid(),
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED']),
  createdAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().nullable(),
});

async function run() {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: 'http://localhost:3017', credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const db = app.get(PrismaService);
  const ids = [],
    paths = [];
  let serving = false;
  const password = randomUUID();
  try {
    await app.listen(process.env.QA_SERVE ? 55440 : 0, '127.0.0.1');
    const base = `${await app.getUrl()}/api/v1`;
    async function api(endpoint, method = 'GET', body, token, expected = 200) {
      const response = await fetch(base + endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      assert.match(response.headers.get('content-type'), /application\/json/);
      const data = await response.json();
      assert.equal(
        response.status,
        expected,
        `${method} ${endpoint}: ${JSON.stringify(data)}`,
      );
      return data;
    }
    async function person(role, fullName) {
      const id = randomUUID();
      ids.push(id);
      const email = `course-qa-${id}@example.test`;
      await db.user.create({
        data: {
          id,
          email,
          role,
          status: 'ACTIVE',
          passwordHash: await bcrypt.hash(password, 4),
          ...(role === 'STUDENT'
            ? {
                studentProfile: {
                  create: {
                    fullName,
                    phone: '0000000000',
                    country: 'Sri Lanka',
                    timezone: 'Asia/Colombo',
                    preferredLanguage: 'English',
                    learningGoals: 'Learn',
                  },
                },
              }
            : role === 'LECTURER'
              ? {
                  lecturerProfile: {
                    create: {
                      fullName,
                      bio: '',
                      qualifications: '',
                      specializations: [],
                      languages: ['English'],
                      hourlyAvailabilityJson: {},
                      payoutMethod: '',
                      payoutDetails: '',
                      status: 'ACTIVE',
                    },
                  },
                }
              : {}),
        },
      });
      const login = await api(
        '/auth/login',
        'POST',
        { email, password },
        undefined,
        201,
      );
      return { id, email, token: login.token, role, fullName };
    }
    const lecturer = await person('LECTURER', 'QA Assigned Lecturer');
    const other = await person('LECTURER', 'QA Other Lecturer');
    const student = await person('STUDENT', 'QA Course Student');
    const unassigned = await person('STUDENT', 'QA Unassigned Student');
    const admin = await person('ADMIN', 'QA Finance Admin');
    await db.studentProfile.update({
      where: { userId: student.id },
      data: { assignedLecturerId: lecturer.id },
    });
    const path = await db.learningPath.create({
      data: {
        title: 'QA Tajweed Course',
        description: 'Practice recitation with your lecturer.',
        level: 'Beginner',
        difficulty: 'Beginner',
        targetAudience: 'Students',
        objectives: 'Read confidently',
        modules: { create: { title: 'Foundations', orderIndex: 1 } },
      },
    });
    paths.push(path.id);
    await api('/curriculum/requests', 'GET', undefined, undefined, 401);
    await api(
      '/auth/login',
      'POST',
      { email: student.email, password: 'wrong-password' },
      undefined,
      401,
    );
    await api(
      '/curriculum/requests',
      'POST',
      { learningPathId: 'bad-id' },
      student.token,
      400,
    );
    await api(
      '/curriculum/requests',
      'POST',
      { learningPathId: path.id },
      lecturer.token,
      403,
    );
    await api(
      '/curriculum/requests',
      'POST',
      { learningPathId: path.id },
      unassigned.token,
      409,
    );
    await api(
      '/curriculum/requests',
      'POST',
      { learningPathId: randomUUID() },
      student.token,
      404,
    );
    const requested = requestSchema.parse(
      await api(
        '/curriculum/requests',
        'POST',
        { learningPathId: path.id },
        student.token,
        201,
      ),
    );
    assert.equal(requested.status, 'PENDING');
    assert.equal(
      (
        await api(
          '/curriculum/requests',
          'POST',
          { learningPathId: path.id },
          student.token,
          201,
        )
      ).id,
      requested.id,
    );
    const lecturerNotifications = await api(
      '/notifications',
      'GET',
      undefined,
      lecturer.token,
    );
    assert.equal(
      lecturerNotifications.filter(
        (n) =>
          n.type === 'COURSE_REQUESTED' &&
          n.payloadJson.requestId === requested.id,
      ).length,
      1,
    );
    assert.equal(
      lecturerNotifications.find(
        (n) => n.payloadJson.requestId === requested.id,
      ).payloadJson.actionUrl,
      '/lecturer/courses',
    );
    const listed = await api(
      '/curriculum/requests',
      'GET',
      undefined,
      lecturer.token,
    );
    assert.equal(listed[0].student.fullName, student.fullName);
    assert.equal(listed[0].learningPath.title, path.title);
    assert.deepEqual(
      await api('/curriculum/requests', 'GET', undefined, other.token),
      [],
    );
    assert.deepEqual(
      await api('/curriculum/requests', 'GET', undefined, unassigned.token),
      [],
    );
    await api(
      `/curriculum/requests/${requested.id}`,
      'PATCH',
      { status: 'ACCEPTED' },
      student.token,
      403,
    );
    await api(
      `/curriculum/requests/${requested.id}`,
      'PATCH',
      { status: 'ACCEPTED' },
      other.token,
      403,
    );
    await api(
      `/curriculum/requests/${requested.id}`,
      'PATCH',
      { status: 'INVALID' },
      lecturer.token,
      400,
    );
    await api(
      `/curriculum/requests/${randomUUID()}`,
      'PATCH',
      { status: 'ACCEPTED' },
      lecturer.token,
      404,
    );
    await db.studentProfile.update({
      where: { userId: student.id },
      data: { assignedLecturerId: other.id },
    });
    await api(
      `/curriculum/requests/${requested.id}`,
      'PATCH',
      { status: 'ACCEPTED' },
      lecturer.token,
      403,
    );
    await db.studentProfile.update({
      where: { userId: student.id },
      data: { assignedLecturerId: lecturer.id },
    });
    const declined = requestSchema.parse(
      await api(
        `/curriculum/requests/${requested.id}`,
        'PATCH',
        { status: 'DECLINED' },
        lecturer.token,
      ),
    );
    assert.equal(declined.status, 'DECLINED');
    assert.equal(
      (await api('/profile/student', 'GET', undefined, student.token)).progress,
      null,
    );
    await api(
      '/curriculum/requests',
      'POST',
      { learningPathId: path.id },
      student.token,
      201,
    );
    const outcomes = await Promise.all(
      ['ACCEPTED', 'DECLINED'].map((status) =>
        fetch(base + `/curriculum/requests/${requested.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${lecturer.token}`,
          },
          body: JSON.stringify({ status }),
        }),
      ),
    );
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
    const winner = await outcomes.find((r) => r.status === 200).json();
    if (winner.status === 'DECLINED') {
      await api(
        '/curriculum/requests',
        'POST',
        { learningPathId: path.id },
        student.token,
        201,
      );
      await api(
        `/curriculum/requests/${requested.id}`,
        'PATCH',
        { status: 'ACCEPTED' },
        lecturer.token,
      );
    }
    const profile = await api(
      '/profile/student',
      'GET',
      undefined,
      student.token,
    );
    assert.equal(profile.progress.currentLearningPathId, path.id);
    assert.equal(profile.progress.progressPercentage, 0);
    assert.equal(profile.progress.currentLessonId, null);
    await api(
      `/curriculum/requests/${requested.id}`,
      'PATCH',
      { status: 'ACCEPTED' },
      lecturer.token,
      409,
    );
    await api(
      '/curriculum/requests',
      'POST',
      { learningPathId: path.id },
      student.token,
      409,
    );
    assert(
      (await api('/notifications', 'GET', undefined, student.token)).some(
        (n) =>
          n.type === 'COURSE_REQUEST_ACCEPTED' &&
          n.payloadJson.actionUrl === '/student/courses',
      ),
    );
    console.log(
      'PASS: request lifecycle, duplicate notification prevention, role and assignment boundaries, validation, concurrent review, assignment at 0%, and student notification',
    );
    if (process.env.QA_SERVE) {
      await db.studentProgress.delete({ where: { studentId: student.id } });
      await db.courseRequest.deleteMany({ where: { studentId: student.id } });
      await require('node:fs/promises').writeFile(
        '/tmp/ilm-course-request-fixture.json',
        JSON.stringify({
          student,
          lecturer,
          unassigned,
          admin,
          path,
          password,
        }),
        { mode: 0o600 },
      );
      serving = true;
      console.log('QA server ready on 55440');
      await new Promise((resolve) => {
        process.once('SIGTERM', resolve);
        process.once('SIGINT', resolve);
      });
    }
  } finally {
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.learningPath.deleteMany({ where: { id: { in: paths } } });
    await app.close();
    if (serving)
      await require('node:fs/promises')
        .unlink('/tmp/ilm-course-request-fixture.json')
        .catch(() => {});
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
