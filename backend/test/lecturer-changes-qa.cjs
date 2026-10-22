const fs = require('node:fs/promises');
const path = require('node:path');
process.env.DATABASE_URL = 'postgresql://lecturer_qa@127.0.0.1:55439/lecturer_qa';
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const db = new PrismaService();
const results = [], sessions = [], tickets = [];
const out = path.resolve(__dirname, '../../output/playwright/lecturer-qa-oct6');
let f;
async function check(name, endpoint, method, body, person, expected, predicate = () => true) {
 const r = await fetch('http://localhost:3012/api/v1' + endpoint, {method, headers:{'Content-Type':'application/json',Authorization:'Bearer '+person.token}, body:body===undefined?undefined:JSON.stringify(body)});
 const data = await r.json(); const passed = r.status === expected && await predicate(data);
 results.push({name,at:new Date().toISOString(),expected,actual:r.status,passed,data}); console.log(`${passed?'PASS':'FAIL'} ${name} (${r.status})`); return data;
}
async function session(time, status='SCHEDULED') {
 const startsAt=new Date(time);const row=await db.session.create({data:{studentId:f.student.id,lecturerId:f.lecturer.id,startsAt,endsAt:new Date(+startsAt+40*60000),status}});sessions.push(row.id);return row;
}
(async()=>{f=JSON.parse(await fs.readFile(path.resolve(__dirname,'../../output/playwright/lecturer-qa/fixtures.json')));await db.$connect();
 const original = await db.studentProfile.findUnique({where:{userId:f.fresh.id}});
 try {
 for(const value of [[],[10,10],['10'],[24],[10.5],null])await check('Preferred hours reject '+JSON.stringify(value),'/profile/student','PUT',{preferredHours:value},f.fresh,400);
 await check('Preferred hours save and normalize','/profile/student','PUT',{preferredHours:[13,10,11,12]},f.fresh,200,d=>JSON.stringify(d.preferredHours)==='[10,11,12,13]');
 await check('Preferred hours persist','/profile/student','GET',undefined,f.fresh,200,d=>JSON.stringify(d.preferredHours)==='[10,11,12,13]');
 const ticket=await db.supportTicket.create({data:{userId:f.fresh.id,type:'LECTURER_CHANGE',reason:'QA assignment'}});tickets.push(ticket.id);
 await check('Lecturer cannot assign request',`/admin/requests/${ticket.id}/assign-lecturer`,'POST',{lecturerId:f.other.id},f.lecturer,403);
 await db.lecturerProfile.update({where:{userId:f.other.id},data:{hourlyAvailabilityJson:[18,19]}});
 await check('Assignment rejects mismatched shift',`/admin/requests/${ticket.id}/assign-lecturer`,'POST',{lecturerId:f.other.id},f.admin,400);
 await check('Assignment accepts matching shift',`/admin/requests/${ticket.id}/assign-lecturer`,'POST',{lecturerId:f.lecturer.id},f.admin,201,d=>d.assignedLecturerId===f.lecturer.id);
 await check('Resolved assignment cannot repeat',`/admin/requests/${ticket.id}/assign-lecturer`,'POST',{lecturerId:f.lecturer.id},f.admin,400);
 await check('Removed direct assignment endpoint','/admin/assign-lecturer','POST',{studentId:f.fresh.id,lecturerId:f.lecturer.id},f.admin,404);
 const active=await session('2050-01-02T10:00:00+05:30');
 await check('Clock waits for lecturer',`/livekit/clock/${active.id}`,'GET',undefined,f.student,200,d=>d.meetingStartedAt===null);
 await check('Student cannot start clock',`/livekit/start/${active.id}`,'POST',{},f.student,403);
 await check('Foreign lecturer cannot read clock',`/livekit/clock/${active.id}`,'GET',undefined,f.other,403);
 const first=await check('Lecturer starts shared clock',`/livekit/start/${active.id}`,'POST',{},f.lecturer,201,d=>d.status==='IN_PROGRESS'&&Date.parse(d.meetingEndsAt)-Date.parse(d.meetingStartedAt)===45*60000&&Date.parse(d.warningAt)-Date.parse(d.meetingStartedAt)===40*60000);
 await check('Reconnect preserves clock',`/livekit/start/${active.id}`,'POST',{},f.lecturer,201,d=>d.meetingStartedAt===first.meetingStartedAt);
 await check('Student observes same clock',`/livekit/clock/${active.id}`,'GET',undefined,f.student,200,d=>d.meetingStartedAt===first.meetingStartedAt);
 await db.session.update({where:{id:active.id},data:{meetingStartedAt:new Date(Date.now()-40*60000)}});
 await check('Forty-minute extension remains active',`/livekit/clock/${active.id}`,'GET',undefined,f.student,200,d=>!d.expired&&d.status==='IN_PROGRESS');
 await db.session.update({where:{id:active.id},data:{meetingStartedAt:new Date(Date.now()-45*60000-1)}});
 await check('Forty-five-minute expiry completes',`/livekit/clock/${active.id}`,'GET',undefined,f.student,200,d=>d.expired&&d.status==='COMPLETED');
 await check('Expired meeting token denied',`/livekit/token/${active.id}`,'GET',undefined,f.lecturer,400);
 await check('Completed meeting cannot restart',`/livekit/start/${active.id}`,'POST',{},f.lecturer,400);
 const neighbor=await session('2050-02-01T10:00:00+05:30');
 const cancelled=await session('2050-02-01T10:40:00+05:30','CANCELED');
 await check('Reopen enforces lecturer ten-minute break',`/livekit/reopen/${cancelled.id}`,'POST',{},f.lecturer,400);
 await check('Pricing serves direct local and USD values','/subscriptions/plans','GET',undefined,f.student,200,d=>Array.isArray(d)&&d.every(p=>p.prices.LKR===p.monthlyLkr&&p.prices.USD===p.monthlyUsd));
 } finally {
 await db.studentProfile.update({where:{userId:f.fresh.id},data:{preferredHours:original.preferredHours,assignedLecturerId:original.assignedLecturerId}});
 await db.lecturerProfile.update({where:{userId:f.other.id},data:{hourlyAvailabilityJson:[10,11,12,13]}});
 await db.session.deleteMany({where:{id:{in:sessions}}});await db.supportTicket.deleteMany({where:{id:{in:tickets}}});await db.$disconnect();
 await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'changed-api-results.json'),JSON.stringify(results,null,2));
 }
 console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length}));
 process.exitCode=results.some(r=>!r.passed)?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
