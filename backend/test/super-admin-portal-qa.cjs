const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
process.env.DATABASE_URL = process.env.QA_DATABASE_URL || 'postgresql://qa_super@127.0.0.1:55441/postgres';
if (!['127.0.0.1', 'localhost'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Super admin QA requires a disposable local database');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
process.env.NODE_ENV = 'test';
process.env.RESEND_API_KEY = '';
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/src/app.module.js');
const { PrismaService } = require('../dist/src/prisma/prisma.service.js');
const { EmailNotificationService } = require('../dist/src/notification/email-notification.service.js');
const { WhatsAppNotificationService } = require('../dist/src/notification/whatsapp-notification.service.js');
const { JwtService } = require('@nestjs/jwt');
const bcrypt = require('bcrypt');
const output = path.resolve(root, '../output/super-admin-qa');
const password = 'AdminQA-2026-Temporary!';
const port = Number(process.env.QA_API_PORT || 3002);
let app, db;
const checks = [];
async function request(endpoint, method = 'GET', body, token) {
  const response = await fetch(`http://localhost:${port}/api/v1${endpoint}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json().catch(() => null), headers: Object.fromEntries(response.headers) };
}
async function check(name, endpoint, method, body, token, expected, predicate) {
  const start = Date.now();
  const result = await request(endpoint, method, body, token);
  let predicatePassed = true;
  let assertionError;
  try { predicatePassed = !predicate || await predicate(result.data); } catch (error) { predicatePassed = false; assertionError = error.message; }
  const passed = [].concat(expected).includes(result.status) && predicatePassed;
  const response = JSON.parse(JSON.stringify(result.data, (key, value) => /^(token|passwordHash|twoFactorSecret|resetTokenHash)$/.test(key) ? '[redacted]' : value));
  checks.push({ name, at: new Date().toISOString(), endpoint, method: method || 'GET', input: body && { ...body, ...(body.password ? { password: '[redacted]' } : {}) }, expected, actual: result.status, passed, assertionError, durationMs: Date.now() - start, response, headers: result.headers });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: ${result.status}`);
  await fs.writeFile(path.join(output, 'baseline-results.json'), JSON.stringify(checks, null, 2));
  return result.data;
}
async function account(name, role) {
  const data = { email: `${name}@example.test`, passwordHash: await bcrypt.hash(password, 10), role, status: 'ACTIVE' };
  if (role === 'LECTURER') data.lecturerProfile = { create: { fullName: `QA ${name}`, bio: 'QA', qualifications: 'QA', languages: ['English'], specializations: ['Quran'], hourlyAvailabilityJson: [10,11,12,13], payoutMethod: 'bank_transfer', payoutDetails: 'QA private bank details', status: 'ACTIVE' } };
  if (role === 'STUDENT') data.studentProfile = { create: { fullName: `QA ${name}`, phone: '000000', country: 'Sri Lanka', timezone: 'Asia/Colombo', preferredLanguage: 'English', learningGoals: 'QA' } };
  const user = await db.user.create({ data });
  const login = await request('/auth/login', 'POST', { email: user.email, password });
  if (login.status !== 201) throw new Error('Fixture login failed');
  return { id: user.id, email: user.email, role, token: login.data.token };
}
async function session(student, lecturer, hours, status = 'SCHEDULED') {
  const startsAt = new Date(Date.now() + hours * 3600000);
  return db.session.create({ data: { studentId: student.id, lecturerId: lecturer.id, startsAt, endsAt: new Date(+startsAt + 2400000), status } });
}
async function run() {
  await fs.mkdir(output, { recursive: true });
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  module.get(EmailNotificationService).sendEmail = async () => ({ success: true });
  module.get(WhatsAppNotificationService).sendWhatsApp = async () => ({ success: true });
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.use(require('cookie-parser')());
  app.enableCors({ origin: ['http://localhost:3000'], credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, transformOptions: { enableImplicitConversion: true } }));
  db = app.get(PrismaService);
  await app.listen(port);
  const admin = await account('qa-super-primary', 'SUPER_ADMIN');
  const owner = await account('qa-staff', 'ADMIN');
  const student = await account('qa-student', 'STUDENT');
  const lecturer = await account('qa-lecturer', 'LECTURER');
  const otherLecturer = await account('qa-other-lecturer', 'LECTURER');
  const otherAdmin = await account('qa-other-admin', 'ADMIN');
  const future = await session(student, lecturer, 72);
  const past = await session(student, lecturer, -2);
  const completed = await session(student, lecturer, -48, 'COMPLETED');
  const canceled = await session(student, lecturer, -24, 'CANCELED');
  const noShow = await session(student, lecturer, -24, 'NO_SHOW_LECTURER');
  await db.rating.create({ data: { sessionId: completed.id, studentId: student.id, lecturerId: lecturer.id, score: 4, comment: 'QA feedback <script>alert(1)</script> العربية' } });
  const block = await db.sessionBlock.create({ data: { studentId: student.id, lecturerId: lecturer.id, status: 'COMPLETED' } });
  const payout = await db.payout.create({ data: { lecturerId: lecturer.id, amountLkr: 2500, sessionBlocksIncluded: [block.id], method: 'bank_transfer' } });
  const failedPayout = await db.payout.create({ data: { lecturerId: lecturer.id, amountLkr: 2500, sessionBlocksIncluded: [], method: 'bank_transfer' } });
  for (const [index, course] of ['Noorani Qaida','Quran Recitation','Quran Memorization'].entries()) for (const tier of ['Standard','Fast Track']) await db.subscriptionPlan.upsert({ where: { id: `qa-plan-${index}-${tier.replace(' ','-')}` }, update: {}, create: { id: `qa-plan-${index}-${tier.replace(' ','-')}`, courseId: `qa-course-${index}`, course, tier, monthlyUsd: tier === 'Standard' ? 30 : 45, sessions: tier === 'Standard' ? 8 : 12 } });
  for (const [code, rate] of [['LKR',1],['USD',300],['GBP',400],['EUR',350],['AUD',200]]) await db.pricingCurrency.upsert({ where: { code }, update: {}, create: { code, region: code, lkrPerUnit: rate, rateDate: '2026-10-05' } });
  const ticket = await db.supportTicket.create({ data: { userId: student.id, type: 'GENERAL_SUPPORT', reason: 'QA admin request <script>alert(1)</script> العربية' } });
  await db.supportTicket.create({ data: { userId: lecturer.id, type: 'GENERAL_SUPPORT', reason: 'QA lecturer request' } });
  await fs.writeFile(path.join(output, 'fixtures.json'), JSON.stringify({ password, admin, owner, student, lecturer, otherLecturer, otherAdmin, future, past, completed, canceled, noShow, payout, ticket }, null, 2), { mode: 0o600 });
  if (process.argv.includes('--serve')) {
    console.log(`QA fixtures ready; local API on ${port}`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(); });
    return;
  }
  await cases({ admin, owner, student, lecturer, otherLecturer, otherAdmin, future, past, completed, canceled, noShow, payout, failedPayout, block, ticket });
}
async function baselineCases(f) {
  const { admin:a, owner:o, student:s, lecturer:l, otherLecturer:l2, otherAdmin:a2, future, past, completed, canceled, noShow, payout, failedPayout, block, ticket } = f;
  const endpoints = ['/admin/stats','/admin/users','/admin/sessions','/admin/finance','/admin/feedback','/admin/audit-logs','/admin/waitlist','/support/tickets'];
  for (const endpoint of endpoints) {
    await check(`anonymous denied ${endpoint}`,endpoint,'GET',undefined,undefined,401);
    for (const user of [s,l]) await check(`${user.role} denied ${endpoint}`,endpoint,'GET',undefined,user.token,403);
    for (const user of [a,o]) await check(`${user.role} read ${endpoint}`,endpoint,'GET',undefined,user.token,200,d=>endpoint.endsWith('stats') ? typeof d.totalStudents==='number' : endpoint.endsWith('finance') ? Array.isArray(d.payments)&&Array.isArray(d.payouts)&&Array.isArray(d.revenueByPlan) : Array.isArray(d));
  }
  const expired = app.get(JwtService).sign({ sub:a.id, role:a.role, version:0 },{expiresIn:-1});
  await check('expired admin token denied','/admin/stats','GET',undefined,expired,401);
  await check('malformed admin token denied','/admin/stats','GET',undefined,'invalid',401);
  await check('wrong admin password denied','/auth/login','POST',{email:a.email,password:'wrong'},undefined,401);
  for (const query of ['role=STUDENT','status=ACTIVE','role=student&status=active','role=all&status=all']) await check(`valid users filter ${query}`,`/admin/users?${query}`,'GET',undefined,a.token,200);
  for (const query of ['role=INVALID','status=INVALID','role=','role=ADMIN%27%20OR%201%3D1']) await check(`invalid users filter ${query}`,`/admin/users?${query}`,'GET',undefined,a.token,query==='role='?200:400);
  const create = { fullName:'QA created lecturer',email:'qa-created@example.test',password,hourlyAvailabilityJson:[10,11,12,13],specializations:['Quran'],languages:['English'] };
  await check('create lecturer valid','/admin/lecturers','POST',create,a.token,201,d=>d.role==='LECTURER'&&!d.passwordHash);
  await check('duplicate lecturer email','/admin/lecturers','POST',create,a.token,409);
  await check('duplicate lecturer email case insensitive','/admin/lecturers','POST',{...create,email:create.email.toUpperCase()},a.token,409);
  const invalids = [{fullName:''},{fullName:'   '},{email:'invalid'},{password:'short'},{password:'x'.repeat(129)},{fullName:null},{role:'SUPER_ADMIN'},{hourlyRate:-1},{languages:[1]},{specializations:123},{hourlyAvailabilityJson:[-1,24,99,'x']}];
  for (const [index, change] of invalids.entries()) await check(`invalid lecturer input ${index}`,'/admin/lecturers','POST',{...create,email:`qa-invalid-${index}@example.test`,...change},a.token,400);
  await check('lecturer unicode accepted','/admin/lecturers','POST',{...create,email:'qa-unicode@example.test',fullName:'أحمد 李 😀'},a.token,201,d=>d.lecturerProfile.fullName==='أحمد 李 😀');
  await check('student cannot create lecturer','/admin/lecturers','POST',create,s.token,403);
  await check('valid assignment',`/admin/students/${s.id}/assign-lecturer`,'POST',{lecturerId:l.id},a.token,201,d=>d.assignedLecturerId===l.id);
  await check('valid reassignment',`/admin/students/${s.id}/assign-lecturer`,'PATCH',{lecturerId:l2.id},a.token,200,d=>d.assignedLecturerId===l2.id);
  await check('assignment invalid student',`/admin/students/missing/assign-lecturer`,'POST',{lecturerId:l.id},a.token,404);
  await check('assignment invalid lecturer',`/admin/students/${s.id}/assign-lecturer`,'POST',{lecturerId:'missing'},a.token,404);
  await check('assignment empty lecturer',`/admin/students/${s.id}/assign-lecturer`,'POST',{lecturerId:''},a.token,400);
  await check('assignment admin as student rejected',`/admin/students/${a2.id}/assign-lecturer`,'POST',{lecturerId:l.id},a.token,400);
  await check('suspend lecturer',`/admin/users/${l2.id}/status`,'PATCH',{status:'SUSPENDED'},a.token,200,d=>!d.passwordHash);
  await check('suspended lecturer stale token denied','/admin/stats','GET',undefined,l2.token,401);
  await check('assignment suspended lecturer rejected',`/admin/students/${s.id}/assign-lecturer`,'POST',{lecturerId:l2.id},a.token,400);
  await check('lecturer profile status sync',`/admin/users?role=LECTURER`,'GET',undefined,a.token,200,d=>d.find(u=>u.id===l2.id)?.lecturerProfile.status==='SUSPENDED');
  await check('status invalid enum',`/admin/users/${l2.id}/status`,'PATCH',{status:'INVALID'},a.token,400);
  await check('status missing',`/admin/users/${l2.id}/status`,'PATCH',{},a.token,400);
  await check('status user not found','/admin/users/missing/status','PATCH',{status:'ACTIVE'},a.token,404);
  await check('reactivate lecturer',`/admin/users/${l2.id}/status`,'PATCH',{status:'ACTIVE'},a.token,200,d=>!d.passwordHash);
  await check('valid working hours',`/admin/lecturers/${l.id}`,'PATCH',{hourlyAvailabilityJson:[6,7,8,9]},a.token,200);
  for (const value of [null,'text',[-1,24,99],[10,10,10,10],[]]) await check(`invalid working hours ${JSON.stringify(value)}`,`/admin/lecturers/${l.id}`,'PATCH',{hourlyAvailabilityJson:value},a.token,400);
  await check('missing lecturer update','/admin/lecturers/missing','PATCH',{hourlyAvailabilityJson:[10,11,12,13]},a.token,404);
  await check('support ticket read',`/support/tickets/${ticket.id}`,'GET',undefined,a.token,200);
  await check('support unauthorized lecturer read',`/support/tickets/${ticket.id}`,'GET',undefined,l.token,403);
  await check('support missing ticket','/support/tickets/missing','GET',undefined,a.token,404);
  await check('support admin reply',`/support/tickets/${ticket.id}/messages`,'POST',{message:'QA official reply'},a.token,201,d=>d.status==='IN_REVIEW');
  await check('support whitespace reply rejected',`/support/tickets/${ticket.id}/messages`,'POST',{message:'   '},a.token,400);
  await check('support missing reply rejected',`/support/tickets/${ticket.id}/messages`,'POST',{},a.token,400);
  await check('support resolve',`/support/tickets/${ticket.id}/status`,'PATCH',{status:'RESOLVED'},a.token,200,d=>!!d.resolvedAt);
  await check('support reopen',`/support/tickets/${ticket.id}/status`,'PATCH',{status:'IN_REVIEW'},a.token,200,d=>d.resolvedAt===null);
  await check('support invalid status rejected',`/support/tickets/${ticket.id}/status`,'PATCH',{status:'INVALID'},a.token,400);
  await check('support student cannot choose admin status',`/support/tickets/${ticket.id}/messages`,'POST',{message:'QA student reply',newStatus:'RESOLVED'},s.token,403);
  await check('support invalid role filter','/support/tickets?role=INVALID','GET',undefined,a.token,400);
  await check('future completion rejected',`/bookings/${future.id}`,'PATCH',{status:'COMPLETED'},a.token,400);
  await check('future absent rejected',`/bookings/${future.id}/absent`,'POST',{reason:'QA'},a.token,400);
  await check('completed absent rejected',`/bookings/${completed.id}/absent`,'POST',{},a.token,400);
  await check('canceled absent rejected',`/bookings/${canceled.id}/absent`,'POST',{},a.token,400);
  await check('lecturer absent retained',`/bookings/${noShow.id}/absent`,'POST',{reason:'Administrator (lecturer)'},a.token,400);
  await check('session notes update',`/bookings/${past.id}`,'PATCH',{notes:'QA notes العربية'},a.token,200,async()=> (await db.sessionNotes.findUnique({where:{sessionId:past.id}})).sharedNotes==='QA notes العربية');
  await check('notes max exceeded',`/bookings/${past.id}`,'PATCH',{notes:'a'.repeat(10001)},a.token,400);
  await check('past session complete',`/bookings/${past.id}`,'PATCH',{status:'COMPLETED'},a.token,200,d=>d.status==='COMPLETED');
  await check('completion repeated rejected',`/bookings/${past.id}`,'PATCH',{status:'COMPLETED'},a.token,400);
  const cancelTarget = await session(s,l,96);
  await check('cancel upcoming session',`/bookings/${cancelTarget.id}`,'DELETE',{reason:'QA cancellation'},a.token,200,d=>d.status==='CANCELED');
  await check('cancel repeated rejected',`/bookings/${cancelTarget.id}`,'DELETE',{},a.token,400);
  await check('payout invalid status',`/admin/payouts/${payout.id}/status`,'PATCH',{status:'INVALID'},a.token,400);
  await check('payout missing','/admin/payouts/missing/status','PATCH',{status:'SUCCESSFUL'},a.token,404);
  await check('payout student denied',`/admin/payouts/${payout.id}/status`,'PATCH',{status:'SUCCESSFUL'},s.token,403);
  await check('payout successful',`/admin/payouts/${payout.id}/status`,'PATCH',{status:'SUCCESSFUL'},a.token,200,async d=>d.completedAt&&(await db.sessionBlock.findUnique({where:{id:block.id}})).status==='PAID_OUT');
  await check('payout double process denied',`/admin/payouts/${payout.id}/status`,'PATCH',{status:'SUCCESSFUL'},a.token,400);
  await check('payout failed',`/admin/payouts/${failedPayout.id}/status`,'PATCH',{status:'FAILED'},a.token,200,d=>d.completedAt===null);
  const concurrent = await db.payout.create({data:{lecturerId:l.id,amountLkr:100,sessionBlocksIncluded:[],method:'bank_transfer'}});
  const race = await Promise.all([request(`/admin/payouts/${concurrent.id}/status`,'PATCH',{status:'SUCCESSFUL'},a.token),request(`/admin/payouts/${concurrent.id}/status`,'PATCH',{status:'SUCCESSFUL'},a.token)]);
  checks.push({name:'concurrent payout processing exactly once',at:new Date().toISOString(),passed:race.filter(r=>r.status===200).length===1&&race.filter(r=>r.status===400).length===1,response:race.map(r=>({status:r.status}))});
  const plans = (await request('/subscriptions/plans')).data.map(({id,monthlyUsd})=>({id,monthlyUsd}));
  const rates = (await request('/subscriptions/currencies')).data.map(({code,lkrPerUnit,rateDate})=>({code,lkrPerUnit,rateDate}));
  for (const endpoint of ['/subscriptions/plans','/subscriptions/currencies']) for (const user of [s,l]) await check(`${user.role} config write denied ${endpoint}`,endpoint,'PATCH',endpoint.endsWith('plans')?{prices:plans}:{rates},user.token,403);
  await check('save valid prices','/subscriptions/plans','PATCH',{prices:plans},a.token,200,d=>d.length===6);
  for (const price of [0,-1,0.001,10000.01,'30',null]) await check(`invalid price ${price}`,'/subscriptions/plans','PATCH',{prices:plans.map((p,i)=>i===0?{...p,monthlyUsd:price}:p)},a.token,400);
  await check('duplicate plans','/subscriptions/plans','PATCH',{prices:Array(6).fill(plans[0])},a.token,400);
  await check('missing plans','/subscriptions/plans','PATCH',{prices:plans.slice(1)},a.token,400);
  await check('valid currencies','/subscriptions/currencies','PATCH',{rates},a.token,200,d=>d.length===5);
  for (const change of [{lkrPerUnit:0},{lkrPerUnit:-1},{lkrPerUnit:1000001},{rateDate:'2026-02-30'},{rateDate:'invalid'}]) await check(`invalid currency ${JSON.stringify(change)}`,'/subscriptions/currencies','PATCH',{rates:rates.map(p=>p.code==='USD'?{...p,...change}:p)},a.token,400);
  await check('LKR fixed at one','/subscriptions/currencies','PATCH',{rates:rates.map(p=>p.code==='LKR'?{...p,lkrPerUnit:2}:p)},a.token,400);
  await check('audit creation and assignment recorded','/admin/audit-logs','GET',undefined,a.token,200,d=>['ADMIN_CREATED_LECTURER','ADMIN_ASSIGNED_LECTURER','PRICING_UPDATED','CURRENCY_RATES_UPDATED'].every(action=>d.some(r=>r.action===action)));
  await check('audit suspension and payout recorded','/admin/audit-logs','GET',undefined,a.token,200,d=>d.some(r=>/SUSPEND|STATUS/.test(r.action))&&d.some(r=>/PAYOUT/.test(r.action)));
  await check('pending admin not authorized',`/admin/users/${a2.id}/status`,'PATCH',{status:'PENDING'},a.token,200);
  await check('pending admin token denied','/admin/stats','GET',undefined,a2.token,401);
  await fs.writeFile(path.join(output,'baseline-results.json'),JSON.stringify(checks,null,2));
  console.log(JSON.stringify({total:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length}));
}
async function cases(f) {
  await baselineCases(f);
  await db.user.update({where:{id:f.otherAdmin.id},data:{status:'ACTIVE'}});
  await extendedCases(f);
  await fs.writeFile(path.join(output,'api-results.json'),JSON.stringify(checks,null,2));
  console.log('FINAL API SUMMARY '+JSON.stringify({total:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length}));
}
async function extendedCases(f) {
 const {admin:a,owner:staff,student:s,lecturer:l,otherAdmin:a2,ticket}=f;
 const writes=[['/admin/lecturers','POST',{}],[`/admin/students/${s.id}/assign-lecturer`,'PATCH',{lecturerId:l.id}],[`/admin/lecturers/${l.id}`,'PATCH',{hourlyAvailabilityJson:[10,11,12,13]}],[`/admin/users/${a2.id}/status`,'PATCH',{status:'ACTIVE'}],[`/admin/payouts/${f.payout.id}/status`,'PATCH',{status:'FAILED'}],['/subscriptions/plans','PATCH',{prices:[]}],['/subscriptions/currencies','PATCH',{rates:[]}],[`/support/tickets/${ticket.id}/status`,'PATCH',{status:'PENDING'}]];
 for(const [endpoint,method,body] of writes) for(const person of [null,s,l]) await check(`${person?.role||'anonymous'} write boundary ${endpoint}`,endpoint,method,body,person?.token,person?403:401);
 await check('super admin auth identity','/auth/me','GET',undefined,a.token,200,d=>d.role==='SUPER_ADMIN'&&!d.passwordHash);
 const forged=app.get(JwtService).sign({sub:s.id,role:'SUPER_ADMIN',version:0});
 await check('JWT claim cannot promote student','/admin/stats','GET',undefined,forged,403);
 await check('super admin registration rejected','/auth/register','POST',{email:'qa-escalation@example.test',password,role:'SUPER_ADMIN',fullName:'QA Escalation'},undefined,400);
 for(const status of [null,23,'','deleted',' ACTIVE ','INVALID']) await check('status boundary '+JSON.stringify(status),`/admin/users/${a2.id}/status`,'PATCH',{status},a.token,400);
 await db.user.update({where:{id:a2.id},data:{status:'ACTIVE'}});
 for(const value of [[0,1,2,3],[20,21,22,23]]) await check('availability boundary accepted '+value,`/admin/lecturers/${l.id}`,'PATCH',{hourlyAvailabilityJson:value},a.token,200);
 for(const value of [[0.5,1,2,3],['0','1','2','3'],{},[0,1,2]]) await check('availability malformed '+JSON.stringify(value),`/admin/lecturers/${l.id}`,'PATCH',{hourlyAvailabilityJson:value},a.token,400);
 await check('lecturer mass assignment rejected',`/admin/lecturers/${l.id}`,'PATCH',{status:'SUSPENDED',payoutDetails:'tampered'},a.token,400);
 await check('support status missing rejected',`/support/tickets/${ticket.id}/status`,'PATCH',{},a.token,400);
 await check('support message numeric rejected',`/support/tickets/${ticket.id}/messages`,'POST',{message:123},a.token,400);
 await check('support overlong reply rejected',`/support/tickets/${ticket.id}/messages`,'POST',{message:'x'.repeat(10001)},a.token,400);
 await check('support student status update denied',`/support/tickets/${ticket.id}/status`,'PATCH',{status:'RESOLVED'},s.token,403);
 await check('support cross-account read denied',`/support/tickets/${ticket.id}`,'GET',undefined,l.token,403);
 const plans=(await request('/subscriptions/plans')).data.map(({id,monthlyUsd})=>({id,monthlyUsd}));
 for(const price of [0.01,10000]) await check('price inclusive boundary '+price,'/subscriptions/plans','PATCH',{prices:plans.map(p=>({...p,monthlyUsd:price}))},a.token,200);
 await check('plans unknown ID atomic rejection','/subscriptions/plans','PATCH',{prices:plans.map((p,i)=>i?{...p,monthlyUsd:42}:{...p,id:'missing'})},a.token,400);
 await check('plans invalid request no partial write','/subscriptions/plans','GET',undefined,a.token,200,d=>d.every(p=>p.monthlyUsd===10000));
 await check('restore prices','/subscriptions/plans','PATCH',{prices:plans},a.token,200);
 await check('currencies missing payload rejected','/subscriptions/currencies','PATCH',{},a.token,400);
 const rates=(await request('/subscriptions/currencies')).data.map(({code,lkrPerUnit,rateDate})=>({code,lkrPerUnit,rateDate}));
 await check('currencies duplicate rejected','/subscriptions/currencies','PATCH',{rates:Array(5).fill(rates[0])},a.token,400);
 await check('currencies unknown code rejected','/subscriptions/currencies','PATCH',{rates:rates.map((r,i)=>i?r:{...r,code:'XXX'})},a.token,400);
 await check('currencies leap date accepted','/subscriptions/currencies','PATCH',{rates:rates.map(r=>({...r,rateDate:'2028-02-29'}))},a.token,200);
 await check('currencies non-leap date rejected','/subscriptions/currencies','PATCH',{rates:rates.map(r=>({...r,rateDate:'2027-02-29'}))},a.token,400);
 await check('restore currencies','/subscriptions/currencies','PATCH',{rates},a.token,200);
 const statBefore=(await request('/admin/stats','GET',undefined,a.token)).data;
 const far=await session(s,l,24*70);
 await check('weekly stats exclude session 70 days away','/admin/stats','GET',undefined,a.token,200,d=>d.sessionsThisWeek===statBefore.sessionsThisWeek);
 await db.session.delete({where:{id:far.id}});
 const mutableOwner=await account('qa-disposable-owner','SUPER_ADMIN');
 await check('super admin suspend another owner',`/admin/users/${mutableOwner.id}/status`,'PATCH',{status:'SUSPENDED'},a.token,200,d=>!d.passwordHash);
 await check('suspended owner token revoked','/admin/stats','GET',undefined,mutableOwner.token,401);
 await check('reactivate owner',`/admin/users/${mutableOwner.id}/status`,'PATCH',{status:'ACTIVE'},a.token,200,d=>!d.passwordHash);
 await check('reactivation does not revive old owner token','/admin/stats','GET',undefined,mutableOwner.token,401);
 await db.user.update({where:{id:mutableOwner.id},data:{deletedAt:new Date()}});
 await check('soft deleted owner token denied','/admin/stats','GET',undefined,mutableOwner.token,401);
 const logoutOwner=await account('qa-logout-owner','SUPER_ADMIN');
 await check('logout endpoint succeeds','/auth/logout','POST',{},logoutOwner.token,201,d=>d.success===true);
 await check('logout revokes bearer token','/admin/stats','GET',undefined,logoutOwner.token,401);
 await check('audit actor for owner create and assignment','/admin/audit-logs','GET',undefined,a.token,200,d=>['ADMIN_CREATED_LECTURER','ADMIN_ASSIGNED_LECTURER'].every(action=>d.some(r=>r.action===action&&r.actorId===a.id)));
 await check('audit covers owner status payout and hours','/admin/audit-logs','GET',undefined,a.token,200,d=>[/PAYOUT/,/SUSPEND|STATUS/,/HOURS|AVAILABILITY/].every(re=>d.some(r=>re.test(r.action)&&r.actorId===a.id)));
 const now=new Date(); const bulk=Array.from({length:205},(_,i)=>({studentId:s.id,lecturerId:l.id,startsAt:new Date(+now+i*60000),endsAt:new Date(+now+i*60000+2400000),status:'SCHEDULED'}));
 await db.session.createMany({data:bulk});
 const total=await db.session.count();
 await check('sessions all records reachable beyond 200','/admin/sessions','GET',undefined,a.token,200,d=>d.length===total||(!Array.isArray(d)&&d.total===total));
 await db.session.deleteMany({where:{startsAt:{gte:now,lt:new Date(+now+205*60000)}}});
 const sub=await db.subscription.create({data:{studentId:s.id,tier:'STANDARD',currentPeriodStart:new Date(),currentPeriodEnd:new Date(Date.now()+30*86400000),lkrAmount:9000,fxRateApplied:300}});
 await db.payment.createMany({data:Array.from({length:55},(_,i)=>({subscriptionId:sub.id,amountLkr:100,fxRate:300,gateway:'qa',gatewayChargeId:'qa-volume-'+i,status:'SUCCESSFUL',processedAt:new Date()}))});
 await db.payment.create({data:{subscriptionId:sub.id,amountLkr:999999,fxRate:300,gateway:'qa',gatewayChargeId:'qa-failed',status:'FAILED',processedAt:new Date()}});
 await check('financial aggregates include all 55 successful payments','/admin/finance','GET',undefined,a.token,200,d=>d.revenueByPlan.find(p=>p.tier==='STANDARD')?.revenue===5500&&d.revenueByPlan.find(p=>p.tier==='STANDARD')?.students===1);
 await check('monthly revenue excludes failed payment','/admin/stats','GET',undefined,a.token,200,d=>d.revenueThisMonth===5500&&d.mrrLKR===9000);
 await check('finance all payment records reachable beyond 50','/admin/finance','GET',undefined,a.token,200,d=>d.payments.length===55||d.paymentsTotal===55);
 await db.payout.createMany({data:Array.from({length:55},()=>({lecturerId:l.id,amountLkr:100,sessionBlocksIncluded:[],method:'bank_transfer'}))});
 const payoutCount=await db.payout.count();
 await check('finance all payout records reachable beyond 50','/admin/finance','GET',undefined,a.token,200,d=>d.payouts.length===payoutCount||d.payoutsTotal===payoutCount);
 await db.auditLog.createMany({data:Array.from({length:105},()=>({actorId:a.id,action:'QA_VOLUME_PROBE',entity:'QA',entityId:a.id,details:{qa:true}}))});
 const auditCount=await db.auditLog.count();
 await check('audit all records reachable beyond 100','/admin/audit-logs','GET',undefined,a.token,200,d=>d.length===auditCount||d.total===auditCount);
 const moreSessions=Array.from({length:205},(_,i)=>({studentId:s.id,lecturerId:l.id,startsAt:new Date(Date.now()-(i+1)*86400000),endsAt:new Date(Date.now()-(i+1)*86400000+2400000),status:'COMPLETED'}));
 await db.session.createMany({data:moreSessions});
 const unrated=await db.session.findMany({where:{rating:{is:null},status:'COMPLETED'},take:205});
 await db.rating.createMany({data:unrated.map(x=>({sessionId:x.id,studentId:s.id,lecturerId:l.id,score:5,comment:'QA volume feedback'}))});
 const ratingCount=await db.rating.count();
 await check('feedback all records reachable beyond 200','/admin/feedback','GET',undefined,a.token,200,d=>d.length===ratingCount||d.total===ratingCount);
 for(const endpoint of ['/admin/users','/admin/sessions','/admin/finance','/admin/feedback','/admin/audit-logs','/admin/waitlist']) {
   const response=await request(endpoint,'GET',undefined,a.token);
   checks.push({name:'private response has JSON and no-store '+endpoint,at:new Date().toISOString(),passed:response.headers['content-type']?.includes('application/json')&&/no-store/.test(response.headers['cache-control']||''),headers:response.headers});
 }
 const burst=await Promise.all(Array.from({length:12},()=>request('/admin/stats','GET',undefined,a.token)));
 checks.push({name:'12 concurrent dashboard reads return 200',at:new Date().toISOString(),passed:burst.every(r=>r.status===200),statuses:burst.map(r=>r.status)});
}
run().then(async()=>{ if(!process.argv.includes('--serve')) {await app.close();process.exit(checks.some(c=>!c.passed)?1:0);} }).catch(async e=>{console.error(e);if(app)await app.close();process.exit(1);});
