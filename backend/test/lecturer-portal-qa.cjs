const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const crypto = require('node:crypto');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
process.env.DATABASE_URL = process.env.LECTURER_QA_DATABASE_URL || 'postgresql://lecturer_qa@127.0.0.1:55439/lecturer_qa';
if (!/^postgresql:\/\/[^/]*@(localhost|127\.0\.0\.1):/.test(process.env.DATABASE_URL)) throw new Error('This QA runner requires an isolated local database');
process.env.NODE_ENV='test'; process.env.RESEND_API_KEY='';
const {Test}=require('@nestjs/testing');
const {ValidationPipe}=require('@nestjs/common');
const {AppModule}=require('../dist/src/app.module.js');
const {PrismaService}=require('../dist/src/prisma/prisma.service.js');
const {EmailNotificationService}=require('../dist/src/notification/email-notification.service.js');
const {WhatsAppNotificationService}=require('../dist/src/notification/whatsapp-notification.service.js');
const {LivekitService}=require('../dist/src/livekit/livekit.service.js');
const bcrypt=require('bcrypt');
const out=path.resolve(__dirname,'../../output/playwright/lecturer-qa');
const prefix='qa-lecturer-'+crypto.randomUUID();
const password='LecturerQA-2026-Temporary!';
const checks=[]; const users=[]; const paths=[];
let app,db,dir,fixture;
const date=hours=>new Date(Date.now()+hours*3600000);
const shiftTime=hours=>{const day=date(hours);const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(day);const part=n=>parts.find(p=>p.type===n).value;return new Date(`${part('year')}-${part('month')}-${part('day')}T10:00:00+05:30`);};
async function req(endpoint,method='GET',body,token){
 const start=Date.now(); const response=await fetch((process.env.LECTURER_QA_API_URL||'http://localhost:3012/api/v1')+endpoint,{method,headers:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
 const text=await response.text(); let data;try{data=JSON.parse(text);}catch{data=text;}
 return {status:response.status,data,headers:Object.fromEntries(response.headers),ms:Date.now()-start};
}
async function check(name,endpoint,method,body,token,expected,predicate){
 const r=await req(endpoint,method,body,token);const statuses=Array.isArray(expected)?expected:[expected];
 const passed=statuses.includes(r.status)&&(!predicate||await predicate(r.data,r));
 checks.push({name,at:new Date().toISOString(),endpoint,method:method||'GET',expected:statuses,actual:r.status,passed,ms:r.ms,response:JSON.parse(JSON.stringify(r.data,(k,v)=>/token|passwordHash|payoutDetails/i.test(k)?'[redacted]':v))});
 console.log((passed?'PASS ':'FAIL ')+name+' '+r.status);return r.data;
}
async function person(name,role='LECTURER',status='ACTIVE'){
 const data={email:prefix+'-'+name+'@example.test',passwordHash:await bcrypt.hash(password,4),role,status};
 if(role==='LECTURER')data.lecturerProfile={create:{fullName:'QA Lecturer '+name,bio:'QA biography',qualifications:'QA certification',languages:['English','Arabic'],specializations:['Quran'],hourlyAvailabilityJson:[10,11,12,13],payoutMethod:'bank_transfer',payoutDetails:'QA PRIVATE BANK',status}};
 if(role==='STUDENT')data.studentProfile={create:{fullName:'QA Student '+name,phone:'000000000',country:'Sri Lanka',timezone:'Asia/Colombo',preferredLanguage:'English',learningGoals:'QA learning'}};
 const u=await db.user.create({data});users.push(u.id);const login=await req('/auth/login','POST',{email:u.email,password});return {id:u.id,email:u.email,role,status,token:login.data.token};
}
async function session(student,lecturer,hours,status='SCHEDULED',lessonId){const startsAt=date(hours);return db.session.create({data:{studentId:student.id,lecturerId:lecturer.id,startsAt,endsAt:new Date(+startsAt+40*60000),status,lessonId,livekitRoomName:'qa-room-'+crypto.randomUUID()}});}
async function slot(lecturer,startsAt,status='OPEN',minutes=40){return db.availabilitySlot.create({data:{lecturerId:lecturer.id,startsAt,endsAt:new Date(+startsAt+minutes*60000),status}});}
async function progress(student,course,lesson=course.modules[0].lessons[0]){return db.studentProgress.upsert({where:{studentId:student.id},create:{studentId:student.id,currentLearningPathId:course.id,currentModuleId:lesson.moduleId,currentLessonId:lesson.id,progressPercentage:25},update:{currentLearningPathId:course.id,currentModuleId:lesson.moduleId,currentLessonId:lesson.id,progressPercentage:25}});}
async function setup(){
 await fs.mkdir(out,{recursive:true});dir=await fs.mkdtemp(path.join(os.tmpdir(),'ilm-lecturer-files-'));process.env.MATERIAL_UPLOAD_DIR=dir;
 const mod=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(LivekitService).useValue({getRoomName:id=>'qa-room-'+id,generateToken:async()=>({token:'sim_qa',wsUrl:'',isSimulation:true})}).compile();
 mod.get(EmailNotificationService).sendEmail=async()=>({success:true});mod.get(WhatsAppNotificationService).sendWhatsApp=async()=>true;
 app=mod.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');app.use(require('cookie-parser')());app.enableCors({origin:[process.env.LECTURER_QA_WEB_URL||'http://localhost:3003'],credentials:true});app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidNonWhitelisted:true,transformOptions:{enableImplicitConversion:true}}));db=app.get(PrismaService);await app.listen(Number(process.env.LECTURER_QA_API_PORT||3012));
 const lecturer=await person('primary'),other=await person('other'),empty=await person('empty'),student=await person('assigned','STUDENT'),fresh=await person('no-sessions','STUDENT'),foreign=await person('foreign','STUDENT'),admin=await person('admin','ADMIN');
 for(const s of [student,fresh])await db.studentProfile.update({where:{userId:s.id},data:{assignedLecturerId:lecturer.id}});
 await db.studentProfile.update({where:{userId:foreign.id},data:{assignedLecturerId:other.id}});
 for(const s of [student,fresh,foreign])await db.subscription.create({data:{studentId:s.id,tier:'Standard',status:'ACTIVE',currentPeriodStart:date(-24),currentPeriodEnd:date(24*45),lkrAmount:0,fxRateApplied:1}});
 const courses=[];for(const name of ['Quran foundations','Tajweed']){
  const c=await db.learningPath.create({data:{title:'QA '+name,level:'Beginner',difficulty:'Easy',description:'QA course description',targetAudience:'QA students',objectives:'QA objectives',modules:{create:[{title:'QA Module 1',orderIndex:1,lessons:{create:[{title:'QA Alif',objectives:'Learn Alif',orderIndex:1},{title:'QA Baa',objectives:'Learn Baa',orderIndex:2}]}},{title:'QA Module 2',orderIndex:2,lessons:{create:[{title:'QA Taa',objectives:'Learn Taa',orderIndex:1},{title:'QA Thaa',objectives:'Learn Thaa',orderIndex:2}]}}]}},include:{modules:{orderBy:{orderIndex:'asc'},include:{lessons:{orderBy:{orderIndex:'asc'}}}}}});courses.push(c);paths.push(c.id);
 }
 await progress(student,courses[0]);await progress(foreign,courses[0]);
 const lesson=courses[0].modules[0].lessons[0];
 const completed=await session(student,lecturer,-24,'COMPLETED',lesson.id),upcoming=await session(student,lecturer,72,'SCHEDULED',lesson.id),near=await session(student,lecturer,1,'SCHEDULED',lesson.id),live=await session(student,lecturer,-.1,'IN_PROGRESS',lesson.id),canceled=await session(student,lecturer,96,'CANCELED',lesson.id),foreignSession=await session(foreign,other,120,'SCHEDULED',lesson.id);
 await db.sessionNotes.create({data:{sessionId:completed.id,lecturerId:lecturer.id,topicsCovered:'QA Alif',homework:'QA Homework',studentProgressRating:4,internalNotes:'QA PRIVATE NOTES',sharedNotes:'QA shared notes'}});
 await db.rating.create({data:{sessionId:completed.id,studentId:student.id,lecturerId:lecturer.id,score:5,comment:'QA feedback'}});
 await slot(lecturer,upcoming.startsAt,'BOOKED');await slot(lecturer,date(144));
 await db.sessionBlock.create({data:{studentId:student.id,lecturerId:lecturer.id,status:'COMPLETED',payoutAmountLkr:2500,completedAt:date(-24)}});
 await db.payout.create({data:{lecturerId:lecturer.id,amountLkr:5000,method:'bank_transfer',status:'SUCCESSFUL',sessionBlocksIncluded:[],completedAt:date(-48)}});
 const message=await req('/messages','POST',{recipientId:lecturer.id,content:'QA student initial message'},student.token);
 const ticket=await req('/support/request','POST',{type:'GENERAL_SUPPORT',reason:'QA lecturer initial inquiry'},lecturer.token);
 fixture={prefix,password,lecturer,other,empty,student,fresh,foreign,admin,courses,completed,upcoming,near,live,canceled,foreignSession,message:message.data,ticket:ticket.data};
 await fs.writeFile(path.join(out,'fixtures.json'),JSON.stringify(fixture,null,2),{mode:0o600});
}
async function run(){const {lecturer:l,other:o,student:s,fresh:f,foreign:x,admin:a,courses,upcoming,completed,near,live,canceled,foreignSession,message,ticket}=fixture;
 const reads=['/profile/lecturer','/profile/lecturer/students','/profile/lecturer/students/progress','/bookings/lecturer','/availability','/payouts/me','/payouts/balance','/messages/threads','/messages/unread-count','/materials','/support/my-tickets','/curriculum/paths'];
 for(const endpoint of reads){await check('Authenticated read '+endpoint,endpoint,'GET',undefined,l.token,200,(d,r)=>r.headers['content-type'].includes('application/json')&&!JSON.stringify(d).includes('passwordHash'));await check('Anonymous denied '+endpoint,endpoint,'GET',undefined,undefined,401);}
 for(const ep of ['/admin/users','/admin/stats','/support/tickets','/profile/student','/bookings/student','/progress/student','/progress/assessments','/progress/certificates'])await check('Lecturer role denied '+ep,ep,'GET',undefined,l.token,403);
 await check('Malformed bearer denied','/auth/me','GET',undefined,'invalid.jwt.token',401);
 await check('Wrong password denied','/auth/login','POST',{email:l.email,password:'wrong'},undefined,401);
 await check('Uppercase email login works','/auth/login','POST',{email:l.email.toUpperCase(),password},undefined,201);
 await check('Profile update Unicode persists','/profile/lecturer','PUT',{fullName:'QA Lecturer primary',bio:'العربية தமிழ் QA',languages:['English','العربية'],qualifications:'QA updated',specializations:['Quran']},l.token,200,d=>d.bio.includes('العربية'));
 for(const body of [{fullName:''},{fullName:' '},{fullName:123},{bio:'x'.repeat(5001)},{languages:'English'},{languages:[5]},{languages:Array(21).fill('a')},{specializations:['x'.repeat(101)]},{status:'SUSPENDED'},{payoutDetails:'injected'},{hourlyAvailabilityJson:[0]},{ratingAvg:5},{userId:o.id}])await check('Profile rejects '+Object.keys(body)[0]+' '+JSON.stringify(body).slice(0,35),'/profile/lecturer','PUT',body,l.token,400);
 await check('Assigned students only','/profile/lecturer/students','GET',undefined,l.token,200,d=>d.length===2&&d.every(v=>v.assignedLecturerId===l.id));
 for(const target of [s.id,f.id])await check('Assigned student detail '+target,`/profile/lecturer/students/${target}`,'GET',undefined,l.token,200);
 for(const target of [x.id,'missing'])await check('Unassigned student detail denied '+target,`/profile/lecturer/students/${target}`,'GET',undefined,l.token,404);
 const base=`/profile/lecturer/students/${s.id}`;const lesson=courses[0].modules[0].lessons[0];
 for(const [action,body] of [['lesson-access',{lessonId:lesson.id}],['course-access',{learningPathId:courses[0].id}],['revoke-access',{}]]){
 await check('Other lecturer cannot '+action,base+'/'+action,'PUT',body,o.token,403);
 await check('Student cannot '+action,base+'/'+action,'PUT',body,s.token,403);
 }
 for(const [action,body] of [['lesson-access',{}],['lesson-access',{lessonId:'missing'}],['lesson-access',{lessonId:123}],['course-access',{}],['course-access',{learningPathId:'missing'}],['course-access',{learningPathId:123}]])await check('Access invalid '+action+' '+JSON.stringify(body),base+'/'+action,'PUT',body,l.token,[400,404]);
 await check('Grant first lesson',base+'/lesson-access','PUT',{lessonId:lesson.id},l.token,200,d=>d.progressPercentage===25);
 await check('Advance lesson','/progress/advance','POST',{studentId:s.id},l.token,201,d=>d.currentLessonId===courses[0].modules[0].lessons[1].id);
 await check('Grant full course',base+'/course-access','PUT',{learningPathId:courses[0].id},l.token,200,d=>d.progressPercentage===100);
 await check('No next lesson at end','/progress/advance','POST',{studentId:s.id},l.token,400);
 await check('Revoke course access',base+'/revoke-access','PUT',{},l.token,200);
 await check('Revoke state persisted','/profile/lecturer/students/progress','GET',undefined,l.token,200,d=>d.find(v=>v.userId===s.id).progress.currentLessonId===null);
 await progress(s,courses[0]);
 for(const body of [{},{studentId:123},{studentId:'missing'},{studentId:x.id}])await check('Advance invalid or unauthorized '+JSON.stringify(body),'/progress/advance','POST',body,l.token,[400,403,404]);
 const assessment={studentId:s.id,title:'QA Recitation Result',score:85,feedback:'QA feedback'};
 for(const [key,values] of Object.entries({title:['',' ', 'x'.repeat(201),5],score:[-1,101,'90',null],feedback:['x'.repeat(2001),123,null],studentId:[x.id,'missing']}))for(const v of values)await check('Assessment invalid '+key+' '+String(v).slice(0,20),'/progress/assessments','POST',{...assessment,[key]:v},l.token,[400,403,404]);
 for(const score of [0,100,85.5])await check('Assessment valid boundary '+score,'/progress/assessments','POST',{...assessment,score},l.token,201,d=>d.score===score&&d.courseId===courses[0].id);
 await check('Assessments visible to student','/progress/assessments','GET',undefined,s.token,200,d=>d.length===3);
 const start=shiftTime(168),end=new Date(+start+40*60000),body={startsAt:start.toISOString(),endsAt:end.toISOString()};
 const sl=await check('Availability create','/availability','POST',body,l.token,201,d=>d.lecturerId===l.id);
 await check('Availability duplicate idempotent','/availability','POST',body,l.token,201,d=>d.id===sl.id);
 for(const patch of [{startsAt:'bad'},{endsAt:'bad'},{endsAt:body.startsAt},{startsAt:body.endsAt},{startsAt:null},{endsAt:null},{status:'BOOKED'}])await check('Availability invalid '+JSON.stringify(patch),'/availability','POST',{...body,...patch},l.token,400);
 await check('Availability overlap rejected','/availability','POST',{startsAt:new Date(+start+60000).toISOString(),endsAt:new Date(+end+60000).toISOString()},l.token,400);
 const adjacent=await check('Availability adjacent allowed','/availability','POST',{startsAt:body.endsAt,endsAt:new Date(+end+40*60000).toISOString()},l.token,201);
 await check('Availability cannot target other lecturer','/availability','POST',{...body,startsAt:shiftTime(192).toISOString(),endsAt:new Date(+shiftTime(192)+40*60000).toISOString(),lecturerId:o.id},l.token,201,d=>d.lecturerId===l.id);
 await check('Foreign slot deletion no change','/availability/'+sl.id,'DELETE',{},o.token,200,async()=>!!await db.availabilitySlot.findUnique({where:{id:sl.id}}));
 const booked=await db.availabilitySlot.findFirst({where:{lecturerId:l.id,status:'BOOKED'}});
 await check('Booked slot locked','/availability/'+booked.id,'DELETE',{},l.token,400);
 await check('Availability delete','/availability/'+sl.id,'DELETE',{},l.token,200);
 await check('Availability repeat delete idempotent','/availability/'+sl.id,'DELETE',{},l.token,200);
 await db.availabilitySlot.delete({where:{id:adjacent.id}});
 for(const [name,h] of [['past',-48],['outside assigned shift',200]]){const startsAt=date(h);if(h>0)startsAt.setHours(3,0,0,0);await check('Availability rejects '+name,'/availability','POST',{startsAt:startsAt.toISOString(),endsAt:new Date(+startsAt+40*60000).toISOString()},l.token,400);}
 for(const [i,duration] of [1/60,39,41,1440].entries()){const st=shiftTime(240+i*24);await check('Availability interval within shift '+duration,'/availability','POST',{startsAt:st.toISOString(),endsAt:new Date(+st+duration*60000).toISOString()},l.token,duration===1440?400:201);}
 for(const [action,method,body] of [['','DELETE',{}],['','PATCH',{notes:'intrusion'}],['/reschedule','POST',{startsAt:date(240).toISOString()}],['/absent','POST',{}]])await check('Foreign session denied '+action+method,'/bookings/'+foreignSession.id+action,method,body,l.token,403);
 for(const [name,sessionId,expected] of [['inside 6h',near.id,400],['completed',completed.id,400],['canceled',canceled.id,400]])await check('Cancellation rejects '+name,'/bookings/'+sessionId,'DELETE',{},l.token,expected);
 const cancelTarget=await session(s,l,200);await slot(l,cancelTarget.startsAt,'BOOKED');
 await check('Lecturer cancel success','/bookings/'+cancelTarget.id,'DELETE',{reason:'QA cancel'},l.token,200,d=>d.status==='CANCELED');
 await check('Cancellation reopens availability','/availability','GET',undefined,l.token,200,d=>d.some(v=>v.startsAt===cancelTarget.startsAt.toISOString()&&v.status==='OPEN'));
 await check('Repeat cancellation rejected','/bookings/'+cancelTarget.id,'DELETE',{},l.token,400);
 for(const body of [{notes:3},{notes:null},{notes:'x'.repeat(10001)},{status:'SCHEDULED'},{status:'INVALID'}])await check('Session update validation '+JSON.stringify(body).slice(0,35),'/bookings/'+live.id,'PATCH',body,l.token,400);
 await check('Session notes save','/bookings/'+live.id,'PATCH',{notes:'QA shared browser notes العربية'},l.token,200);
 await check('Session notes persisted','/bookings/lecturer','GET',undefined,l.token,200,d=>d.find(v=>v.id===live.id).notes.sharedNotes.includes('العربية'));
 await check('Future completion rejected','/bookings/'+upcoming.id,'PATCH',{status:'COMPLETED'},l.token,400);
 const finish=await session(s,l,-.2,'IN_PROGRESS');await check('Complete started session','/bookings/'+finish.id,'PATCH',{status:'COMPLETED'},l.token,200,d=>d.status==='COMPLETED');
 await check('Repeat completion rejected','/bookings/'+finish.id,'PATCH',{status:'COMPLETED'},l.token,400);
 await check('Future absence rejected','/bookings/'+upcoming.id+'/absent','POST',{reason:'QA'},l.token,400);
 const absent=await session(s,l,-.3);await check('Started absence accepted','/bookings/'+absent.id+'/absent','POST',{reason:'QA absent'},l.token,201,d=>d.status==='NO_SHOW_STUDENT');
 await check('Repeat absence rejected','/bookings/'+absent.id+'/absent','POST',{},l.token,400);
 for(const value of ['bad',null,123])await check('Reschedule invalid date '+value,'/bookings/'+cancelTarget.id+'/reschedule','POST',{startsAt:value},l.token,400);
 const move=await session(f,l,220);await slot(l,move.startsAt,'BOOKED');const target=date(300);await slot(l,target);
 await check('Reschedule valid','/bookings/'+move.id+'/reschedule','POST',{startsAt:target.toISOString(),reason:'QA move'},l.token,201,d=>d.startsAt===target.toISOString());
 const another=await session(f,l,320);for(const value of ['bad',null,123])await check('Active reschedule invalid date '+value,'/bookings/'+another.id+'/reschedule','POST',{startsAt:value},l.token,400);
 const recent=await session(f,l,-1,'COMPLETED');const recentTarget=date(350);await slot(l,recentTarget);await check('Completed reschedule rejected','/bookings/'+recent.id+'/reschedule','POST',{startsAt:recentTarget.toISOString()},l.token,400);
 const bookingTime=date(800);await slot(l,bookingTime);await check('Lecturer books assigned student','/bookings','POST',{studentId:f.id,lecturerId:l.id,startsAt:bookingTime.toISOString()},l.token,201,d=>d.studentId===f.id);
 const foreignTime=date(430);await slot(l,foreignTime);await check('Lecturer cannot book unassigned student','/bookings','POST',{studentId:x.id,startsAt:foreignTime.toISOString()},l.token,[400,403]);
 for(const [name,id] of [['foreign',foreignSession.id],['missing','missing']])await check('Classroom '+name+' denied','/livekit/token/'+id,'GET',undefined,l.token,name==='foreign'?403:400);
 await check('Classroom early entry allowed','/livekit/token/'+near.id,'GET',undefined,l.token,200);
 for(const [name,id] of [['completed',completed.id],['canceled',canceled.id]])await check('Classroom '+name+' blocked','/livekit/token/'+id,'GET',undefined,l.token,400);
 await check('Classroom active entry','/livekit/token/'+live.id,'GET',undefined,l.token,200,d=>d.isSimulation&&d.session.id===live.id);
 await check('Other lecturer reopen denied','/livekit/reopen/'+canceled.id,'POST',{},o.token,403);
 await check('Completed reopen denied','/livekit/reopen/'+completed.id,'POST',{},l.token,400);
 const payout={amountLkr:2500,method:'bank_transfer'};
 for(const amountLkr of [0,-1,0.001,'2500',null,2501,100])await check('Payout invalid amount '+amountLkr,'/payouts/request','POST',{...payout,amountLkr},l.token,400);
 for(const method of ['cash','',null])await check('Payout invalid method '+method,'/payouts/request','POST',{...payout,method},l.token,400);
 await check('Foreign lecturer has no balance','/payouts/balance','GET',undefined,o.token,200,d=>d.availableLkr===0);
 const race=await Promise.all([req('/payouts/request','POST',payout,l.token),req('/payouts/request','POST',payout,l.token)]);checks.push({name:'Concurrent payout exactly once',at:new Date().toISOString(),passed:race.filter(r=>r.status===201).length===1&&race.filter(r=>r.status===400).length===1,response:race.map(r=>({status:r.status}))});
 await check('Payout balance reserved','/payouts/balance','GET',undefined,l.token,200,d=>d.availableLkr===0);
 await check('Own payout history only','/payouts/me','GET',undefined,l.token,200,d=>d.every(v=>v.lecturerId===l.id));
 for(const body of [{recipientId:s.id,content:''},{recipientId:s.id,content:'   '},{recipientId:s.id},{recipientId:s.id,content:123},{recipientId:'missing',content:'QA'},{recipientId:s.id,content:'x'.repeat(10001)}])await check('Message validation '+JSON.stringify(body).slice(0,50),'/messages','POST',body,l.token,[400,404]);
 await check('Foreign thread read denied','/messages/'+message.threadId,'GET',undefined,o.token,403);
 await check('Foreign thread mark read before injection denied','/messages/'+message.threadId+'/read','PATCH',{},o.token,403);
 await check('Foreign thread injection denied','/messages','POST',{recipientId:s.id,content:'QA intrusion',threadId:message.threadId},o.token,403);
 await check('Message assigned student','/messages','POST',{recipientId:s.id,content:'QA lecturer reply العربية'},l.token,201);
 await check('Thread messages visible','/messages/'+message.threadId,'GET',undefined,l.token,200,d=>d.some(v=>v.content==='QA lecturer reply العربية'));
 await check('Thread mark read','/messages/'+message.threadId+'/read','PATCH',{},l.token,204);
 await check('Foreign thread read still denied after injection','/messages/'+message.threadId,'GET',undefined,o.token,403);
 await check('Presence heartbeat','/messages/presence/ping','POST',{},l.token,200);
 await check('Presence batch','/messages/presence?userIds='+s.id,'GET',undefined,l.token,200);
 await check('Presence offline','/messages/presence/offline','POST',{},l.token,200);
 for(const body of [{},{type:'INVALID',reason:'QA'},{type:'GENERAL_SUPPORT',reason:' '},{type:'GENERAL_SUPPORT',reason:123}])await check('Support validation '+JSON.stringify(body),'/support/request','POST',body,l.token,400);
 await check('Own support read','/support/tickets/'+ticket.id,'GET',undefined,l.token,200);
 await check('Other support read denied','/support/tickets/'+ticket.id,'GET',undefined,o.token,403);
 for(const body of [{},{message:' '},{message:123},{message:'QA',newStatus:'RESOLVED'}])await check('Support reply validation '+JSON.stringify(body),'/support/tickets/'+ticket.id+'/messages','POST',body,l.token,[400,403]);
 await check('Support valid reply','/support/tickets/'+ticket.id+'/messages','POST',{message:'QA lecturer reply'},l.token,201);
 await check('Support cannot change status','/support/tickets/'+ticket.id+'/status','PATCH',{status:'RESOLVED'},l.token,403);
 function upload(title,bytes,type='application/pdf',sessionId=live.id){const form=new FormData();if(title!==undefined)form.set('title',title);if(bytes!==undefined)form.set('file',new Blob([bytes],{type}),'qa.pdf');if(sessionId!==undefined)form.set('sessionId',sessionId);return form;}
 const pdf='%PDF-1.4\nQA lecturer resource\n%%EOF';
 for(const [name,form] of [['missing file',upload('QA',undefined)],['missing title',upload(undefined,pdf)],['blank title',upload(' ',pdf)],['large title',upload('x'.repeat(201),pdf)],['empty file',upload('QA','')],['spoof PDF',upload('QA','invalid')],['unsupported type',upload('QA','hello','text/plain')],['no session',upload('QA',pdf,'application/pdf','')],['foreign session',upload('QA',pdf,'application/pdf',foreignSession.id)],['missing session',upload('QA',pdf,'application/pdf','missing')],['over 10MiB',upload('QA',Buffer.alloc(10*1024*1024+1))]])await check('Upload rejects '+name,'/materials/upload','POST',form,l.token,[400,403,404,413]);
 const material=await check('Upload own material','/materials/upload','POST',upload('QA Lecturer PDF',pdf),l.token,201,d=>d.fileType==='application/pdf');
 await check('Download own material','/materials/'+material.id+'/file','GET',undefined,l.token,200,(d,r)=>d.startsWith('%PDF-')&&r.headers['content-type']==='application/pdf'&&r.headers['x-content-type-options']==='nosniff'&&r.headers['content-disposition'].includes('attachment'));
 await check('Student downloads shared material','/materials/'+material.id+'/file','GET',undefined,s.token,200);
 await check('Foreign lecturer file denied','/materials/'+material.id+'/file','GET',undefined,o.token,403);
 await check('Foreign student file denied','/materials/'+material.id+'/file','GET',undefined,x.token,403);
 await check('Missing file','/materials/missing/file','GET',undefined,l.token,404);
 await check('Missing curriculum','/curriculum/paths/missing','GET',undefined,l.token,404);
 const expired=require('jsonwebtoken').sign({sub:l.id,role:'LECTURER'},process.env.JWT_SECRET||'ilmconnect-super-secure-high-grade-secret-key-2026',{expiresIn:-1});await check('Expired token rejected','/auth/me','GET',undefined,expired,401);
 const suspended=await person('suspended');await db.user.update({where:{id:suspended.id},data:{status:'SUSPENDED'}});await check('Suspension revokes existing token','/profile/lecturer','GET',undefined,suspended.token,401);
 const reset=crypto.randomBytes(32).toString('hex');await db.passwordReset.create({data:{userId:suspended.id,tokenHash:crypto.createHash('sha256').update(reset).digest('hex'),expiresAt:date(1)}});
 await db.user.update({where:{id:suspended.id},data:{status:'ACTIVE'}});
 await check('Reset successful','/auth/reset-password','POST',{token:reset,password:'UpdatedLecturerQA!'},undefined,201);
 await check('Reset cannot repeat','/auth/reset-password','POST',{token:reset,password},undefined,400);
 const boundaryCancelOutside=await session(s,l,6+1/60),boundaryCancelInside=await session(s,l,6-1/60);
 await check('Cancel 6 hours plus 1 minute allowed','/bookings/'+boundaryCancelOutside.id,'DELETE',{},l.token,200);
 await check('Cancel 6 hours minus 1 minute denied','/bookings/'+boundaryCancelInside.id,'DELETE',{},l.token,400);
 const expiredSubStudent=await person('expired-sub','STUDENT');await db.studentProfile.update({where:{userId:expiredSubStudent.id},data:{assignedLecturerId:l.id}});
 const expiredSubTime=date(850);await slot(l,expiredSubTime);await check('Lecturer cannot book unsubscribed student','/bookings','POST',{studentId:expiredSubStudent.id,startsAt:expiredSubTime.toISOString()},l.token,400);
 for(const st of ['COMPLETED','CANCELED','NO_SHOW_STUDENT','NO_SHOW_LECTURER']){
 const rec=await session(s,l,-4,st);await check('Terminal attendance rejects '+st,'/bookings/'+rec.id+'/absent','POST',{reason:'QA'},l.token,400);
 }
 const avst=shiftTime(900),avbody={startsAt:avst.toISOString(),endsAt:new Date(+avst+40*60000).toISOString()};
 const avrace=await Promise.all([req('/availability','POST',avbody,l.token),req('/availability','POST',avbody,l.token)]);
 const avrows=await db.availabilitySlot.count({where:{lecturerId:l.id,startsAt:avst}});checks.push({name:'Concurrent identical availability stored once',at:new Date().toISOString(),passed:avrows===1,response:{statuses:avrace.map(r=>r.status),rows:avrows}});
 const ra=await person('race-a','STUDENT'),rb=await person('race-b','STUDENT');
 for(const stu of [ra,rb]){await db.studentProfile.update({where:{userId:stu.id},data:{assignedLecturerId:l.id}});await db.subscription.create({data:{studentId:stu.id,tier:'Standard',status:'ACTIVE',currentPeriodStart:date(-1),currentPeriodEnd:date(1100),lkrAmount:0,fxRateApplied:1}});}
 const raceTime=date(950);await slot(l,raceTime);
 const bookingRace=await Promise.all([req('/bookings','POST',{studentId:ra.id,startsAt:raceTime.toISOString()},l.token),req('/bookings','POST',{studentId:rb.id,startsAt:raceTime.toISOString()},l.token)]);
 const bookingRows=await db.session.count({where:{lecturerId:l.id,startsAt:raceTime,status:'SCHEDULED'}});checks.push({name:'Concurrent bookings reserve one lecturer slot once',at:new Date().toISOString(),passed:bookingRows===1&&bookingRace.filter(r=>r.status===201).length===1,response:{statuses:bookingRace.map(r=>r.status),sessions:bookingRows}});
 const farOld=await session(s,l,-72,'IN_PROGRESS');await check('Classroom late entry allowed','/livekit/token/'+farOld.id,'GET',undefined,l.token,200);
 const oldCancel=await session(s,l,-96,'CANCELED');await check('Reopen late classroom allowed','/livekit/token/'+oldCancel.id+'?reopen=true','GET',undefined,l.token,200);
 await db.supportTicket.update({where:{id:ticket.id},data:{status:'RESOLVED',resolvedAt:new Date()}});
 await check('Support resolved ticket reopens on lecturer reply','/support/tickets/'+ticket.id+'/messages','POST',{message:'QA further assistance'},l.token,201,d=>d.status==='IN_REVIEW'&&d.resolvedAt===null);
 const note=await db.notification.create({data:{userId:l.id,type:'QA_TEST',channel:'IN_APP',payloadJson:{title:'QA notification'}}});
 await check('Own notifications read','/notifications','GET',undefined,l.token,200,d=>d.every(n=>n.userId===l.id));
 await check('Anonymous notifications denied','/notifications','GET',undefined,undefined,401);
 await check('Unread notifications count','/notifications/unread-count','GET',undefined,l.token,200,d=>Number.isInteger(d.count));
 await check('Foreign notification cannot mark read','/notifications/'+note.id+'/read','PATCH',{},o.token,[403,404]);
 await check('Own notification mark read','/notifications/'+note.id+'/read','PATCH',{},l.token,200,async()=>!!(await db.notification.findUnique({where:{id:note.id}})).readAt);
 await check('All own notifications read','/notifications/mark-all-read','PATCH',{},l.token,204);
 await check('Unread now zero','/notifications/unread-count','GET',undefined,l.token,200,d=>d.count===0);
 await check('Reset revokes prior lecturer token','/auth/me','GET',undefined,suspended.token,401);
 await check('Old lecturer password rejected after reset','/auth/login','POST',{email:suspended.email,password},undefined,401);
 await check('New lecturer password works','/auth/login','POST',{email:suspended.email,password:'UpdatedLecturerQA!'},undefined,201);
 await progress(s,courses[0]);await db.session.update({where:{id:upcoming.id},data:{status:'SCHEDULED'}});await db.session.update({where:{id:completed.id},data:{status:'COMPLETED'}});
 await db.message.create({data:{senderId:s.id,recipientId:l.id,threadId:[s.id,l.id].sort().join('_'),content:'x'.repeat(10001)}});
 await db.sessionBlock.create({data:{studentId:s.id,lecturerId:l.id,status:'COMPLETED',payoutAmountLkr:750,completedAt:date(-12)}});
 await fs.writeFile(path.join(out,'api-results.json'),JSON.stringify({checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length},null,2));
 console.log('API SUMMARY '+JSON.stringify({total:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length}));
}
async function cleanup(){if(db){await db.user.deleteMany({where:{id:{in:users}}});await db.learningPath.deleteMany({where:{id:{in:paths}}});}if(app)await app.close();if(dir)await fs.rm(dir,{recursive:true,force:true});await fs.rm(path.join(out,'fixtures.json'),{force:true});}
async function main(){await setup();await run();if(process.argv.includes('--serve')){console.log('QA READY');for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await cleanup();process.exit(0)});}else{await cleanup();process.exitCode=checks.some(c=>!c.passed)?1:0;}}
main().catch(async error=>{console.error(error);await cleanup();process.exit(1)});
