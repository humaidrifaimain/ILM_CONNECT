const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const bcrypt = require('bcrypt');

if (!process.env.DATABASE_URL || !['127.0.0.1', 'localhost'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Use an isolated local database.');
process.env.NODE_ENV = 'test';
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/prisma/prisma.service');

(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.use(require('cookie-parser')());
  app.enableCors({ origin: 'http://localhost:3003', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(3002, '127.0.0.1');
  const db = app.get(PrismaService);
  const password = randomUUID();
  const users = [];
  async function api(endpoint, method = 'GET', body, token, expected = 200) {
    const response = await fetch(`http://127.0.0.1:3002/api/v1${endpoint}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    assert.equal(response.status, expected, `${method} ${endpoint}: ${JSON.stringify(result)}`);
    return result;
  }
  async function person(role) {
    const user = await db.user.create({ data: { email: `${randomUUID()}@example.test`, passwordHash: await bcrypt.hash(password, 4), role, status: 'ACTIVE', ...(role === 'LECTURER' ? { lecturerProfile: { create: { fullName: 'QA Lecturer', bio: '', qualifications: '', languages: ['English'], specializations: ['Quran'], hourlyAvailabilityJson: [9, 10, 11, 12, 13], payoutMethod: 'bank_transfer', payoutDetails: '', status: 'ACTIVE' } } } : { studentProfile: { create: { fullName: 'QA Student', phone: '000000000', country: 'Sri Lanka', timezone: 'Asia/Colombo', preferredLanguage: 'English', learningGoals: '' } } }) } });
    users.push(user.id);
    const auth = await api('/auth/login', 'POST', { email: user.email, password }, undefined, 201);
    return { ...auth.user, email: user.email, id: user.id, token: auth.token };
  }
  const lecturer = await person('LECTURER'), other = await person('LECTURER'), student = await person('STUDENT');
  const course = await db.learningPath.create({ data: { title: 'QA Quran course', level: 'Beginner', difficulty: 'Easy', description: 'Course for local QA', targetAudience: 'Students', objectives: 'Practice', modules: { create: { title: 'Module 1', orderIndex: 1, lessons: { create: { title: 'Lesson 1', objectives: 'Practice', orderIndex: 1 } } } } }, include: { modules: { include: { lessons: true } } } });
  await db.studentProfile.update({ where: { userId: student.id }, data: { assignedLecturerId: lecturer.id } });
  await db.studentProgress.create({ data: { studentId: student.id, currentLearningPathId: course.id, currentModuleId: course.modules[0].id, currentLessonId: course.modules[0].lessons[0].id } });
  await db.subscription.create({ data: { studentId: student.id, tier: 'Standard', status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000), lkrAmount: 0, fxRateApplied: 1 } });
  await db.message.create({ data: { senderId: student.id, recipientId: lecturer.id, threadId: [student.id, lecturer.id].sort().join('_'), content: 'QA conversation' } });
  const endpoint = `/curriculum/paths/${course.id}/assessments`;
  const questions = Array.from({ length: 10 }, (_, i) => ({ prompt: `QA question ${i + 1}`, options: ['A answer', 'B answer', 'C answer', 'D answer'], correctOption: i % 4 }));
  const saved = await api(endpoint, 'POST', { title: 'API QA assessment', questions }, lecturer.token, 201);
  assert.equal(saved.questions.length, 10);
  assert.equal((await api(endpoint, 'GET', undefined, lecturer.token))[0].id, saved.id);
  assert.equal((await api(endpoint, 'GET', undefined, other.token)).length, 0);
  await api(endpoint, 'POST', { title: 'Invalid', questions: [{ ...questions[0], correctOption: 4 }] }, lecturer.token, 400);
  await api(endpoint, 'POST', { title: 'Invalid', questions: [{ ...questions[0], options: ['A'] }] }, lecturer.token, 400);
  await api(endpoint, 'POST', { title: '  ', questions }, lecturer.token, 400);
  await api(endpoint, 'POST', { title: 'Invalid', questions: [] }, lecturer.token, 400);
  await api(endpoint, 'GET', undefined, student.token, 403);
  await api(endpoint, 'POST', { title: 'Denied', questions }, student.token, 403);
  await api(endpoint, 'GET', undefined, undefined, 401);
  await api(`/curriculum/paths/${randomUUID()}/assessments`, 'GET', undefined, lecturer.token, 404);
  const out = path.resolve(__dirname, '../../output/playwright/oct7-ui');
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(path.join(out, 'fixture.json'), JSON.stringify({ lecturer, student, course, password }));
  await fs.writeFile(path.join(out, 'questions.json'), JSON.stringify(questions));
  await fs.writeFile(path.join(out, 'invalid.json'), JSON.stringify([{ prompt: 'Invalid' }]));
  console.log('PASS: persistence, 10 MCQs, lecturer isolation, validation, role guards, authentication, missing course. QA READY');
  const cleanup = async () => { await db.learningPath.delete({ where: { id: course.id } }); await db.user.deleteMany({ where: { id: { in: users } } }); await app.close(); await fs.rm(path.join(out, 'fixture.json'), { force: true }); process.exit(0); };
  if (!process.argv.includes('--serve')) await cleanup();
  process.on('SIGINT', cleanup); process.on('SIGTERM', cleanup);
})().catch(error => { console.error(error); process.exit(1); });
