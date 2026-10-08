const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).hostname !== '127.0.0.1') throw new Error('Requires isolated local database');
process.env.NODE_ENV = 'test';
process.env.RESEND_API_KEY = '';
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { NotificationService } = require('../dist/src/notification/notification.service');
const { LivekitService } = require('../dist/src/livekit/livekit.service');
const results = [];
let app;
async function run() {
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(NotificationService).useValue({ dispatchBookingNotification: async () => {}, createNotification: async () => ({}) }).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const db = app.get(PrismaService);
  app.get(LivekitService).endRoom = async () => {};
  app.enableCors({origin:'http://localhost:3105',credentials:true});
  app.use(require('cookie-parser')());
  await app.listen(process.argv.includes('--serve') ? 3015 : 0, '127.0.0.1');
  if (process.argv.includes('--serve')) { console.log('QA API ready on 3015'); for (const signal of ['SIGINT','SIGTERM']) process.on(signal,async()=>{await app.close();process.exit();}); return; }
  const base = await app.getUrl();
  async function api(name, endpoint, method, body, token, expected, predicate) {
    const response = await fetch(base + '/api/v1' + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json().catch(() => null);
    let error;
    try { assert.equal(response.status, expected); if (predicate) await predicate(data); } catch (e) { error = e.message; }
    results.push({ name, endpoint, expected, actual: response.status, passed: !error, error });
    return data;
  }
  const fixtures = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../output/changes-qa-2026-10-06/fixtures.json'), 'utf8'));
  async function login(user) { return (await api('Login ' + user.role, '/auth/login', 'POST', { email: user.email, password: fixtures.password }, null, 201)).token; }
  const admin = await login(fixtures.admin), lecturer = await login(fixtures.lecturer), student = await login(fixtures.student);
  for (const hours of [[0,23], [10], Array.from({length:24}, (_,i)=>i)]) await api('Save valid availability ' + hours.length, '/profile/student', 'PUT', { preferredHours: hours }, student, 200, d => assert.deepEqual(d.preferredHours, hours));
  for (const hours of [[], null, '10', [-1], [24], [1.5], [10,10], ['10']]) await api('Reject invalid availability ' + JSON.stringify(hours), '/profile/student', 'PUT', { preferredHours: hours }, student, 400);
  const email = 'qa-new-' + crypto.randomUUID() + '@example.test';
  const registration = { email, password: 'QA-Temporary-2026!', role: 'STUDENT', fullName: 'QA New Student', phone: '+94770000001', country: 'Sri Lanka', timezone: 'Asia/Colombo', preferredHours: [23,0] };
  const newUser = await api('Register with availability', '/auth/register', 'POST', registration, null, 201);
  const profile = await db.studentProfile.findUnique({ where: {userId: newUser.id} });
  results.push({name:'Registration hours sorted and persisted',passed:JSON.stringify(profile.preferredHours)==='[0,23]'});
  const requests = await db.supportTicket.findMany({where:{userId:newUser.id,type:'STUDENT_REGISTRATION'}});
  results.push({name:'Registration creates exactly one assignment request',passed:requests.length===1});
  await api('Reject assignment without overlapping hours', '/admin/requests/'+requests[0].id+'/assign-lecturer','POST',{lecturerId:fixtures.lecturer.id},admin,400);
  const lecturerProfile = await db.lecturerProfile.findUnique({where:{userId:fixtures.lecturer.id}});
  await db.studentProfile.update({where:{userId:newUser.id},data:{preferredHours:lecturerProfile.hourlyAvailabilityJson.slice(0,2)}});
  await api('Assign registration request with overlapping hours', '/admin/requests/'+requests[0].id+'/assign-lecturer','POST',{lecturerId:fixtures.lecturer.id},admin,201);
  await api('Cannot repeat resolved assignment','/admin/requests/'+requests[0].id+'/assign-lecturer','POST',{lecturerId:fixtures.lecturer.id},admin,400);
  await api('Cannot assign general support','/admin/requests/'+fixtures.ticket.id+'/assign-lecturer','POST',{lecturerId:fixtures.lecturer.id},admin,400);
  await api('Student cannot assign request','/admin/requests/'+requests[0].id+'/assign-lecturer','POST',{lecturerId:fixtures.lecturer.id},student,403);
  await api('Missing assignment request','/admin/requests/missing/assign-lecturer','POST',{lecturerId:fixtures.lecturer.id},admin,404);
  const before = await db.user.count();
  await api('Invalid registration availability rejected','/auth/register','POST',{...registration,email:'qa-bad-'+crypto.randomUUID()+'@example.test',preferredHours:[24]},null,400);
  results.push({name:'Invalid registration creates no account',passed:await db.user.count()===before});
  const session = await db.session.create({data:{studentId:fixtures.student.id,lecturerId:fixtures.lecturer.id,startsAt:new Date(Date.now()-60000),endsAt:new Date(Date.now()+2340000),status:'IN_PROGRESS'}});
  await api('Anonymous clock denied','/livekit/clock/'+session.id,'GET',undefined,null,401);
  await api('Student sees waiting clock','/livekit/clock/'+session.id,'GET',undefined,student,200,d=>assert.equal(d.meetingStartedAt,null));
  await api('Student cannot start lesson','/livekit/start/'+session.id,'POST',{},student,403);
  const clock=await api('Lecturer starts shared clock','/livekit/start/'+session.id,'POST',{},lecturer,201,d=>{assert.ok(d.meetingStartedAt);assert.equal(Date.parse(d.warningAt)-Date.parse(d.meetingStartedAt),2400000);assert.equal(Date.parse(d.meetingEndsAt)-Date.parse(d.meetingStartedAt),2700000);});
  await api('Repeated start keeps original clock','/livekit/start/'+session.id,'POST',{},lecturer,201,d=>assert.equal(d.meetingStartedAt,clock.meetingStartedAt));
  await api('Student shares lecturer clock','/livekit/clock/'+session.id,'GET',undefined,student,200,d=>assert.equal(d.meetingStartedAt,clock.meetingStartedAt));
  const otherToken=await login(fixtures.otherLecturer);
  await api('Other lecturer cannot inspect clock','/livekit/clock/'+session.id,'GET',undefined,otherToken,403);
  await db.session.update({where:{id:session.id},data:{meetingStartedAt:new Date(Date.now()-2700001)}});
  await api('Expired meeting completes','/livekit/clock/'+session.id,'GET',undefined,lecturer,200,d=>{assert.equal(d.expired,true);assert.equal(d.status,'COMPLETED');});
  await api('Completed meeting cannot restart','/livekit/start/'+session.id,'POST',{},lecturer,400);
  await api('Plans expose regional price contract','/subscriptions/plans','GET',undefined,null,200,d=>{assert.equal(d.length,6);for(const p of d){assert.equal(p.prices.LKR,p.monthlyLkr);assert.equal(p.prices.USD,p.monthlyUsd);assert.ok('GBP' in p.prices);}});
  await api('Finance exposes exchange snapshot','/admin/finance','GET',undefined,admin,200,d=>{assert.equal(d.exchangeRates.length,5);assert.equal(d.pricing.length,6);});
  if (!await db.learningPath.count()) await db.learningPath.create({data:{title:'QA course',description:'QA',level:'Beginner',difficulty:'Easy',targetAudience:'QA',objectives:'QA',modules:{create:{title:'QA module',orderIndex:1,lessons:{create:{title:'QA lesson',orderIndex:1,objectives:'QA'}}}}}});
  await fs.writeFile(path.resolve(__dirname,'../../output/changes-qa-2026-10-06/new-feature-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed)},null,2));
  if(results.some(r=>!r.passed))process.exitCode=1;
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app&&!process.argv.includes('--serve'))await app.close();});
