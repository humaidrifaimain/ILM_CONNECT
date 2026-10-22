const fs=require('node:fs/promises');const path=require('node:path');
const {chromium}=require('/Users/humaid/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const results=[];const base='http://localhost:3003';
(async()=>{const f=JSON.parse(await fs.readFile(path.resolve(__dirname,'../../output/playwright/lecturer-qa/fixtures.json')));const browser=await chromium.launch({headless:true});
const context=await browser.newContext({timezoneId:'Asia/Colombo',viewport:{width:1440,height:1000}});const p=await context.newPage();p.setDefaultTimeout(20000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
const check=(name,passed,details={})=>{results.push({name,at:new Date().toISOString(),passed,...details});console.log(JSON.stringify(results.at(-1)));};
try{
await p.goto(base+'/auth/signin');await p.getByRole('textbox',{name:'Email address'}).fill(f.lecturer.email);await p.getByRole('textbox',{name:'Password',exact:true}).fill(f.password);await p.getByRole('button',{name:'Log in',exact:true}).click();await p.waitForURL('**/lecturer/dashboard');
await p.goto(base+'/lecturer/sessions/'+f.live.id+'/room');await p.getByRole('button',{name:'End Session',exact:true}).waitFor();await p.getByRole('timer',{name:'Lesson elapsed time'}).filter({hasText:/\d\d:\d\d:\d\d/}).waitFor();check('Classroom renders shared server timer',true);
await p.goto(base+'/lecturer/sessions');await p.getByRole('button',{name:/^list$/i}).click();await p.getByText('Scheduled',{exact:true}).first().waitFor();check('Session list retains explicit status labels',true);
let expired=false;await p.route('**/api/v1/livekit/start/'+f.live.id,async r=>{const now=Date.now();const start=now-(expired?45*60000+1000:40*60000+1000);await r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({serverNow:new Date(now),meetingStartedAt:new Date(start),warningAt:new Date(start+40*60000),meetingEndsAt:new Date(start+45*60000),status:expired?'COMPLETED':'IN_PROGRESS',expired})});});
await p.goto(base+'/lecturer/sessions/'+f.live.id+'/room');const dialog=p.getByRole('dialog',{name:'Five-minute extension'});await dialog.waitFor();check('Forty-minute warning appears',await dialog.getByRole('timer',{name:'Time remaining'}).count()===1);await dialog.getByRole('button',{name:'Continue lesson'}).click();await dialog.waitFor({state:'hidden'});check('Lecturer dismisses extension and stays in classroom',await p.getByRole('button',{name:'End Session',exact:true}).isVisible());
expired=true;await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForURL('**/lecturer/sessions',{timeout:15000});check('Forty-five-minute expiry exits classroom',true);
check('No browser runtime exceptions',errors.length===0,{errors});
}catch(e){check('Changed classroom browser execution',false,{error:e.message});}
finally{await p.screenshot({path:path.resolve(__dirname,'../../output/playwright/lecturer-qa-oct6/changed-browser.png'),fullPage:true});await fs.writeFile(path.resolve(__dirname,'../../output/playwright/lecturer-qa-oct6/changed-browser-results.json'),JSON.stringify(results,null,2));await browser.close();}
process.exitCode=results.some(r=>!r.passed)?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
