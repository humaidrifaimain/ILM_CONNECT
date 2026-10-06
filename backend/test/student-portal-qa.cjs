const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
process.env.NODE_ENV = 'test';
process.env.RESEND_API_KEY = '';
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/src/app.module.js');
const { PrismaService } = require('../dist/src/prisma/prisma.service.js');
const { EmailNotificationService } = require('../dist/src/notification/email-notification.service.js');
const { WhatsAppNotificationService } = require('../dist/src/notification/whatsapp-notification.service.js');
const { LivekitService } = require('../dist/src/livekit/livekit.service.js');
const bcrypt = require('bcrypt');
const output = path.resolve(root, '../output/playwright/student-qa');
const port = Number(process.env.STUDENT_QA_PORT || 3002);
const prefix = `qa-student-${crypto.randomUUID()}`;
const userIds = [];
const checks = [];
let app, db, directory;
const password = 'StudentQA-2026-Temporary!';

async function request(endpoint, method = 'GET', body, token) {
  const response = await fetch(`http://localhost:${port}/api/v1${endpoint}`, {
    method, headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const data = response.status === 204 ? null : response.headers.get('content-type')?.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer()).toString('base64');
  return { status: response.status, data };
}
async function check(name, endpoint, method, body, token, expected, predicate) {
  const result = await request(endpoint, method, body, token);
  const statuses = Array.isArray(expected) ? expected : [expected];
  const passed = statuses.includes(result.status) && (!predicate || predicate(result.data));
  const response = JSON.parse(JSON.stringify(result.data, (key, value) => /^(token|passwordHash|payoutDetails|internalNotes)$/.test(key) ? '[redacted]' : value));
  checks.push({ name, endpoint, method: method || 'GET', expected: statuses, actual: result.status, passed, response });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: ${result.status}`);
  return result.data;
}
async function account(suffix, role = 'STUDENT') {
  const user = await db.user.create({ data: {
    email: `${prefix}-${suffix}@example.test`, passwordHash: await bcrypt.hash(password, 10), role, status: 'ACTIVE',
    ...(role === 'LECTURER' ? { lecturerProfile: { create: { fullName: 'QA Assigned Scholar', bio: 'QA fixture', qualifications: 'QA fixture', specializations: ['Quran'], languages: ['English'], hourlyAvailabilityJson: Array.from({length:24}, (_, i) => i), payoutMethod: 'bank_transfer', payoutDetails: 'PRIVATE_QA_BANK_DETAILS', status: 'ACTIVE' } } } : { studentProfile: { create: { fullName: `QA Student ${suffix}`, phone: '000000000', country: 'Sri Lanka', timezone: 'Asia/Colombo', preferredLanguage: 'English', learningGoals: 'QA learning' } } }),
  } });
  userIds.push(user.id);
  const login = await request('/auth/login', 'POST', { email: user.email, password });
  if (login.status !== 201) throw new Error(`Fixture login failed: ${login.status}`);
  return { id: user.id, email: user.email, token: login.data.token };
}
async function subscription(student, expired = false, tier = 'Trial') {
  return db.subscription.create({ data: { studentId: student.id, tier, status: 'ACTIVE', currentPeriodStart: new Date(Date.now() - 86400000), currentPeriodEnd: new Date(Date.now() + (expired ? -60000 : 7 * 86400000)), lkrAmount: 0, fxRateApplied: 1 } });
}
async function slot(lecturer, date) {
  return db.availabilitySlot.create({ data: { lecturerId: lecturer.id, startsAt: date, endsAt: new Date(date.getTime() + 40 * 60000), status: 'OPEN' } });
}
async function session(student, lecturer, hours, status = 'SCHEDULED', lessonId) {
  const startsAt = new Date(Date.now() + hours * 3600000);
  return db.session.create({ data: { studentId: student.id, lecturerId: lecturer.id, startsAt, endsAt: new Date(startsAt.getTime() + 40 * 60000), status, lessonId, livekitRoomName: `qa-room-${crypto.randomUUID()}` } });
}
async function cleanup() {
  if (db) {
    const registered = await db.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } });
    await db.user.deleteMany({ where: { id: { in: [...userIds, ...registered.map(user => user.id)] } } });
  }
  if (app) await app.close();
  if (directory) await fs.rm(directory, { recursive: true, force: true });
  console.log('Temporary QA accounts and files removed.');
}
async function run() {
  await fs.mkdir(output, { recursive: true });
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ilm-student-qa-'));
  process.env.MATERIAL_UPLOAD_DIR = directory;
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(LivekitService).useValue({ getRoomName: id => `qa-room-${id}`, generateToken: async () => ({ token: 'sim_qa', wsUrl: '', isSimulation: true }) })
    .compile();
  module.get(EmailNotificationService).sendEmail = async () => ({ success: true });
  module.get(WhatsAppNotificationService).sendWhatsApp = async () => ({ success: true });
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.use(require('cookie-parser')());
  app.enableCors({ origin: ['http://localhost:3000'], credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }));
  db = app.get(PrismaService);
  await app.listen(port);
  const lecturer = await account('lecturer', 'LECTURER');
  const student = await account('active');
  const outsider = await account('outsider');
  const expired = await account('expired');
  const fresh = await account('fresh');
  for (const person of [student, outsider, expired]) await db.studentProfile.update({ where: { userId: person.id }, data: { assignedLecturerId: lecturer.id } });
  await subscription(student); await subscription(outsider); await subscription(expired, true);
  const learningPath = await db.learningPath.findFirst({ include: { modules: { orderBy: { orderIndex: 'asc' }, include: { lessons: { orderBy: { orderIndex: 'asc' } } } } } });
  if (!learningPath?.modules[0]?.lessons[0]) throw new Error('Curriculum is not seeded');
  const lesson = learningPath.modules[0].lessons[0];
  await db.studentProgress.create({ data: { studentId: student.id, currentLearningPathId: learningPath.id, currentModuleId: lesson.moduleId, currentLessonId: lesson.id, progressPercentage: 10 } });
  const completed = await session(student, lecturer, -24, 'COMPLETED', lesson.id);
  await db.sessionNotes.create({ data: { sessionId: completed.id, lecturerId: lecturer.id, topicsCovered: 'QA topic', homework: 'QA homework', studentProgressRating: 4, internalNotes: 'PRIVATE_QA_LECTURER_NOTE', sharedNotes: 'QA shared student notes' } });
  const upcoming = await session(student, lecturer, 72, 'SCHEDULED', lesson.id);
  const live = await session(student, lecturer, -0.1, 'IN_PROGRESS', lesson.id);
  const canceled = await session(student, lecturer, 96, 'CANCELED', lesson.id);
  const expiredSession = await session(expired, lecturer, 1, 'SCHEDULED', lesson.id);
  for (const hours of [120,144,168,192,216,240,264]) await slot(lecturer, new Date(Date.now() + hours * 3600000));
  await fs.writeFile(path.join(output, 'fixtures.json'), JSON.stringify({ prefix, password, lecturer, student, outsider, expired, fresh, courseId: 'noorani-qaida', learningPathId: learningPath.id, lessonId: lesson.id, completed, upcoming, live, canceled, expiredSession }, null, 2), { mode: 0o600 });
  console.log(`QA fixture server ready on http://localhost:${port}`);
  if (process.argv.includes('--serve')) {
    const stop = async () => { await cleanup(); process.exit(); };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    return;
  }

  const registration = { email: `${prefix}-register@example.test`, password, fullName: 'QA New Student', phone: '000000000', country: 'Sri Lanka', timezone: 'Asia/Colombo', role: 'STUDENT' };
  for (const [name, patch] of [ ['invalid email', {email:'invalid'}], ['short password', {password:'12345'}], ['empty name', {fullName:''}], ['admin role', {role:'ADMIN'}], ['protected tokenVersion', {tokenVersion:99}], ['missing phone', {phone:''}] ]) {
    await check(`Registration rejects ${name}`, '/auth/register', 'POST', {...registration,...patch}, undefined, 400);
  }
  await check('Registration creates student', '/auth/register', 'POST', registration, undefined, 201);
  await check('Duplicate registration rejected', '/auth/register', 'POST', registration, undefined, 409);
  await check('Case-insensitive duplicate rejected', '/auth/register', 'POST', {...registration,email:registration.email.toUpperCase()}, undefined,409);
  await check('Whitespace-only registration name rejected', '/auth/register','POST',{...registration,email:`${prefix}-spaces@example.test`,fullName:'   '},undefined,400);
  await check('Invalid registration timezone rejected', '/auth/register','POST',{...registration,email:`${prefix}-timezone@example.test`,timezone:'Mars/Olympus'},undefined,400);
  await check('Wrong password rejected', '/auth/login','POST',{email:student.email,password:'wrong'},undefined,401);
  await check('Unknown email rejected', '/auth/login','POST',{email:`${prefix}-absent@example.test`,password},undefined,401);
  await check('Uppercase email login accepted', '/auth/login','POST',{email:student.email.toUpperCase(),password},undefined,201);
  await check('Authenticated account identity', '/auth/me','GET',undefined,student.token,200,data=>data.id===student.id);
  for (const endpoint of ['/profile/student','/bookings/student','/messages/threads','/support/my-tickets','/progress/student','/materials','/subscriptions/payments']) await check(`Unauthenticated ${endpoint}`,endpoint,'GET',undefined,undefined,401);
  await check('Tampered token rejected','/auth/me','GET',undefined,'invalid.jwt.token',401);
  for (const endpoint of ['/admin/users','/bookings/lecturer','/profile/lecturer','/support/tickets']) await check(`Student cannot access ${endpoint}`,endpoint,'GET',undefined,student.token,403);
  await check('Profile excludes lecturer financial data','/profile/student','GET',undefined,student.token,200,data=>!data.assignedLecturer?.payoutDetails);
  await check('Bookings exclude internal notes and financial data','/bookings/student','GET',undefined,student.token,200,data=>data.every(item=>!item.notes?.internalNotes&&!item.lecturer?.payoutDetails));
  await check('Profile valid edit persists','/profile/student','PUT',{fullName:'QA Student Updated',timezone:'Europe/London'},student.token,200,data=>data.fullName==='QA Student Updated');
  for (const [name,body] of [['assignment',{assignedLecturerId:outsider.id}],['tier',{currentTier:'PREMIUM'}],['blank name',{fullName:' '}],['invalid timezone',{timezone:'Mars/Olympus'}],['oversized goals',{learningGoals:'x'.repeat(5001)}],['wrong phone type',{phone:123}]]) await check(`Profile rejects ${name}`,'/profile/student','PUT',body,student.token,400);
  await check('Fresh account has dashboard access','/subscriptions/access','GET',undefined,fresh.token,200,data=>data.requiresSubscription===false);
  await check('Fresh account has no subscription','/subscriptions/me','GET',undefined,fresh.token,404);
  await check('Claim trial','/subscriptions/trial','POST',{},fresh.token,201);
  await check('Duplicate trial rejected','/subscriptions/trial','POST',{},fresh.token,400);
  await check('Expired trial gated','/subscriptions/access','GET',undefined,expired.token,200,data=>data.requiresSubscription===true);
  await check('Checkout honestly unavailable','/subscriptions','POST',{tier:'Standard',lkrAmount:1},student.token,501);
  await check('Own payment history empty','/subscriptions/payments','GET',undefined,student.token,200,data=>data.length===0);
  await check('Booking within 12h rejected','/bookings','POST',{lecturerId:lecturer.id,startsAt:new Date(Date.now()+3600000).toISOString()},student.token,400);
  await check('Unassigned student booking rejected','/bookings','POST',{lecturerId:lecturer.id,startsAt:new Date(Date.now()+72*3600000).toISOString()},fresh.token,400);
  await check('Expired booking rejected','/bookings','POST',{lecturerId:lecturer.id,startsAt:new Date(Date.now()+120*3600000).toISOString()},expired.token,400);
  await check('Wrong assigned lecturer rejected','/bookings','POST',{lecturerId:outsider.id,startsAt:new Date(Date.now()+120*3600000).toISOString()},student.token,[400,403]);
  await check('Malformed booking date rejected','/bookings','POST',{lecturerId:lecturer.id,startsAt:'not-a-date'},student.token,400);
  await check('Foreign cancellation rejected',`/bookings/${upcoming.id}`,'DELETE',{},outsider.token,403);
  await check('Foreign reschedule rejected',`/bookings/${upcoming.id}/reschedule`,'POST',{startsAt:new Date(Date.now()+120*3600000).toISOString()},outsider.token,403);
  await check('Completed cancellation rejected',`/bookings/${completed.id}`,'DELETE',{},student.token,400);
  await check('Completed reschedule rejected',`/bookings/${completed.id}/reschedule`,'POST',{startsAt:new Date(Date.now()+120*3600000).toISOString()},student.token,400);
  await check('Near-start cancellation rejected',`/bookings/${live.id}`,'DELETE',{},student.token,400);
  await check('Invalid reschedule date rejected',`/bookings/${upcoming.id}/reschedule`,'POST',{startsAt:'not-a-date'},student.token,400);
  await check('Classroom outsider rejected',`/livekit/token/${upcoming.id}`,'GET',undefined,outsider.token,403);
  await check('Missing classroom rejected','/livekit/token/missing-id','GET',undefined,student.token,400);
  await check('Early classroom entry rejected',`/livekit/token/${upcoming.id}`,'GET',undefined,student.token,400);
  await check('Completed classroom entry rejected',`/livekit/token/${completed.id}`,'GET',undefined,student.token,400);
  await check('Expired subscription classroom entry rejected',`/livekit/token/${expiredSession.id}`,'GET',undefined,expired.token,[400,403]);
  await check('Canceled classroom rejected',`/livekit/token/${canceled.id}`,'GET',undefined,student.token,400);
  await check('Student cannot reopen canceled lesson',`/livekit/reopen/${canceled.id}`,'POST',{},student.token,[400,403]);
  await check('Student cannot reopen completed lesson',`/livekit/reopen/${completed.id}`,'POST',{},student.token,[400,403]);
  await check('Active classroom entry','/livekit/token/'+live.id,'GET',undefined,student.token,200);
  await db.session.update({where:{id:completed.id},data:{status:'COMPLETED'}});
  for (const score of [0,6,-1,2.5]) await check(`Feedback rejects score ${score}`,'/feedbacks','POST',{sessionId:completed.id,score,comment:'QA'},student.token,400);
  await check('Feedback oversized comment rejected','/feedbacks','POST',{sessionId:completed.id,score:5,comment:'x'.repeat(2001)},student.token,400);
  await check('Feedback foreign lesson rejected','/feedbacks','POST',{sessionId:completed.id,score:5},outsider.token,404);
  await check('Feedback future lesson rejected','/feedbacks','POST',{sessionId:upcoming.id,score:5},student.token,400);
  await check('Feedback save','/feedbacks','POST',{sessionId:completed.id,score:4,comment:'QA lesson feedback'},student.token,201);
  await check('Feedback update remains one rating','/feedbacks','POST',{sessionId:completed.id,score:5,comment:'QA updated'},student.token,201);
  await check('Student cannot fabricate assessment','/progress/assessments','POST',{studentId:student.id,title:'QA',score:100},student.token,403);
  await check('Student cannot advance own progress','/progress/advance','POST',{studentId:student.id},student.token,403);
  for (const endpoint of ['/progress/assessments','/progress/certificates','/curriculum/paths','/materials','/messages/threads']) await check(`Student reads ${endpoint}`,endpoint,'GET',undefined,student.token,200);
  const ticket=await check('Create support ticket','/support/request','POST',{type:'GENERAL_SUPPORT',reason:'QA help'},student.token,201);
  await check('Foreign support read rejected',`/support/tickets/${ticket.id}`,'GET',undefined,outsider.token,403);
  await check('Foreign support reply rejected',`/support/tickets/${ticket.id}/messages`,'POST',{message:'QA intrusion'},outsider.token,403);
  await check('Student cannot resolve own support ticket',`/support/tickets/${ticket.id}/messages`,'POST',{message:'QA reply',newStatus:'RESOLVED'},student.token,403);
  await check('Empty support reply rejected',`/support/tickets/${ticket.id}/messages`,'POST',{message:'   '},student.token,400);
  await check('Missing support reply rejected',`/support/tickets/${ticket.id}/messages`,'POST',{},student.token,400);
  await check('Invalid support type rejected','/support/request','POST',{type:'NOT_A_REAL_TYPE',reason:'QA'},student.token,400);
  const msg = await check('Message assigned scholar','/messages','POST',{recipientId:lecturer.id,content:'QA student message'},student.token,201);
  await check('Foreign message thread read rejected',`/messages/${msg.threadId}`,'GET',undefined,outsider.token,403);
  await check('Empty message rejected','/messages','POST',{recipientId:lecturer.id,content:''},student.token,400);
  await check('Missing message rejected','/messages','POST',{recipientId:lecturer.id},student.token,400);
  await check('Invalid message recipient rejected','/messages','POST',{recipientId:'missing',content:'QA'},student.token,[400,404]);
  await check('Thread injection rejected','/messages','POST',{recipientId:lecturer.id,content:'QA injected',threadId:msg.threadId},outsider.token,403);
  await check('Thread injection does not expose messages',`/messages/${msg.threadId}`,'GET',undefined,outsider.token,403);
  await check('Password recovery unavailable without email','/auth/forgot-password','POST',{email:student.email},undefined,503);
  await check('Malformed password reset rejected','/auth/reset-password','POST',{token:'invalid',password},undefined,400);
  const reset = crypto.randomBytes(32).toString('hex');
  await db.passwordReset.create({data:{userId:fresh.id,tokenHash:crypto.createHash('sha256').update(reset).digest('hex'),expiresAt:new Date(Date.now()+60000)}});
  await check('Reset password successful','/auth/reset-password','POST',{token:reset,password:'UpdatedStudentQA!'},undefined,201);
  await check('Old token revoked after reset','/auth/me','GET',undefined,fresh.token,401);
  await check('Reset token cannot be reused','/auth/reset-password','POST',{token:reset,password},undefined,400);
  const saved = { date: '2026-10-05', checks, passed: checks.filter(c=>c.passed).length, failed: checks.filter(c=>!c.passed).length, externalMessagesSent:0, realPayments:0, classroomTransport:'Simulated, real media not tested' };
  await fs.writeFile(path.join(output,'api-results.json'),JSON.stringify(saved,null,2));
  if(saved.failed) process.exitCode=1;
  console.log(JSON.stringify({passed:saved.passed,failed:saved.failed,output:path.join(output,'api-results.json')}));
}
async function extended() {
  const fixture = JSON.parse(await fs.readFile(path.join(output, 'fixtures.json'), 'utf8'));
  db = new PrismaService();
  await db.$connect();
  const lecturer = await account('extra-scholar','LECTURER');
  const student = await account('extra-student');
  const other = await account('extra-other');
  for (const person of [student,other]) {
    await db.studentProfile.update({where:{userId:person.id},data:{assignedLecturerId:lecturer.id}});
    await subscription(person,false,'Standard');
  }
  const first = new Date(Date.now()+72*3600000);
  first.setHours(10,0,0,0);
  const second = new Date(first.getTime()+3600000);
  const third = new Date(first.getTime()+86400000);
  for (const date of [first,second,third]) await slot(lecturer,date);
  const booked = await check('Book available assigned scholar','/bookings','POST',{lecturerId:lecturer.id,startsAt:first.toISOString()},student.token,201);
  await check('Duplicate booking rejected','/bookings','POST',{lecturerId:lecturer.id,startsAt:first.toISOString()},student.token,400);
  await check('Daily allowance enforced on create','/bookings','POST',{lecturerId:lecturer.id,startsAt:second.toISOString()},student.token,400);
  const otherBooking = await check('Other student books separate slot','/bookings','POST',{lecturerId:lecturer.id,startsAt:second.toISOString()},other.token,201);
  await check('Reschedule to occupied slot rejected',`/bookings/${booked.id}/reschedule`,'POST',{startsAt:second.toISOString()},student.token,400);
  await check('Reschedule to free slot succeeds',`/bookings/${booked.id}/reschedule`,'POST',{startsAt:third.toISOString()},student.token,201);
  await check('Cancel sufficiently early succeeds',`/bookings/${booked.id}`,'DELETE',{},student.token,200,data=>data.status==='CANCELED');
  await check('Cancel repeat rejected',`/bookings/${booked.id}`,'DELETE',{},student.token,400);
  await check('Released slot can be booked again','/bookings','POST',{lecturerId:lecturer.id,startsAt:third.toISOString()},student.token,201);
  const within12 = new Date(Date.now()+2*3600000);
  await slot(lecturer,within12);
  await check('Reschedule cannot bypass 12h booking cutoff',`/bookings/${otherBooking.id}/reschedule`,'POST',{startsAt:within12.toISOString()},other.token,400);
  const allowanceStudent = await account('allowance');
  await db.studentProfile.update({where:{userId:allowanceStudent.id},data:{assignedLecturerId:lecturer.id}});
  await subscription(allowanceStudent,false,'Standard');
  const target = new Date(Date.now()+15*86400000);
  target.setHours(15,0,0,0);
  const target2 = new Date(target.getTime()+3600000);
  await db.subscription.updateMany({ where: { studentId: allowanceStudent.id }, data: { currentPeriodEnd: new Date(target2.getTime()+86400000) } });
  const source = await session(allowanceStudent,lecturer,48);
  await db.session.create({data:{studentId:allowanceStudent.id,lecturerId:lecturer.id,startsAt:target,endsAt:new Date(target.getTime()+40*60000),status:'SCHEDULED'}});
  await slot(lecturer,target2);
  await check('Reschedule enforces daily allowance',`/bookings/${source.id}/reschedule`,'POST',{startsAt:target2.toISOString()},allowanceStudent.token,400,data=>/daily|per day|same day/i.test(data.message));
  const race = await account('race');
  const trialRequests = await Promise.all(Array.from({length:4},()=>request('/subscriptions/trial','POST',{},race.token)));
  const trialCount=await db.subscription.count({where:{studentId:race.id,tier:'Trial'}});
  checks.push({name:'Concurrent trial claims create only one trial',passed:trialCount===1&&trialRequests.filter(item=>item.status===201).length===1&&trialRequests.every(item=>[201,400].includes(item.status)),actual:trialRequests.map(item=>item.status),count:trialCount});
  await db.studentProfile.update({where:{userId:race.id},data:{assignedLecturerId:lecturer.id}});
  const raceTime = new Date(Date.now()+5*86400000);
  await slot(lecturer,raceTime);
  const raceBooking = await Promise.all(Array.from({length:4},()=>request('/bookings','POST',{lecturerId:lecturer.id,startsAt:raceTime.toISOString()},race.token)));
  const bookingCount=await db.session.count({where:{studentId:race.id,startsAt:raceTime}});
  checks.push({name:'Concurrent booking creates one session',passed:bookingCount===1&&raceBooking.filter(item=>item.status===201).length===1&&raceBooking.every(item=>[201,400].includes(item.status)),actual:raceBooking.map(item=>item.status),count:bookingCount});
  const late = new Date(Date.now()+40*86400000);
  await slot(lecturer,late);
  await check('Booking after subscription expiry rejected','/bookings','POST',{lecturerId:lecturer.id,startsAt:late.toISOString()},student.token,400);
  const ended = await session(student,lecturer,-1,'COMPLETED',fixture.lessonId);
  const bytes=Buffer.from('%PDF-1.4\nQA student resource\n%%EOF');
  const upload=(title,content=bytes,type='application/pdf',filename='qa.pdf')=>{const body=new FormData();body.append('title',title);body.append('sessionId',ended.id);body.append('file',new Blob([content],{type}),filename);return body;};
  const material=await check('Scholar upload PDF','/materials/upload','POST',upload('QA lesson PDF'),lecturer.token,201);
  await check('Student downloads exact PDF bytes',`/materials/${material.id}/file`,'GET',undefined,student.token,200,data=>data===bytes.toString('base64'));
  await check('Other student cannot download PDF',`/materials/${material.id}/file`,'GET',undefined,other.token,403);
  await check('Student cannot upload materials','/materials/upload','POST',upload('Blocked'),student.token,403);
  await check('Executable material rejected','/materials/upload','POST',upload('Invalid',Buffer.from('MZ'), 'application/octet-stream','evil.exe'),lecturer.token,400);
  await check('Mismatched PDF signature rejected','/materials/upload','POST',upload('Fake PDF',Buffer.from('not a PDF')),lecturer.token,400);
  await check('Oversized material rejected','/materials/upload','POST',upload('Large',Buffer.alloc(10*1024*1024+1)),lecturer.token,413);
  await check('Missing material rejected','/materials/missing/file','GET',undefined,student.token,404);
  await check('Scholar records assessment','/progress/assessments','POST',{studentId:fixture.student.id,title:'QA Recitation Result',score:82,feedback:'QA saved assessment'},fixture.lecturer.token,201);
  await check('Student sees recorded assessment','/progress/assessments','GET',undefined,fixture.student.token,200,data=>data.some(item=>item.score===82));
  await db.certificate.create({data:{studentId:fixture.student.id,learningPathId:fixture.learningPathId,scholarId:fixture.lecturer.id,performanceSummary:'QA issued certificate'}});
  await check('Student sees certificate','/progress/certificates','GET',undefined,fixture.student.token,200,data=>data.some(item=>item.performanceSummary==='QA issued certificate'));
  const lessonSession = await db.session.findUnique({where:{id:fixture.completed.id}});
  const body=upload('QA Browser Resource');body.set('sessionId',lessonSession.id);
  await check('Scholar shares browser fixture PDF','/materials/upload','POST',body,fixture.lecturer.token,201);
  const message = await check('Scholar message creates unread student message','/messages','POST',{recipientId:fixture.student.id,content:'QA welcome from assigned scholar'},fixture.lecturer.token,201);
  await check('Unread count increases','/messages/unread-count','GET',undefined,fixture.student.token,200,data=>data.count>0);
  await check('Real in-app notification saved','/notifications','GET',undefined,fixture.student.token,200,data=>data.some(item=>item.type==='NEW_MESSAGE'));
  await check('Student marks thread read',`/messages/${message.threadId}/read`,'PATCH',undefined,fixture.student.token,204);
  await check('Unread count clears','/messages/unread-count','GET',undefined,fixture.student.token,200,data=>data.count===0);
  await check('Notification read state follows message','/notifications','GET',undefined,fixture.student.token,200,data=>data.filter(item=>item.type==='NEW_MESSAGE').every(item=>item.readAt));
  const saved={checks,passed:checks.filter(item=>item.passed).length,failed:checks.filter(item=>!item.passed).length};
  await fs.writeFile(path.join(output,'extended-api-results.json'),JSON.stringify(saved,null,2));
  if(saved.failed) process.exitCode=1;
  console.log(JSON.stringify({passed:saved.passed,failed:saved.failed,failures:checks.filter(item=>!item.passed).map(item=>item.name)}));
}
async function recheck() {
  const f=JSON.parse(await fs.readFile(path.join(output,'fixtures.json'),'utf8'));
  db=new PrismaService();await db.$connect();
  const registration={email:`${prefix}-spaces@example.test`,password,role:'STUDENT',fullName:'   ',phone:'0000',country:'Sri Lanka',timezone:'Asia/Colombo'};
  await check('Whitespace-only registration name rejected','/auth/register','POST',registration,undefined,400);
  await check('Invalid registration timezone rejected','/auth/register','POST',{...registration,email:`${prefix}-timezone@example.test`,fullName:'QA timezone',timezone:'Mars/Olympus'},undefined,400);
  await check('Profile excludes lecturer financial data','/profile/student','GET',undefined,f.student.token,200,data=>!data.assignedLecturer?.payoutDetails);
  await check('Bookings exclude internal notes and financial data','/bookings/student','GET',undefined,f.student.token,200,data=>data.every(item=>!item.notes?.internalNotes&&!item.lecturer?.payoutDetails));
  await check('Invalid reschedule date rejected',`/bookings/${f.upcoming.id}/reschedule`,'POST',{startsAt:'not-a-date'},f.student.token,400);
  await check('Early classroom entry rejected',`/livekit/token/${f.upcoming.id}`,'GET',undefined,f.student.token,400);
  await check('Completed classroom entry rejected',`/livekit/token/${f.completed.id}`,'GET',undefined,f.student.token,400);
  await check('Expired subscription classroom entry rejected',`/livekit/token/${f.expiredSession.id}`,'GET',undefined,f.expired.token,[400,403]);
  await check('Student cannot reopen canceled lesson',`/livekit/reopen/${f.canceled.id}`,'POST',{},f.student.token,[400,403]);
  await check('Student cannot reopen completed lesson',`/livekit/reopen/${f.completed.id}`,'POST',{},f.student.token,[400,403]);
  await db.session.update({where:{id:f.completed.id},data:{status:'COMPLETED'}});
  await db.session.update({where:{id:f.canceled.id},data:{status:'CANCELED'}});
  const ticket=await request('/support/request','POST',{type:'GENERAL_SUPPORT',reason:'QA recheck'},f.student.token);
  await check('Student cannot resolve own support ticket',`/support/tickets/${ticket.data.id}/messages`,'POST',{message:'QA reply',newStatus:'RESOLVED'},f.student.token,403);
  await check('Empty support reply rejected',`/support/tickets/${ticket.data.id}/messages`,'POST',{message:'   '},f.student.token,400);
  await check('Missing support reply rejected',`/support/tickets/${ticket.data.id}/messages`,'POST',{},f.student.token,400);
  await check('Invalid support type rejected','/support/request','POST',{type:'NOT_A_REAL_TYPE'},f.student.token,400);
  const original = await request('/messages','POST',{recipientId:f.lecturer.id,content:'QA private original message'},f.student.token);
  if (original.status !== 201) throw new Error('Private message fixture could not be created');
  const threadId=original.data.threadId;
  await check('Empty message rejected','/messages','POST',{recipientId:f.lecturer.id,content:''},f.student.token,400);
  await check('Missing message rejected','/messages','POST',{recipientId:f.lecturer.id},f.student.token,400);
  await check('Invalid message recipient rejected','/messages','POST',{recipientId:'missing',content:'QA'},f.student.token,[400,404]);
  await check('Thread injection rejected','/messages','POST',{recipientId:f.lecturer.id,content:'QA injected',threadId},f.outsider.token,403);
  await check('Thread injection does not expose messages',`/messages/${threadId}`,'GET',undefined,f.outsider.token,403);
  const suspended=await account('suspended');
  await db.user.update({where:{id:suspended.id},data:{status:'SUSPENDED'}});
  await check('Suspended student login rejected','/auth/login','POST',{email:suspended.email,password},undefined,401);
  await check('Suspended student token rejected','/auth/me','GET',undefined,suspended.token,401);
  const deleted=await account('deleted');
  await db.user.update({where:{id:deleted.id},data:{deletedAt:new Date()}});
  await check('Deleted student login rejected','/auth/login','POST',{email:deleted.email,password},undefined,401);
  await check('Deleted student token rejected','/auth/me','GET',undefined,deleted.token,401);
  const paid=await account('expired-paid');await subscription(paid,true,'Standard');
  await check('Expired paid subscription is gated without prior trial','/subscriptions/access','GET',undefined,paid.token,200,data=>data.requiresSubscription===true);
  const saved={checks,passed:checks.filter(item=>item.passed).length,failed:checks.filter(item=>!item.passed).length};
  await fs.writeFile(path.join(output,'api-recheck.json'),JSON.stringify(saved,null,2));
  console.log(JSON.stringify({passed:saved.passed,failed:saved.failed}));if(saved.failed)process.exitCode=1;
}
const extending=process.argv.includes('--extended')||process.argv.includes('--recheck');
(process.argv.includes('--recheck')?recheck():extending?extended():run()).catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(extending){if(db){await db.user.deleteMany({where:{OR:[{id:{in:userIds}},{email:{startsWith:prefix}}]}});await db.$disconnect();}}
  else if(!process.argv.includes('--serve')) await cleanup();
});
