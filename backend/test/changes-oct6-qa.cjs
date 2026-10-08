const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
if (!process.env.DATABASE_URL || !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw Error('Disposable local DATABASE_URL required');
require('dotenv').config({ quiet: true });
process.env.NODE_ENV = 'test';
const realFetch = global.fetch;
global.fetch = (url, options) => String(url).startsWith('https://api.frankfurter.dev/')
  ? Promise.resolve(new Response(JSON.stringify([{ quote: 'LKR', rate: 300 }, { quote: 'GBP', rate: .75 }, { quote: 'EUR', rate: .9 }, { quote: 'AUD', rate: 1.5 }].map(row => ({ ...row, base: 'USD', date: new Date().toISOString().slice(0, 10) }))), { headers: { 'Content-Type': 'application/json' } }))
  : realFetch(url, options);
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { z } = require('../../frontend/node_modules/zod');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { LivekitService } = require('../dist/src/livekit/livekit.service');
const { EmailNotificationService } = require('../dist/src/notification/email-notification.service');
const { WhatsAppNotificationService } = require('../dist/src/notification/whatsapp-notification.service');
const bcrypt = require('bcrypt');
const out = path.resolve(__dirname, '../../output/changes-qa-2026-10-06');
const results = [];
let app, db;
async function main() {
  await fs.mkdir(out, { recursive: true });
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(LivekitService).useValue({
    getRoomName: id => 'qa-room-' + id, endRoom: async () => {}, generateToken: async () => ({ token: 'qa-local-simulation', wsUrl: '', isSimulation: true }),
  }).compile();
  module.get(EmailNotificationService).sendEmail = async () => ({ success: true });
  module.get(WhatsAppNotificationService).sendWhatsApp = async () => ({ success: true });
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1'); app.use(require('cookie-parser')());
  app.enableCors({ origin: 'http://localhost:3019', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }));
  db = app.get(PrismaService);
  await app.listen(process.argv.includes('--serve') ? 3009 : 0, '127.0.0.1');
  const base = (await app.getUrl()) + '/api/v1';
  async function api(name, endpoint, method = 'GET', body, token, expected = 200, validate = () => {}) {
    const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    try { assert.equal(response.status, expected, JSON.stringify(data)); assert.match(response.headers.get('content-type'), /application\/json/); await validate(data); results.push({ name, passed: true, status: response.status, at: new Date().toISOString() }); }
    catch (error) { results.push({ name, passed: false, status: response.status, error: error.message, at: new Date().toISOString() }); }
    await fs.writeFile(path.join(out, 'api-results.json'), JSON.stringify(results, null, 2));
    return data;
  }
  const password = crypto.randomBytes(18).toString('hex');
  const prefix = 'change-qa-' + crypto.randomUUID();
  async function person(role, suffix, hours = [10, 11, 12, 13]) {
    const user = await db.user.create({ data: { email: `${prefix}-${suffix}@example.test`, passwordHash: await bcrypt.hash(password, 4), role, status: 'ACTIVE', ...(role === 'LECTURER' ? { lecturerProfile: { create: { fullName: 'QA ' + suffix, bio: '', qualifications: '', specializations: ['Quran'], languages: ['English'], hourlyAvailabilityJson: hours, payoutMethod: 'bank_transfer', payoutDetails: '', status: 'ACTIVE' } } } : {}) } });
    const login = await api(suffix + ' login', '/auth/login', 'POST', { email: user.email, password }, undefined, 201);
    return { id: user.id, email: user.email, token: login.token, role };
  }
  const admin = await person('SUPER_ADMIN', 'owner'), lecturer = await person('LECTURER', 'matching-lecturer'), nonmatching = await person('LECTURER', 'evening-lecturer', [18, 19, 20, 21]);
  const studentEmail = `${prefix}-student@example.test`;
  const registration = { email: studentEmail, password, role: 'STUDENT', fullName: 'QA New Features', phone: '0000', country: 'Sri Lanka', timezone: 'Asia/Colombo', preferredHours: [13, 10, 11, 12] };
  const registered = await api('signup with selected time windows', '/auth/register', 'POST', registration, undefined, 201);
  const logged = await api('new student login', '/auth/login', 'POST', { email: studentEmail, password }, undefined, 201);
  const student = { id: registered.id, email: studentEmail, token: logged.token, role: 'STUDENT' };
  const tickets = await api('signup creates assignment request', '/support/tickets', 'GET', undefined, admin.token, 200, data => assert.ok(data.some(ticket => ticket.userId === student.id && ticket.type === 'STUDENT_REGISTRATION' && ticket.status === 'PENDING')));
  const ticket = tickets.find(item => item.userId === student.id && item.type === 'STUDENT_REGISTRATION');
  await api('preferred hours are sorted and persisted', '/profile/student', 'GET', undefined, student.token, 200, data => assert.deepEqual(data.preferredHours, [10, 11, 12, 13]));
  for (const hours of [[], [24], [-1], [10, 10], [10.5], null, 'morning']) await api('reject invalid preferred hours ' + JSON.stringify(hours), '/profile/student', 'PUT', { preferredHours: hours }, student.token, 400);
  await api('registration request cannot be resolved without assignment', `/support/tickets/${ticket.id}/status`, 'PATCH', { status: 'RESOLVED' }, admin.token, 400);
  await api('student cannot assign own lecturer', `/admin/requests/${ticket.id}/assign-lecturer`, 'POST', { lecturerId: lecturer.id }, student.token, 403);
  await api('reject nonmatching lecturer shift', `/admin/requests/${ticket.id}/assign-lecturer`, 'POST', { lecturerId: nonmatching.id }, admin.token, 400);
  await api('assign matching lecturer and resolve request', `/admin/requests/${ticket.id}/assign-lecturer`, 'POST', { lecturerId: lecturer.id }, admin.token, 201, data => assert.equal(data.assignedLecturerId, lecturer.id));
  await api('reject repeated assignment', `/admin/requests/${ticket.id}/assign-lecturer`, 'POST', { lecturerId: lecturer.id }, admin.token, 400);
  await api('request resolved after assignment', `/support/tickets/${ticket.id}`, 'GET', undefined, admin.token, 200, data => assert.equal(data.status, 'RESOLVED'));
  await api('profile assignment reflected', '/profile/student', 'GET', undefined, student.token, 200, data => assert.equal(data.assignedLecturerId, lecturer.id));
  await api('old free trial still starts', '/subscriptions/trial', 'POST', {}, student.token, 201);
  await api('old duplicate trial protection', '/subscriptions/trial', 'POST', {}, student.token, 400);
  await db.subscriptionPlan.updateMany({ data: { monthlyUsd: 60, monthlyLkr: 6000 } });
  const plans = await api('read current six-plan catalog', '/subscriptions/plans');
  await api('admin saves independent local and international prices', '/subscriptions/plans', 'PATCH', { prices: plans.map(plan => ({ id: plan.id, monthlyUsd: 60, monthlyLkr: 6000 })) }, admin.token, 200);
  await api('reject negative local price without partial update', '/subscriptions/plans', 'PATCH', { prices: plans.map((plan, index) => ({ id: plan.id, monthlyUsd: 60, monthlyLkr: index === 0 ? -1 : 6000 })) }, admin.token, 400);
  await api('server computes regional prices', '/subscriptions/plans', 'GET', undefined, undefined, 200, data => {
    z.array(z.object({ monthlyUsd: z.number(), monthlyLkr: z.number().nullable(), prices: z.object({ LKR: z.number().nullable(), USD: z.number(), GBP: z.number().nullable(), EUR: z.number().nullable(), AUD: z.number().nullable() }) })).parse(data);
    assert.equal(data[0].prices.LKR, 6000); assert.equal(data[0].prices.GBP, 45); assert.equal(data[0].internationalLkr, 18000);
  });
  await api('automatic exchange metadata exposed', '/subscriptions/currencies', 'GET', undefined, undefined, 200, data => { assert.equal(data.length, 5); assert.equal(data.find(rate => rate.code === 'GBP').lkrPerUnit, 400); assert.ok(data.every(rate => rate.available && !rate.stale)); });
  await api('manual rate write intentionally removed', '/subscriptions/currencies', 'PATCH', { rates: [] }, admin.token, 404);
  await api('finance contains rates and plan equivalents', '/admin/finance', 'GET', undefined, admin.token, 200, data => { assert.ok(Array.isArray(data.payments)); assert.equal(data.exchangeRates.length, 5); assert.equal(data.pricing[0].internationalLkr, 18000); });
  await api('student cannot change plan prices', '/subscriptions/plans', 'PATCH', { prices: [] }, student.token, 403);
  const lessonPath = await db.learningPath.create({ data: { title: 'QA Regression Course', description: 'QA', level: 'Beginner', difficulty: 'Beginner', targetAudience: 'QA', objectives: 'QA', modules: { create: { title: 'QA Module', orderIndex: 0, lessons: { create: { title: 'QA Lesson', objectives: 'QA', orderIndex: 0 } } } } }, include: { modules: { include: { lessons: true } } } });
  async function session(status = 'SCHEDULED', offset = -10) { const startsAt = new Date(Date.now() + offset * 60000); return db.session.create({ data: { studentId: student.id, lecturerId: lecturer.id, startsAt, endsAt: new Date(+startsAt + 40 * 60000), status, lessonId: lessonPath.modules[0].lessons[0].id } }); }
  const current = await session();
  await api('student cannot start lesson clock', `/livekit/start/${current.id}`, 'POST', {}, student.token, 403);
  await api('student sees waiting clock', `/livekit/clock/${current.id}`, 'GET', undefined, student.token, 200, data => assert.equal(data.meetingStartedAt, null));
  const started = await api('lecturer starts shared clock', `/livekit/start/${current.id}`, 'POST', {}, lecturer.token, 201, data => { assert.equal(data.status, 'IN_PROGRESS'); assert.equal(Date.parse(data.warningAt) - Date.parse(data.meetingStartedAt), 40 * 60000); assert.equal(Date.parse(data.meetingEndsAt) - Date.parse(data.meetingStartedAt), 45 * 60000); });
  await api('clock start is idempotent', `/livekit/start/${current.id}`, 'POST', {}, lecturer.token, 201, data => assert.equal(data.meetingStartedAt, started.meetingStartedAt));
  await api('outsider clock denied', `/livekit/clock/${current.id}`, 'GET', undefined, nonmatching.token, 403);
  await api('active student may join current session', `/livekit/token/${current.id}`, 'GET', undefined, student.token, 200);
  const future = await session('SCHEDULED', 180);
  await api('active student may join future session', `/livekit/token/${future.id}`, 'GET', undefined, student.token, 200);
  await db.session.update({ where: { id: current.id }, data: { meetingStartedAt: new Date(Date.now() - 46 * 60000) } });
  await api('45-minute expiry completes session', `/livekit/clock/${current.id}`, 'GET', undefined, student.token, 200, data => { assert.equal(data.expired, true); assert.equal(data.status, 'COMPLETED'); });
  await api('completed meeting cannot rejoin', `/livekit/token/${current.id}`, 'GET', undefined, student.token, 400);
  await api('completed meeting cannot restart', `/livekit/start/${current.id}`, 'POST', {}, lecturer.token, 400);
  await api('old admin sessions list remains available', '/admin/sessions', 'GET', undefined, admin.token, 200, data => assert.ok(data.some(item => item.id === current.id)));
  await api('old account status response remains filtered', `/admin/users/${nonmatching.id}/status`, 'PATCH', { status: 'SUSPENDED' }, admin.token, 200, data => assert.equal(data.passwordHash, undefined));
  await api('old suspended token remains rejected', '/auth/me', 'GET', undefined, nonmatching.token, 401);
  await api('availability can change after assignment', '/profile/student', 'PUT', { preferredHours: [18, 19, 20, 21] }, student.token, 200, data => assert.deepEqual(data.preferredHours, [18, 19, 20, 21]));
  const firstStart = new Date(Date.now() + 2 * 86400000);
  const adjacentFirst = await db.session.create({ data: { studentId: student.id, lecturerId: lecturer.id, startsAt: firstStart, endsAt: new Date(+firstStart + 40 * 60000), status: 'SCHEDULED' } });
  const adjacentSecond = await db.session.create({ data: { studentId: student.id, lecturerId: lecturer.id, startsAt: adjacentFirst.endsAt, endsAt: new Date(+firstStart + 80 * 60000), status: 'CANCELED' } });
  await api('reopening must preserve lecturer ten-minute break', `/livekit/reopen/${adjacentSecond.id}`, 'POST', {}, lecturer.token, 400);
  await db.session.deleteMany({ where: { id: { in: [adjacentFirst.id, adjacentSecond.id] } } });
  await fs.writeFile(path.join(out, 'fixture.json'), JSON.stringify({ admin, lecturer, nonmatching, student, password, ticketId: ticket.id, currentId: current.id, futureId: future.id, courseId: lessonPath.id }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ total: results.length, passed: results.filter(item => item.passed).length, failed: results.filter(item => !item.passed) }, null, 2));
  if (process.argv.includes('--serve')) { console.log('QA API ready on 3009'); for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(); }); }
  else { await app.close(); process.exitCode = results.some(item => !item.passed) ? 1 : 0; }
}
main().catch(async error => { console.error(error); if (app) await app.close(); process.exitCode = 1; });
