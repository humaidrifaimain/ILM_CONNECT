const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).hostname !== '127.0.0.1') throw new Error('Use an isolated local database');
process.env.NODE_ENV = 'test';
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const db = new PrismaService();
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'output/playwright/student-changes-qa-2026-10-06');
const fixture = JSON.parse(fs.readFileSync(path.join(output, 'fixtures.json')));
const feature = JSON.parse(fs.readFileSync(path.join(output, 'feature-fixture.json')));
const cli = path.join(os.homedir(), '.codex/skills/playwright/scripts/playwright_cli.sh');
const cases=process.argv.find(argument=>argument.startsWith('--cases='))?.slice(8).split(',');
const results = cases ? JSON.parse(fs.readFileSync(path.join(output,'feature-browser-results.json'))).filter(row=>!cases.includes(row.name)) : [];
function run(name, source) {
  if(cases&&!cases.includes(name))return;
  let result;
  try {
    const stdout = execFileSync('bash', [cli, '-s=student-changes', 'run-code', `async page => { ${source} }`], { cwd: root, encoding: 'utf8', timeout: 90000 });
    fs.writeFileSync(path.join(output, `${name}.log`), stdout);
    const match = stdout.match(/### Result\n([\s\S]*?)\n### Ran Playwright code/);
    if (!match) throw new Error(stdout);
    result = JSON.parse(match[1]);
  } catch (error) {
    result = { passed: false, error: String(error.stdout || error.message).slice(-2500) };
  }
  results.push({ name, time: new Date().toISOString(), ...result });
  fs.writeFileSync(path.join(output, 'feature-browser-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ name, ...result }));
}
const login = person => `
  await page.context().clearCookies();await page.evaluate(()=>localStorage.clear());await page.goto('http://localhost:3000/auth/signin',{waitUntil:'load'});
  await page.getByRole('textbox',{name:'Email address',exact:true}).fill(${JSON.stringify(person.email)});
  await page.getByRole('textbox',{name:'Password',exact:true}).fill(${JSON.stringify(fixture.password)});
  await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL('**/student/dashboard',{waitUntil:'domcontentloaded'});
`;
async function main() {
  run('signup-demographics-browser', `
    const profile=await page.evaluate(async()=>{const response=await fetch('http://localhost:3002/api/v1/profile/student',{headers:{Authorization:'Bearer '+localStorage.getItem('ilm_token')}});return response.json();});
    const user=await page.evaluate(async()=>{const response=await fetch('http://localhost:3002/api/v1/auth/me',{headers:{Authorization:'Bearer '+localStorage.getItem('ilm_token')}});return response.json();});
    await page.getByText('Welcome Back QA',{exact:false}).first().waitFor();
    await page.screenshot({path:${JSON.stringify(path.join(output, 'signup-mobile-complete.png'))},fullPage:true});
    return {passed:profile.preferredHours?.join(',')==='10,11,12,13'&&user.gender==='MALE'&&user.dateOfBirth?.startsWith('2000-01-01'),hours:profile.preferredHours,gender:user.gender,dateOfBirth:user.dateOfBirth};
  `);
  run('availability-profile-save-reload', `
    ${login(feature)}
    await page.goto('http://localhost:3000/student/settings',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Change available times',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'When can you attend lessons?'});await dialog.waitFor();
    await dialog.getByRole('checkbox',{name:/Evening/}).uncheck();
    const emptyDisabled=await dialog.getByRole('button',{name:'Confirm availability'}).isDisabled();
    await dialog.getByRole('checkbox',{name:/Morning/}).check();await dialog.getByRole('button',{name:'Confirm availability'}).click();await dialog.waitFor({state:'hidden'});
    await page.reload({waitUntil:'domcontentloaded'});await page.getByText('10:00 AM to 2:00 PM',{exact:true}).waitFor();
    return {passed:emptyDisabled,emptyDisabled};
  `);
  run('availability-save-error-preserves-dialog', `
    await page.getByRole('button',{name:'Change available times',exact:true}).click();
    await page.route('**/api/v1/profile/student',route=>route.request().method()==='PUT'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA availability temporarily unavailable'})}):route.fallback());
    const dialog=page.getByRole('dialog',{name:'When can you attend lessons?'});
    await dialog.getByRole('checkbox',{name:/Afternoon/}).check();await dialog.getByRole('button',{name:'Confirm availability'}).click();
    await dialog.getByRole('alert').filter({hasText:'QA availability temporarily unavailable'}).waitFor();
    const kept=await dialog.getByRole('checkbox',{name:/Afternoon/}).isChecked();
    await page.unroute('**/api/v1/profile/student');
    await dialog.getByRole('button',{name:'Confirm availability'}).click();await dialog.waitFor({state:'hidden'});
    return {passed:kept,selectionPreserved:kept};
  `);
  run('course-request-browser', `
    await page.goto('http://localhost:3000/student/courses',{waitUntil:'domcontentloaded'});
    const request=page.getByRole('button',{name:'Request course',exact:true}).first();await request.waitFor();await request.click();
    await page.getByText('Awaiting lecturer review',{exact:false}).first().waitFor();
    const api=await page.evaluate(async()=>{const r=await fetch('http://localhost:3002/api/v1/curriculum/requests',{headers:{Authorization:'Bearer '+localStorage.getItem('ilm_token')}});return r.json();});
    return {passed:api.length===1&&api[0].status==='PENDING',count:api.length,status:api[0]?.status};
  `);
  run('regional-pricing-browser', `
    await page.goto('http://localhost:3000/student/billing?plan=beginner-qaida-standard',{waitUntil:'domcontentloaded'});
    const selector=page.getByRole('combobox',{name:'Country and pricing currency',exact:true});await selector.waitFor();
    await selector.selectOption('LKR');await page.getByText(/12,000/).first().waitFor();
    await selector.selectOption('USD');await page.getByText('$59.00',{exact:false}).first().waitFor();
    const converted=await page.evaluate(async()=>{const response=await fetch('http://localhost:3002/api/v1/subscriptions/plans');const plans=await response.json();return new Intl.NumberFormat('en',{style:'currency',currency:'GBP'}).format(plans.find(plan=>plan.id==='beginner-qaida-standard').prices.GBP);});
    await selector.selectOption('GBP');await page.getByText(converted,{exact:false}).first().waitFor();
    await page.reload({waitUntil:'domcontentloaded'});await selector.waitFor();
    return {passed:await selector.inputValue()==='GBP',persisted:await selector.inputValue()};
  `);
  run('existing-student-availability-prompt', `
    ${login(fixture.student)}
    const dialog=page.getByRole('dialog',{name:'When can you attend lessons?'});await dialog.waitFor();
    await dialog.getByRole('checkbox',{name:/Morning/}).check();await dialog.getByRole('button',{name:'Confirm availability'}).click();await dialog.waitFor({state:'hidden'});
    await page.getByRole('heading',{name:'Assigned Lecturer'}).waitFor();return {passed:true};
  `);
  for (const width of [390,1440]) for (const [route,text,name] of [
    ['/student/dashboard','Assigned Lecturer','dashboard'],['/student/settings','Lesson availability','settings'],
    ['/student/courses','Course progress:','courses'],['/student/billing','Payment & Subscription History','billing'],
    [`/student/courses/${fixture.learningPathId}/sessions`,'Quran Session','sessions'],
  ]) run(`${name}-${width}`, `
    await page.setViewportSize({width:${width},height:900});await page.goto(${JSON.stringify('http://localhost:3000'+route)},{waitUntil:'domcontentloaded'});
    await page.getByText(${JSON.stringify(text)},{exact:false}).first().waitFor();
    await page.evaluate(async()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
    await page.addScriptTag({path:'/tmp/ilm-student-qa-tools/node_modules/axe-core/axe.min.js'});
    const violations=await page.evaluate(async()=>(await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag22aa']}})).violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)})));
    const overflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
    await page.screenshot({path:${JSON.stringify(path.join(output, `${name}-${width}.png`))},fullPage:true});
    return {passed:overflow.width<=overflow.viewport&&violations.length===0,overflow,violations};
  `);
  run('classroom-timer-waits-for-lecturer', `
    await page.goto('http://localhost:3000/student/courses/${fixture.learningPathId}/sessions/${fixture.live.id}/room',{waitUntil:'domcontentloaded'});
    const enter=page.getByRole('button',{name:'Enter classroom',exact:true});await enter.waitFor();await enter.click();
    await page.getByRole('timer',{name:'Lesson elapsed time'}).filter({hasText:'Waiting for lecturer'}).waitFor();return {passed:true};
  `);
  if(!cases||cases.includes('classroom-extension-warning')){
    await fetch(`http://localhost:3004/api/v1/livekit/start/${fixture.live.id}`, { method:'POST', headers:{Authorization:`Bearer ${fixture.lecturer.token}`} });
    await db.session.update({ where:{id:fixture.live.id}, data:{meetingStartedAt:new Date(Date.now()-40*60000-5000)} });
  }
  run('classroom-extension-warning', `
    const dialog=page.getByRole('dialog',{name:'Five-minute extension'});await dialog.waitFor({timeout:15000});
    await dialog.getByRole('button',{name:'Continue lesson'}).click();await dialog.waitFor({state:'hidden'});return {passed:true};
  `);
  if(!cases||cases.includes('classroom-auto-leave-at-expiry'))await db.session.update({ where:{id:fixture.live.id}, data:{meetingStartedAt:new Date(Date.now()-46*60000)} });
  run('classroom-auto-leave-at-expiry', `
    await page.waitForURL('**/feedback?**',{waitUntil:'domcontentloaded',timeout:15000});return {passed:!page.url().includes('/room'),url:page.url()};
  `);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await db.$disconnect();if(results.some(row=>!row.passed))process.exitCode=1;});
