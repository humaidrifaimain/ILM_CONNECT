const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
process.env.DATABASE_URL=process.env.LECTURER_QA_DATABASE_URL||'postgresql://lecturer_qa@127.0.0.1:55439/lecturer_qa';
if(!/^postgresql:\/\/[^/]*@(localhost|127\.0\.0\.1):/.test(process.env.DATABASE_URL))throw Error('Local QA database required');
process.env.NODE_ENV='test';
const {PrismaService}=require('../dist/src/prisma/prisma.service.js');
const db=new PrismaService();
const out=path.resolve(__dirname,'../../output/playwright/lecturer-qa');
const checks=[];const ids=[];
const apiBase=process.env.LECTURER_QA_API_URL||'http://localhost:3012/api/v1';
async function request(f,ep,method='GET',body,user=f.lecturer){const r=await fetch(apiBase+ep,{method,headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json().catch(()=>null)};}
async function run(){const f=JSON.parse(await fs.readFile(path.join(out,'fixtures.json'),'utf8'));await db.$connect();
const push=(name,passed,evidence)=>{checks.push({name,at:new Date().toISOString(),passed,evidence});console.log((passed?'PASS ':'FAIL ')+name);};
const {z}=require('../../frontend/node_modules/zod');
const profileSchema=z.object({userId:z.uuid(),fullName:z.string(),bio:z.string(),languages:z.array(z.string()),specializations:z.array(z.string()),payoutMethod:z.string(),user:z.object({id:z.uuid(),email:z.email(),role:z.literal('LECTURER'),status:z.enum(['ACTIVE','PENDING','SUSPENDED'])})});
const session=z.object({id:z.uuid(),studentId:z.uuid(),lecturerId:z.uuid(),startsAt:z.iso.datetime(),endsAt:z.iso.datetime(),status:z.enum(['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELED','NO_SHOW_STUDENT','NO_SHOW_LECTURER'])});
const student=z.object({userId:z.uuid(),fullName:z.string(),assignedLecturerId:z.uuid().nullable(),progress:z.object({currentLearningPathId:z.uuid(),currentLessonId:z.uuid().nullable(),progressPercentage:z.number().min(0).max(100)}).nullable()});
const payout=z.object({id:z.uuid(),lecturerId:z.uuid(),amountLkr:z.number().positive(),status:z.enum(['PENDING','SUCCESSFUL','FAILED']),sessionBlocksIncluded:z.array(z.uuid()),initiatedAt:z.iso.datetime()});
const thread=z.object({threadId:z.string(),unreadCount:z.number().int().nonnegative(),otherUser:z.object({id:z.uuid(),name:z.string(),role:z.string()}),lastMessage:z.object({id:z.uuid(),content:z.string(),createdAt:z.iso.datetime()})});
for(const [endpoint,schema]of [['/profile/lecturer',profileSchema],['/bookings/lecturer',z.array(session)],['/profile/lecturer/students/progress',z.array(student)],['/payouts/me',z.array(payout)],['/payouts/balance',z.object({availableLkr:z.number().nonnegative()})],['/messages/threads',z.array(thread)]]){const r=await request(f,endpoint);const parsed=schema.safeParse(r.data);push('Response schema contract '+endpoint,r.status===200&&parsed.success,{status:r.status,issues:parsed.success?[]:parsed.error.issues});}
for(let repeat=1;repeat<=2;repeat++){
 const time=new Date(Date.now()+(1000+repeat*24)*3600000);time.setHours(10,0,0,0);const body={startsAt:time.toISOString(),endsAt:new Date(+time+40*60000).toISOString()};
 const r=await Promise.all([request(f,'/availability','POST',body),request(f,'/availability','POST',body)]);const rows=await db.availabilitySlot.count({where:{lecturerId:f.lecturer.id,startsAt:time}});push('Repeat '+repeat+' availability concurrency',rows===1,{statuses:r.map(v=>v.status),rows});
 const students=[];for(let i=0;i<2;i++){const user=await db.user.create({data:{email:'qa-repeat-'+crypto.randomUUID()+'@example.test',passwordHash:'not-login-enabled',role:'STUDENT',status:'ACTIVE',studentProfile:{create:{fullName:'QA Repeat Student',phone:'000',country:'Sri Lanka',timezone:'Asia/Colombo',preferredLanguage:'English',learningGoals:'QA',assignedLecturerId:f.lecturer.id}}}});ids.push(user.id);students.push(user);await db.subscription.create({data:{studentId:user.id,tier:'Standard',status:'ACTIVE',currentPeriodStart:new Date(Date.now()-60000),currentPeriodEnd:new Date(Date.now()+1200*3600000),lkrAmount:0,fxRateApplied:1}});}
 const bookingTime=new Date(+time+2*3600000);await db.availabilitySlot.create({data:{lecturerId:f.lecturer.id,startsAt:bookingTime,endsAt:new Date(+bookingTime+40*60000),status:'OPEN'}});
 const bookings=await Promise.all(students.map(s=>request(f,'/bookings','POST',{studentId:s.id,startsAt:bookingTime.toISOString()})));const sessions=await db.session.count({where:{lecturerId:f.lecturer.id,startsAt:bookingTime,status:'SCHEDULED'}});push('Repeat '+repeat+' booking concurrency',sessions===1,{statuses:bookings.map(v=>v.status),sessions});
 const completed=await db.session.create({data:{studentId:f.student.id,lecturerId:f.lecturer.id,startsAt:new Date(Date.now()-3600000),endsAt:new Date(Date.now()-1200000),status:'COMPLETED'}});
 const reopen=await request(f,'/livekit/reopen/'+completed.id,'POST',{});push('Repeat '+repeat+' completed reopening rejected',reopen.status===400,{status:reopen.status,result:reopen.data?.session?.status});
 const msg=await request(f,'/messages','POST',{recipientId:f.lecturer.id,content:'QA private thread '+repeat},f.student);
 const thread=msg.data.threadId;const injection=await request(f,'/messages','POST',{recipientId:f.student.id,content:'QA repeated intrusion '+repeat,threadId:thread},f.other);const read=await request(f,'/messages/'+thread,'GET',undefined,f.other);
 push('Repeat '+repeat+' unauthorized thread injection and read blocked',injection.status===403&&read.status===403,{injection:injection.status,read:read.status,privateMessageVisible:Array.isArray(read.data)&&read.data.some(m=>m.content==='QA private thread '+repeat)});
 const ticket=await request(f,'/support/request','POST',{type:'GENERAL_SUPPORT',reason:'QA repeated support'});const resolve=await request(f,'/support/tickets/'+ticket.data.id+'/messages','POST',{message:'QA status injection',newStatus:'RESOLVED'});push('Repeat '+repeat+' lecturer cannot resolve own support',resolve.status===400||resolve.status===403,{status:resolve.status,ticketStatus:resolve.data?.status});
}
const bcrypt=require('bcrypt');
const reopeningStart=new Date(Date.now()+10*60000);
const reopening=await db.session.create({data:{studentId:f.fresh.id,lecturerId:f.empty.id,startsAt:reopeningStart,endsAt:new Date(+reopeningStart+40*60000),status:'CANCELED'}});
const reopeningSlot=await db.availabilitySlot.create({data:{lecturerId:f.empty.id,startsAt:reopening.startsAt,endsAt:reopening.endsAt,status:'OPEN'}});
const studentReopen=await request(f,'/livekit/reopen/'+reopening.id,'POST',{},f.fresh);
push('Student cannot reopen an eligible canceled classroom',studentReopen.status===403,{status:studentReopen.status});
const lecturerReopen=await request(f,'/livekit/reopen/'+reopening.id,'POST',{},f.empty);
const reserved=await db.availabilitySlot.findUnique({where:{id:reopeningSlot.id}});
push('Assigned lecturer can reopen within the join window and reserve the slot',lecturerReopen.status===201&&lecturerReopen.data?.session?.status==='SCHEDULED'&&reserved.status==='BOOKED',{status:lecturerReopen.status,sessionStatus:lecturerReopen.data?.session?.status,slotStatus:reserved.status});
const rejoined=await request(f,'/livekit/token/'+reopening.id,'GET',undefined,f.empty);
push('Reopened classroom admits its lecturer before start within 30 minutes',rejoined.status===200&&rejoined.data?.session?.status==='SCHEDULED',{status:rejoined.status,sessionStatus:rejoined.data?.session?.status});
const prematureCompletion=await request(f,'/bookings/'+reopening.id,'PATCH',{status:'COMPLETED'},f.empty);
push('Reopened classroom cannot be completed before its start',prematureCompletion.status===400,{status:prematureCompletion.status});
await db.session.delete({where:{id:reopening.id}});await db.availabilitySlot.delete({where:{id:reopeningSlot.id}});
for(const state of ['PENDING','DELETED']){
 const user=await db.user.create({data:{email:'qa-state-'+crypto.randomUUID()+'@example.test',passwordHash:await bcrypt.hash(f.password,4),role:'LECTURER',status:state==='PENDING'?'PENDING':'ACTIVE',deletedAt:state==='DELETED'?new Date():null,lecturerProfile:{create:{fullName:'QA State Lecturer',bio:'QA',qualifications:'QA',languages:[],specializations:[],hourlyAvailabilityJson:[10,11,12,13],payoutMethod:'bank_transfer',payoutDetails:'QA',status:state==='PENDING'?'PENDING':'ACTIVE'}}}});ids.push(user.id);
 const login=await fetch(apiBase+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:f.password})});const data=await login.json();push(state+' lecturer cannot sign in',login.status===401,{status:login.status,tokenIssued:!!data.token});
 const token=require('jsonwebtoken').sign({sub:user.id,role:'LECTURER',version:0},process.env.JWT_SECRET||'ilmconnect-super-secure-high-grade-secret-key-2026',{expiresIn:'5m'});
 const read=await request(f,'/profile/lecturer','GET',undefined,{token});push(state+' lecturer cannot access lecturer profile with an existing token',read.status===401||read.status===403,{status:read.status});
}
const studentRead=await request(f,'/bookings/student','GET',undefined,f.student);push('Lecturer private notes hidden from student',!JSON.stringify(studentRead.data).includes('QA PRIVATE NOTES'),{status:studentRead.status,privateNotesVisible:JSON.stringify(studentRead.data).includes('QA PRIVATE NOTES')});
const profile=await request(f,'/profile/student','GET',undefined,f.student);push('Lecturer bank details hidden from assigned student',!profile.data.assignedLecturer?.payoutDetails,{status:profile.status,bankDetailsVisible:!!profile.data.assignedLecturer?.payoutDetails});
const lecturerDirectory=await request(f,'/profile/lecturers','GET',undefined,f.student);push('Lecturer bank details hidden from student directory',!lecturerDirectory.data.some(p=>p.payoutDetails),{status:lecturerDirectory.status,bankDetailsVisible:lecturerDirectory.data.some(p=>p.payoutDetails)});
await fs.writeFile(path.join(out,'boundary-results.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify({total:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length}));
}
run().then(async()=>{await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();process.exitCode=checks.some(c=>!c.passed)?1:0;}).catch(async e=>{console.error(e);await db.$disconnect();process.exit(1)});
