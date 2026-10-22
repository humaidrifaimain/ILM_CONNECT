const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
process.env.DATABASE_URL = process.env.FEEDBACK_QA_DATABASE_URL || 'postgresql://feedback_qa@127.0.0.1:55447/feedback_qa';
if (!/^postgresql:\/\/[^/]*@(localhost|127\.0\.0\.1):/.test(process.env.DATABASE_URL)) throw new Error('Use an isolated local QA database');
process.env.NODE_ENV = 'test';
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { LivekitService } = require('../dist/src/livekit/livekit.service');
const { EmailNotificationService } = require('../dist/src/notification/email-notification.service');
const { WhatsAppNotificationService } = require('../dist/src/notification/whatsapp-notification.service');
const { chromium, expect } = require(process.env.QA_PLAYWRIGHT_PATH || '/Users/humaid/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/test');
const { z } = require('../../frontend/node_modules/zod');
const bcrypt = require('bcrypt');
const api = 'http://localhost:3017/api/v1', web = 'http://localhost:3007';
const out = path.resolve(__dirname, '../../output/required-lesson-feedback-qa');
const results = [], users = [], emails = [], whatsapp = [], runtimeErrors = [];
const note = 'The student improved Alif and Baa pronunciation. Practise each letter at home.';
const password = crypto.randomUUID() + '!aA1';
let app, db, browser;
const pendingSchema = z.array(z.object({ id: z.string(), startsAt: z.iso.datetime(), status: z.enum(['COMPLETED', 'IN_PROGRESS']), student: z.object({ fullName: z.string() }), notes: z.object({ sharedNotes: z.string() }).nullable() }));
function passed(name) { results.push({ name, passed: true }); console.log('PASS ' + name); }
async function request(endpoint, person, method = 'GET', body, status = 200) {
  const response = await fetch(api + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(person ? { Authorization: 'Bearer ' + person.token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(response.status, status, endpoint + ' status');
  assert.match(response.headers.get('content-type'), /application\/json/);
  return response.json();
}
async function person(role, name) {
  const data = { email: `feedback-${crypto.randomUUID()}@example.test`, passwordHash: await bcrypt.hash(password, 4), role, status: 'ACTIVE' };
  if (role === 'LECTURER') data.lecturerProfile = { create: { fullName: name, bio: 'QA', qualifications: 'QA', languages: ['English'], specializations: ['Quran'], hourlyAvailabilityJson: [10], payoutMethod: 'bank_transfer', payoutDetails: 'QA', status: 'ACTIVE' } };
  if (role === 'STUDENT') data.studentProfile = { create: { fullName: name, phone: '+94771234567', country: 'Sri Lanka', timezone: 'Asia/Colombo', preferredLanguage: 'English', learningGoals: 'QA' } };
  const user = await db.user.create({ data }); users.push(user.id);
  const login = await request('/auth/login', null, 'POST', { email: user.email, password }, 201);
  return { ...user, token: login.token };
}
async function session(student, lecturer, status = 'COMPLETED') {
  const startsAt = new Date(Date.now() - 5 * 60000);
  return db.session.create({ data: { studentId: student.id, lecturerId: lecturer.id, startsAt, endsAt: new Date(+startsAt + 40 * 60000), status, livekitRoomName: 'qa-feedback-' + crypto.randomUUID() } });
}
async function login(page, user, destination) {
  await page.goto(web + '/auth/signin');
  await page.getByRole('textbox', { name: 'Email address' }).fill(user.email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL('**/' + destination);
}
async function saveForm(page, value = note) {
  const dialog = page.getByRole('dialog', { name: 'Lesson feedback required' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Feedback note' }).fill(value);
  await dialog.getByRole('button', { name: 'Save feedback and finish' }).click();
  await expect(dialog).toBeHidden();
}
async function run() {
  await fs.mkdir(out, { recursive: true });
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(LivekitService).useValue({ isConfigured: () => false, getRoomName: id => 'qa-' + id, endRoom: async () => {}, generateToken: async () => ({ token: 'sim_qa', wsUrl: '', isSimulation: true }) })
    .overrideProvider(EmailNotificationService).useValue({ sendEmail: async payload => { emails.push(payload); return true; }, buildBookingEmail: () => ({}) })
    .overrideProvider(WhatsAppNotificationService).useValue({ sendWhatsApp: async payload => { whatsapp.push(payload); return true; }, buildBookingMessage: () => '' }).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1'); app.use(require('cookie-parser')()); app.enableCors({ origin: web, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(3017); db = app.get(PrismaService);
  const lecturer = await person('LECTURER', 'QA Lecturer'), outsider = await person('LECTURER', 'QA Other Lecturer');
  const student = await person('STUDENT', 'QA Student'), admin = await person('ADMIN', 'QA Admin');
  await db.studentProfile.update({ where: { userId: student.id }, data: { assignedLecturerId: lecturer.id } });
  await db.subscription.create({ data: { studentId: student.id, tier: 'Standard', status: 'ACTIVE', currentPeriodStart: new Date(Date.now() - 86400000), currentPeriodEnd: new Date(Date.now() + 86400000 * 30), lkrAmount: 0, fxRateApplied: 1 } });
  await request('/bookings/lecturer/pending-notes', null, 'GET', undefined, 401);
  await request('/bookings/lecturer/pending-notes', student, 'GET', undefined, 403);
  passed('Pending feedback requires lecturer authentication');
  const active = await session(student, lecturer, 'IN_PROGRESS');
  for (const value of [undefined, '', ' '.repeat(100), 'Short note', 'a'.repeat(29), 'a'.repeat(10001), 42]) {
    await request('/bookings/' + active.id, lecturer, 'PATCH', { status: 'COMPLETED', notes: value }, 400);
  }
  assert.equal((await db.session.findUnique({ where: { id: active.id } })).status, 'IN_PROGRESS');
  passed('Missing, whitespace, short, oversized and malformed feedback cannot complete a session');
  await request('/bookings/' + active.id, outsider, 'PATCH', { status: 'COMPLETED', notes: note }, 403);
  await request('/bookings/' + active.id, student, 'PATCH', { status: 'COMPLETED', notes: note }, 403);
  passed('Other lecturers and students cannot write lecturer feedback');
  pendingSchema.parse(await request('/bookings/lecturer/pending-notes', lecturer));
  assert.deepEqual(await request('/bookings/lecturer/pending-notes', outsider), []);
  passed('Pending feedback contract and lecturer ownership');
  await request('/bookings/' + active.id, lecturer, 'PATCH', { status: 'COMPLETED', notes: '  ' + note + '  ' });
  assert.equal((await db.sessionNotes.findUnique({ where: { sessionId: active.id } })).sharedNotes, note);
  assert.equal((await db.session.findUnique({ where: { id: active.id } })).status, 'COMPLETED');
  passed('Completion stores trimmed shared feedback');
  assert.equal(emails.length, 1); assert.equal(whatsapp.length, 1);
  assert.equal(emails[0].toEmail, student.email); assert.ok(emails[0].textContent.includes(note));
  assert.equal(whatsapp[0].toPhone, '+94771234567'); assert.ok(whatsapp[0].message.includes(note));
  assert.ok((await request('/notifications', student)).some(item => item.type === 'LESSON_FEEDBACK' && item.payloadJson.message.includes(note)));
  passed('Feedback reaches account email, phone and persistent in-app notification');
  await request('/bookings/' + active.id, lecturer, 'PATCH', { status: 'COMPLETED', notes: note });
  assert.equal(emails.length, 1);
  await request('/bookings/' + active.id, lecturer, 'PATCH', { notes: ' ' }, 400);
  passed('Retry does not resend notifications and saved feedback cannot be cleared');
  const concurrent = await session(student, lecturer, 'IN_PROGRESS');
  const beforeEmails = emails.length;
  await Promise.all([1, 2].map(() => request('/bookings/' + concurrent.id, lecturer, 'PATCH', { status: 'COMPLETED', notes: note })));
  assert.equal(emails.length, beforeEmails + 1);
  passed('Concurrent completion submissions send feedback once');
  const adminNotes = await request('/feedbacks/lesson-notes', admin);
  assert.ok(adminNotes.some(item => item.id === active.id && item.notes.sharedNotes === note));
  await request('/feedbacks/lesson-notes', lecturer, 'GET', undefined, 403);
  await request('/feedbacks/lesson-notes', student, 'GET', undefined, 403);
  const studentBookings = await request('/bookings/student', student);
  assert.equal(studentBookings.find(item => item.id === active.id).notes.sharedNotes, note);
  assert.equal(studentBookings.find(item => item.id === active.id).notes.internalNotes, undefined);
  passed('Admin and student receive shared notes with private lecturer notes excluded');

  const savedActive = await session(student, lecturer, 'IN_PROGRESS');
  await request('/bookings/' + savedActive.id, lecturer, 'PATCH', { notes: note });
  assert.equal((await db.sessionNotes.findUnique({ where: { sessionId: savedActive.id } })).sharedNotes, note);
  assert.ok(!(await request('/bookings/lecturer/pending-notes', lecturer)).some(item => item.id === savedActive.id));
  passed('Previously saved in-progress feedback is not requested again');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Colombo' });
  const page = await context.newPage(); page.on('pageerror', error => runtimeErrors.push(error.message));
  await login(page, lecturer, 'lecturer/dashboard');
  await expect(page.getByRole('dialog', { name: 'Lesson feedback required' })).toBeHidden();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await page.waitForURL('**/auth/signin');
  await login(page, lecturer, 'lecturer/dashboard');
  await expect(page.getByRole('dialog', { name: 'Lesson feedback required' })).toBeHidden();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Lesson feedback required' })).toBeHidden();
  passed('Saved feedback stays resolved after logout, login and reload');
  const pending = await session(student, lecturer);
  await page.reload();
  const dialog = page.getByRole('dialog', { name: 'Lesson feedback required' });
  const textbox = dialog.getByRole('textbox', { name: 'Feedback note' });
  const save = dialog.getByRole('button', { name: 'Save feedback and finish' });
  await expect(dialog).toBeVisible(); await expect(save).toBeDisabled();
  await expect(textbox).toBeFocused();
  await textbox.fill(' '.repeat(40)); await expect(save).toBeDisabled();
  await textbox.fill('Short note'); await expect(save).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5); await expect(dialog).toBeVisible();
  assert.equal(await dialog.getByRole('button').count(), 1);
  passed('Popup rejects blank/short notes and has no dismissal through Escape, backdrop or close button');
  await textbox.fill(note); await expect(save).toBeEnabled();
  await page.evaluate(() => history.back());
  await expect(dialog).toBeVisible(); await expect(page).toHaveURL(/\/lecturer\/dashboard$/);
  await page.keyboard.press('Tab'); await expect(save).toBeFocused();
  await page.keyboard.press('Tab'); await expect(textbox).toBeFocused();
  passed('Browser Back stays blocked and keyboard focus stays inside the popup');
  await page.reload(); await expect(textbox).toHaveValue(note);
  passed('Required popup and draft survive reload');
  const reopenedContext = await browser.newContext(); const reopenedPage = await reopenedContext.newPage();
  await login(reopenedPage, lecturer, 'lecturer/dashboard');
  await expect(reopenedPage.getByRole('dialog', { name: 'Lesson feedback required' })).toBeVisible();
  await reopenedContext.close();
  passed('Required feedback returns in a fresh browser session');
  await page.route('**/api/v1/bookings/' + pending.id, route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'QA save failed. Please retry.' }) }));
  await save.click(); await expect(dialog.getByRole('alert')).toHaveText('QA save failed. Please retry.');
  await expect(textbox).toHaveValue(note); await expect(dialog).toBeVisible();
  passed('Save failure keeps the popup and draft with a retryable error');
  await page.unroute('**/api/v1/bookings/' + pending.id);
  await page.addScriptTag({ path: '/tmp/ilm-student-qa-tools/node_modules/axe-core/axe.min.js' });
  const axe = await dialog.evaluate(element => window.axe.run(element));
  assert.deepEqual(axe.violations.map(item => ({ id: item.id, impact: item.impact })), []);
  await page.screenshot({ path: path.join(out, 'required-feedback-desktop.png') });
  passed('Required popup passes axe accessibility checks');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(out, 'required-feedback-mobile.png') });
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth));
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await page.evaluate(() => document.documentElement.style.fontSize = '');
  await page.setViewportSize({ width: 1440, height: 1000 });
  passed('Popup reflows at phone width and 200% text size');
  await save.click(); await expect(dialog).toBeHidden();
  await page.getByRole('link', { name: 'Sessions', exact: true }).first().click();
  await page.waitForURL('**/lecturer/sessions');
  passed('Successful save unlocks dashboard navigation');
  const savedContext = await browser.newContext(); const savedPage = await savedContext.newPage();
  await login(savedPage, lecturer, 'lecturer/dashboard');
  await expect(savedPage.getByRole('dialog', { name: 'Lesson feedback required' })).toBeHidden();
  assert.equal((await db.sessionNotes.findUnique({ where: { sessionId: pending.id } })).sharedNotes, note);
  await savedContext.close();
  passed('Popup submission remains saved in a fresh browser login');
  const manual = await session(student, lecturer, 'SCHEDULED');
  await page.goto(web + '/lecturer/sessions/' + manual.id + '/room');
  await page.getByRole('button', { name: 'End Session', exact: true }).waitFor();
  await page.getByRole('button', { name: 'End Session', exact: true }).click();
  await expect(dialog).toBeVisible();
  assert.equal((await db.session.findUnique({ where: { id: manual.id } })).status, 'IN_PROGRESS');
  await saveForm(page); await page.waitForURL('**/lecturer/sessions');
  assert.equal((await db.session.findUnique({ where: { id: manual.id } })).status, 'COMPLETED');
  passed('Manual classroom completion requires feedback before completing and leaving');
  const backSession = await session(student, lecturer, 'SCHEDULED');
  await page.goto(web + '/lecturer/sessions/' + backSession.id + '/room');
  await page.getByRole('timer', { name: 'Lesson elapsed time' }).filter({ hasText: /\d\d:\d\d:\d\d/ }).waitFor();
  await page.evaluate(() => history.back());
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(new RegExp('/lecturer/sessions/' + backSession.id + '/room$'));
  await saveForm(page); await page.waitForURL('**/lecturer/sessions');
  passed('Back from an active classroom opens required feedback and retains the room until save');
  const expiring = await session(student, lecturer, 'SCHEDULED');
  await page.goto(web + '/lecturer/sessions/' + expiring.id + '/room');
  await page.getByRole('timer', { name: 'Lesson elapsed time' }).filter({ hasText: /\d\d:\d\d:\d\d/ }).waitFor();
  await db.session.update({ where: { id: expiring.id }, data: { meetingStartedAt: new Date(Date.now() - 45 * 60000 - 1000) } });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await saveForm(page); await page.waitForURL('**/lecturer/sessions');
  assert.equal((await db.sessionNotes.findUnique({ where: { sessionId: expiring.id } })).sharedNotes, note);
  passed('Automatic 45-minute expiry requires and accepts lecturer feedback');
  await context.close();
  const adminContext = await browser.newContext(); const adminPage = await adminContext.newPage();
  await login(adminPage, admin, 'admin/dashboard'); await adminPage.goto(web + '/admin/feedback');
  await expect(adminPage.getByRole('heading', { name: 'Lecturer lesson feedback' })).toBeVisible();
  await expect(adminPage.getByText(note, { exact: true }).first()).toBeVisible();
  await adminPage.screenshot({ path: path.join(out, 'admin-lesson-feedback.png'), fullPage: true, animations: 'disabled' });
  passed('Admin Feedback page displays lecturer lesson notes');
  await adminContext.close();
  const studentContext = await browser.newContext(); const studentPage = await studentContext.newPage();
  await login(studentPage, student, 'student/dashboard');
  await studentPage.goto(web + '/student/courses/beginner-qaida/feedback');
  await expect(studentPage.getByText(note, { exact: false }).first()).toBeVisible();
  passed('Student feedback page displays the saved lecturer note');
  await studentContext.close();
  assert.deepEqual(runtimeErrors, []); passed('No lecturer browser runtime errors');
}
run().catch(async error => { results.push({ name: 'QA execution', passed: false, error: error.stack }); console.error(error); process.exitCode = 1;
    const page = browser?.contexts()[0]?.pages()[0]; if (page) await page.screenshot({ path: path.join(out, 'failure.png') }); })
  .finally(async () => {
    if (browser) await browser.close();
    if (db) { await db.notification.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); }
    if (app) await app.close();
    await fs.mkdir(out, { recursive: true }); await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ total: results.length, passed: results.filter(item => item.passed).length }));
  }).then(() => process.exit(process.exitCode || 0));
