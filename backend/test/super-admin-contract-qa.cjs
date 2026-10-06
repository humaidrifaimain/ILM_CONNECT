const fs=require('node:fs/promises'),path=require('node:path');
const {z}=require('../../frontend/node_modules/zod');
const out=path.resolve(__dirname,'../../output/super-admin-qa');
async function main(){const f=JSON.parse(await fs.readFile(path.join(out,'browser-fixtures.json'),'utf8')),results=[];
const person=z.object({id:z.string(),email:z.email(),role:z.enum(['STUDENT','LECTURER','ADMIN','SUPER_ADMIN']),status:z.enum(['PENDING','ACTIVE','SUSPENDED']),createdAt:z.iso.datetime()});
const schemas={
'/auth/me':z.object({id:z.string(),email:z.email(),role:z.literal('SUPER_ADMIN'),status:z.string()}),
'/admin/users':z.array(person.extend({studentProfile:z.object({fullName:z.string()}).nullable(),lecturerProfile:z.object({fullName:z.string(),status:z.string()}).nullable()})),
'/admin/stats':z.object(Object.fromEntries(['revenueThisMonth','mrrLKR','activeStudents','totalStudents','activeLecturers','pendingApplications','sessionsToday','sessionsThisWeek','payoutsThisMonth','profitThisMonth','unassignedStudents','lecturerChangeRequests','paymentFailures','avgRating'].map(k=>[k,z.number()]))).extend({mrrUSD:z.number().nullable(),churnRate:z.number().nullable()}),
'/admin/sessions':z.array(z.object({id:z.string(),startsAt:z.iso.datetime(),endsAt:z.iso.datetime(),status:z.enum(['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELED','NO_SHOW_STUDENT','NO_SHOW_LECTURER']),student:z.object({fullName:z.string()}),lecturer:z.object({fullName:z.string()})})),
'/admin/finance':z.object({payments:z.array(z.object({id:z.string(),amountLkr:z.number(),status:z.literal('SUCCESSFUL')})),payouts:z.array(z.object({id:z.string(),amountLkr:z.number(),status:z.enum(['PENDING','PROCESSING','SUCCESSFUL','FAILED']),completedAt:z.iso.datetime().nullable()})),revenueByPlan:z.array(z.object({tier:z.string(),revenue:z.number(),students:z.number()}))}),
'/admin/feedback':z.array(z.object({id:z.string(),score:z.number().min(1).max(5),comment:z.string().nullable(),student:z.object({fullName:z.string()}),lecturer:z.object({fullName:z.string()})})),
'/admin/audit-logs':z.array(z.object({id:z.string(),action:z.string(),actorId:z.string(),createdAt:z.iso.datetime()})),
'/admin/waitlist':z.array(z.object({id:z.string(),fullName:z.string(),email:z.email(),course:z.string(),createdAt:z.iso.datetime()})),
'/support/tickets':z.array(z.object({id:z.string(),status:z.enum(['PENDING','IN_REVIEW','RESOLVED']),messages:z.array(z.object({message:z.string(),senderId:z.string(),senderRole:z.string()}))})),
'/subscriptions/plans':z.array(z.object({id:z.string(),course:z.string(),tier:z.enum(['Standard','Fast Track']),monthlyUsd:z.number().min(.01).max(10000),sessions:z.number()})).length(6),
'/subscriptions/currencies':z.array(z.object({code:z.enum(['LKR','USD','GBP','EUR','AUD']),lkrPerUnit:z.number().positive(),rateDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)})).length(5)};
for(const [endpoint,schema]of Object.entries(schemas)){const start=Date.now(),r=await fetch('http://localhost:3002/api/v1'+endpoint,{headers:{Authorization:'Bearer '+f.admin.token}}),data=await r.json(),parsed=schema.safeParse(data),durationMs=Date.now()-start;results.push({name:'response contract '+endpoint,at:new Date().toISOString(),passed:r.status===200&&parsed.success,durationMs,status:r.status,issues:parsed.success?[]:parsed.error.issues});}
const finance=await (await fetch('http://localhost:3002/api/v1/admin/finance',{headers:{Authorization:'Bearer '+f.admin.token}})).json();results.push({name:'monthly plan revenue counts only successful payments',at:new Date().toISOString(),passed:finance.revenueByPlan.length===1&&finance.revenueByPlan[0].revenue===9000&&finance.revenueByPlan[0].students===1});
await fs.writeFile(path.join(out,'contract-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results}));process.exitCode=results.some(r=>!r.passed)?1:0;}
main().catch(e=>{console.error(e);process.exit(1)});
