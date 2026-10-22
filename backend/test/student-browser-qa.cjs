const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'output/playwright/student-qa');
const fixture = JSON.parse(fs.readFileSync(path.join(output, 'fixtures.json'), 'utf8'));
const cli = path.join(os.homedir(), '.codex/skills/playwright/scripts/playwright_cli.sh');
const only=process.argv.find(argument=>argument.startsWith('--only='))?.slice(7);
const cases=process.argv.find(argument=>argument.startsWith('--cases='))?.slice(8).split(',');
const results = only ? JSON.parse(fs.readFileSync(path.join(output,'browser-survey.json'),'utf8')).filter(item=>!item.name.startsWith(only+'-')) : cases&&(process.argv.includes('--edges')||process.argv.includes('--fixes')) ? JSON.parse(fs.readFileSync(path.join(output,process.argv.includes('--fixes')?'browser-fix-verification.json':'browser-edges.json'),'utf8')).filter(item=>!cases.includes(item.name)) : [];
function run(name, code) {
  if(cases&&!cases.includes(name))return;
  const start = new Date().toISOString();
  let result;
  try {
    const stdout = execFileSync('bash', [cli, `-s=${process.env.STUDENT_QA_BROWSER_SESSION || 'student-qa'}`, 'run-code', `async page => { ${code} }`], { cwd: root, encoding: 'utf8', timeout: 90000 });
    fs.writeFileSync(path.join(output, `${name}.log`), stdout);
    const match = stdout.match(/### Result\n([\s\S]*?)\n### Ran Playwright code/);
    if (!match) throw new Error(stdout);
    result = JSON.parse(match[1]);
  } catch (error) {
    const evidence=String(error.stdout||error.message);
    fs.writeFileSync(path.join(output, `${name}.log`),evidence);
    result = { passed: false, error: evidence.slice(-3000) };
  }
  results.push({ name, start, ...result });
  const filename=process.argv.includes('--fixes')?'browser-fix-verification.json':process.argv.includes('--edges')?'browser-edges.json':process.argv.includes('--interactions')?'browser-interactions.json':'browser-survey.json';
  fs.writeFileSync(path.join(output, filename), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ name, passed: result.passed, violations: result.violations?.map(item => item.id), overflow: result.overflow, error: result.error }));
  return result;
}
const course = fixture.learningPathId;
const routes = [
  ['/student/dashboard', 'Assigned Lecturer', 'dashboard'],
  ['/student/courses', 'Course progress:', 'courses'],
  ['/student/billing', 'Payment & Subscription History', 'billing'],
  ['/student/support?tab=contact', 'Contact Support Desk', 'support'],
  ['/student/settings', 'Account security', 'settings'],
  ['/student/messages', 'Inbox', 'messages'],
  [`/student/courses/${course}/materials`, 'Unlocked', 'materials'],
  [`/student/courses/${course}/sessions`, 'Quran Session', 'sessions'],
  [`/student/courses/${course}/sessions/book`, 'Select available time slots', 'booking'],
  [`/student/courses/${course}/assessments`, 'QA Recitation Result', 'assessments'],
  [`/student/courses/${course}/awards`, 'QA issued certificate', 'awards'],
  [`/student/courses/${course}/feedback`, 'How was your lesson?', 'feedback'],
];
if (!process.argv.includes('--interactions')&&!process.argv.includes('--edges')&&!process.argv.includes('--fixes')) for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
  for (const [route, expected, label] of routes) {
    if(only&&label!==only)continue;
    const name = `${label}-${viewport.width}`;
    run(name, `
      const errors=[]; const onError=error=>errors.push(error.message); page.on('pageerror',onError);
      await page.setViewportSize(${JSON.stringify(viewport)});
      await page.goto(${JSON.stringify('http://localhost:3000'+route)}, {waitUntil:'domcontentloaded'});
      await page.getByText(${JSON.stringify(expected)}, {exact:false}).first().waitFor({timeout:25000});
      ${label==='messages'?`await page.getByRole('button',{name:/QA Assigned Scholar/}).first().waitFor();${viewport.width>1000?`await page.getByRole('textbox',{name:'Type a message... (Enter to send)'}).waitFor();`:''}`:''}
      await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));});
      await page.addScriptTag({path:'/tmp/ilm-student-qa-tools/node_modules/axe-core/axe.min.js'});
      const axe=await page.evaluate(async()=>window.axe.run(document.querySelector('main'), {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag22aa']}}));
      const overflow=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
      const text=await page.locator('body').innerText();
      const links=await page.getByRole('link').evaluateAll(elements=>elements.filter(element=>element.getBoundingClientRect().width>0).map(element=>({name:element.textContent||element.getAttribute('aria-label'),href:element.getAttribute('href')})));
      await page.screenshot({path:${JSON.stringify(path.join(output,name+'.png'))},fullPage:true});
      page.off('pageerror',onError);
      return {passed:page.url().includes(${JSON.stringify(route.split('?')[0])})&&text.includes(${JSON.stringify(expected)})&&errors.length===0&&overflow.scrollWidth<=overflow.viewport, url:page.url(),errors,overflow,links,text:text.slice(0,6000),snapshot:await page.locator('body').ariaSnapshot(),violations:axe.violations.map(item=>({id:item.id,impact:item.impact,description:item.description,nodes:item.nodes.map(node=>({target:node.target,html:node.html,failureSummary:node.failureSummary}))}))};
    `);
  }
}
if(process.argv.includes('--fixes')) {
  for(const width of [320,390,768,1440])run('fixed-dashboard-'+width,`
    await page.setViewportSize({width:${width},height:1000});
    await page.goto('http://localhost:3000/student/dashboard',{waitUntil:'domcontentloaded'});
    await page.getByRole('heading',{name:'Assigned Lecturer'}).waitFor();
    await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));});
    const overflow=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    let nav=1;if(${width}<1024){const summary=page.locator('summary').filter({hasText:'Menu'});if(!(await summary.evaluate(element=>element.parentElement.open)))await summary.click();nav=await page.getByRole('navigation',{name:'Student pages'}).count();await page.getByRole('navigation',{name:'Student pages'}).getByRole('link',{name:'Settings',exact:true}).waitFor();}
    await page.screenshot({path:${JSON.stringify(path.join(output,'fixed-dashboard-'+width+'.png'))},fullPage:true});
    return {passed:overflow.scrollWidth<=overflow.viewport&&nav===1,overflow,nav};
  `);
  run('fixed-sessions-keyboard-dialog',`
    await page.setViewportSize({width:1440,height:1000});
    await page.goto('http://localhost:3000/student/courses/${course}/sessions');
    await page.getByRole('button',{name:'List',exact:true}).click();
    const details=page.getByRole('button',{name:/Open session details/}).first();
    await details.focus();await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'Session details'}).waitFor();
    await page.keyboard.press('Escape');
    const restored=await details.evaluate(element=>element===document.activeElement);
    await page.getByRole('button',{name:'Reschedule',exact:true}).last().click();
    const dialog=page.getByRole('dialog',{name:'Reschedule session'});await dialog.waitFor();
    await page.getByRole('button',{name:'Confirm New Time'}).waitFor();
    let trapped=true;for(let i=0;i<15;i++){await page.keyboard.press('Tab');trapped=trapped&&await dialog.evaluate(element=>element.contains(document.activeElement));}
    await page.keyboard.press('Escape');return {passed:restored&&trapped&&await page.getByRole('dialog').count()===0,restored,trapped};
  `);
  for(const item of [{name:'sessions',pattern:'**/api/v1/bookings/student',url:`/student/courses/${course}/sessions`,message:'Your sessions could not be loaded.'},{name:'materials',pattern:'**/api/v1/curriculum/paths',url:`/student/courses/${course}/materials`,message:'Course materials could not be loaded.'}])run('fixed-'+item.name+'-outage',`
    await page.route(${JSON.stringify(item.pattern)},route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA forced outage'})}));
    try{await page.goto(${JSON.stringify('http://localhost:3000'+item.url)});await page.getByRole('alert').filter({hasText:${JSON.stringify(item.message)}}).waitFor();
      await page.unroute(${JSON.stringify(item.pattern)});await page.getByRole('button',{name:'Try again',exact:true}).click();
      await page.getByText(${JSON.stringify(item.message)},{exact:true}).waitFor({state:'hidden'});return {passed:true};
    }finally{await page.unroute(${JSON.stringify(item.pattern)});}
  `);
  run('fixed-early-classroom',`
    await page.goto('http://localhost:3000/student/courses/${course}/sessions/${fixture.upcoming.id}/room',{waitUntil:'domcontentloaded'});
    await page.getByRole('alert').filter({hasText:'30 minutes'}).waitFor();const disabled=await page.getByRole('button',{name:'Enter classroom',exact:true}).isDisabled();
    await page.addScriptTag({path:'/tmp/ilm-student-qa-tools/node_modules/axe-core/axe.min.js'});
    const violations=await page.evaluate(async()=>(await window.axe.run(document.body,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag22aa']}})).violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})));
    return {passed:disabled&&violations.length===0,disabled,violations};
  `);
}
if(process.argv.includes('--edges')) {
  const login=person=>`
    await page.context().clearCookies();
    await page.evaluate(()=>localStorage.clear());
    await page.goto('http://localhost:3000/auth/signin');
    await page.evaluate(()=>localStorage.clear());
    await page.getByRole('textbox',{name:'Email address'}).fill(${JSON.stringify(person.email)});
    await page.getByRole('textbox',{name:'Password',exact:true}).fill(${JSON.stringify(fixture.password)});
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await page.waitForURL('**/student/dashboard');
  `;
  if(cases)run('active-student-login',`${login(fixture.student)} return {passed:true};`);
  run('support-history-corrected-locator', `
    await page.setViewportSize({width:1440,height:1000});
    await page.goto('http://localhost:3000/student/support?tab=tickets');
    await page.getByRole('button',{name:/^My Tickets/}).click();
    await page.getByRole('row').filter({hasText:'QA browser help request'}).first().waitFor();
    await page.getByRole('row').filter({hasText:'QA browser help request'}).first().click();
    await page.getByPlaceholder('Type a reply message to Academic Support...').fill('QA browser support reply');
    const pending=page.waitForResponse(response=>response.url().includes('/support/tickets/')&&response.request().method()==='POST');
    await page.getByRole('button',{name:/Send Reply|Send Message|Send reply/}).click();
    const response=await pending;const data=await response.json();
    return {passed:response.status()===201&&data.messages.some(message=>message.message==='QA browser support reply'),dialogCount:await page.getByRole('dialog').count(),snapshot:await page.locator('body').ariaSnapshot()};
  `);
  run('collapsed-sidebar-accessible-name', `
    await page.setViewportSize({width:1440,height:1000});
    await page.goto('http://localhost:3000/student/settings');
    await page.getByRole('complementary').first().getByRole('button').waitFor();
    if(await page.getByRole('button',{name:'Collapse',exact:true}).isVisible())await page.getByRole('button',{name:'Collapse',exact:true}).click();
    const button=page.getByRole('complementary').first().getByRole('button');
    const snapshot=await button.ariaSnapshot();
    await button.focus();await page.keyboard.press('Enter');
    return {passed:!/^\s*- button\s*$/.test(snapshot),snapshot,expanded:await page.getByRole('link',{name:'Settings',exact:true}).isVisible()};
  `);
  run('calendar-mode-persistence', `
    await page.goto('http://localhost:3000/student/courses/${course}/sessions');
    await page.getByRole('button',{name:'Calendar',exact:true}).click();
    await page.getByRole('region').waitFor();
    await page.reload();await page.getByRole('region').waitFor();
    const mode=await page.evaluate(()=>localStorage.getItem('ilm-sessions-view'));
    await page.getByRole('button',{name:'List',exact:true}).click();
    return {passed:mode==='calendar'};
  `);
  run('reschedule-modal-focus', `
    await page.getByRole('button',{name:'Reschedule',exact:true}).last().click();
    await page.getByRole('button',{name:'Confirm New Time'}).waitFor();
    await page.getByRole('button',{name:'Confirm New Time'}).focus();
    await page.keyboard.press('Tab');
    const focused=await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent,href:document.activeElement?.getAttribute('href')}));
    const dialogCount=await page.getByRole('dialog').count();
    await page.keyboard.press('Escape');
    return {passed:dialogCount>0&&focused.href!=='/student/messages',dialogCount,focused,escapeClosed:await page.getByRole('button',{name:'Confirm New Time'}).count()===0};
  `);
  const booked=JSON.parse(fs.readFileSync(path.join(output,'browser-interactions.json'),'utf8')).find(item=>item.name==='browser-booking')?.booking;
  if(booked?.id)run('browser-cancel-booked-session', `
    await page.goto('http://localhost:3000/student/courses/${course}/sessions');
    const target=page.locator('div.cursor-pointer.flex-col').filter({has:page.locator('a[href$="/${booked.id}/room"]')});
    await target.click();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByRole('heading',{name:'Cancel Session?',exact:true}).waitFor();
    const pending=page.waitForResponse(response=>response.url().endsWith('/bookings/${booked.id}')&&response.request().method()==='DELETE');
    await page.getByRole('button',{name:'Confirm Cancel',exact:true}).click();const response=await pending;const data=await response.json();
    return {passed:response.status()===200&&data.status==='CANCELED'};
  `);
  run('session-read-error-is-not-empty-state', `
    await page.route('**/api/v1/bookings/student',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA forced outage'})}));
    try{await page.goto('http://localhost:3000/student/courses/${course}/sessions');
      await page.getByText('No sessions booked',{exact:true}).waitFor({timeout:20000});
      const text=await page.locator('body').innerText();
      return {passed:!text.includes('No sessions booked'),text};
    }finally{await page.unroute('**/api/v1/bookings/student');}
  `);
  run('curriculum-error-is-not-empty-state', `
    await page.route('**/api/v1/curriculum/paths',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA forced outage'})}));
    try{await page.goto('http://localhost:3000/student/courses/${course}/materials');
      await page.getByText('No course materials are available yet.',{exact:true}).waitFor({timeout:20000});
      const text=await page.locator('body').innerText();
      return {passed:!text.includes('No course materials are available yet.'),text};
    }finally{await page.unroute('**/api/v1/curriculum/paths');}
  `);
  run('classroom-early-entry-ui', `
    await page.goto('http://localhost:3000/student/courses/${course}/sessions/${fixture.upcoming.id}/room');
    await page.getByRole('button',{name:'Enter classroom',exact:true}).waitFor();
    return {passed:!(await page.getByRole('button',{name:'Enter classroom',exact:true}).isEnabled()),text:await page.locator('body').innerText()};
  `);
  run('classroom-media-off-and-leave', `
    await page.goto('http://localhost:3000/student/courses/${course}/sessions/${fixture.live.id}/room');
    await page.getByRole('button',{name:'Turn microphone off',exact:true}).click();
    await page.getByRole('button',{name:'Turn camera off',exact:true}).click();
    await page.getByRole('button',{name:'Enter classroom',exact:true}).click();
    await page.getByRole('button',{name:'Leave Class',exact:true}).waitFor();
    await page.getByRole('button',{name:'Leave Class',exact:true}).click();
    await page.waitForURL('**/feedback?*');await page.getByRole('dialog').waitFor();
    await page.getByRole('dialog').getByRole('button',{name:'Review later',exact:true}).click();
    return {passed:page.url().includes('/feedback?')&&await page.getByRole('dialog').count()===0,transport:'simulation; microphone and camera disabled'};
  `);
  run('missing-classroom-error', `
    await page.goto('http://localhost:3000/student/courses/${course}/sessions/missing-session/room');
    await page.getByRole('button',{name:'Turn microphone off',exact:true}).click();
    await page.getByRole('button',{name:'Turn camera off',exact:true}).click();
    await page.getByRole('button',{name:'Enter classroom',exact:true}).click();
    await page.getByRole('heading',{name:'LiveKit Connection Notice',exact:true}).waitFor();
    return {passed:await page.getByRole('button',{name:'Retry',exact:true}).isVisible(),text:await page.locator('body').innerText()};
  `);
  run('expired-trial-gate-and-keyboard', `
    ${login(fixture.expired)}
    await page.getByRole('dialog',{name:'Your trial has ended'}).waitFor();
    await page.keyboard.press('Escape');
    const stillBlocked=await page.getByRole('dialog',{name:'Your trial has ended'}).isVisible();
    await page.screenshot({path:${JSON.stringify(path.join(output,'expired-trial-gate.png'))},fullPage:true});
    return {passed:stillBlocked&&await page.getByRole('link',{name:/Continue with/}).count()===3,links:await page.getByRole('dialog').getByRole('link').evaluateAll(links=>links.map(link=>({name:link.getAttribute('aria-label')||link.textContent,href:link.getAttribute('href')})))};
  `);
  run('expired-plan-selection-does-not-unlock', `
    await page.getByRole('link',{name:/Continue with/}).first().click();
    await page.getByText('Online payment is not connected yet.',{exact:false}).waitFor();
    await page.goto('http://localhost:3000/student/settings');
    await page.getByRole('dialog',{name:'Your trial has ended'}).waitFor();
    return {passed:await page.getByRole('dialog',{name:'Your trial has ended'}).isVisible()};
  `);
  run('expired-student-support-access', `
    await page.getByRole('link',{name:'Subscription support',exact:true}).click();
    await page.getByRole('heading',{name:'Contact Support Desk'}).waitFor();
    return {passed:await page.getByRole('dialog').count()===0&&page.url().includes('/student/support')};
  `);
  run('subscription-outage-fails-closed-and-recovers', `
    ${login(fixture.student)}
    await page.getByRole('heading',{name:'Assigned Lecturer'}).waitFor();
    await page.route('**/api/v1/subscriptions/access',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA forced outage'})}));
    try{await page.goto('http://localhost:3000/student/dashboard');
      await page.getByText('Unable to verify your subscription. Please try again.',{exact:true}).waitFor();
      const blocked=await page.getByRole('heading',{name:'Assigned Lecturer'}).count()===0;
      await page.unroute('**/api/v1/subscriptions/access');
      await page.getByRole('button',{name:'Try again',exact:true}).click();
      await page.getByRole('heading',{name:'Assigned Lecturer'}).waitFor();
      return {passed:blocked};
    }finally{await page.unroute('**/api/v1/subscriptions/access');}
  `);
  for(const width of [320,768])run('dashboard-overflow-'+width, `
    await page.setViewportSize({width:${width},height:900});
    await page.goto('http://localhost:3000/student/dashboard');
    await page.getByRole('heading',{name:'Assigned Lecturer'}).waitFor();
    const overflow=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    await page.screenshot({path:${JSON.stringify(path.join(output,'dashboard-'+width+'.png'))},fullPage:true});
    return {passed:overflow.scrollWidth<=overflow.viewport,overflow};
  `);
  run('logout-clears-session-and-protected-page', `
    await page.getByRole('button',{name:'Logout',exact:true}).click();await page.waitForURL('**/auth/signin');
    const cookies=await page.context().cookies();
    const storage=await page.evaluate(()=>({token:localStorage.getItem('ilm_token'),user:localStorage.getItem('ilm_user')}));
    await page.goto('http://localhost:3000/student/settings');await page.waitForURL('**/auth/signin');
    return {passed:!cookies.some(cookie=>cookie.name==='session')&&!storage.token&&!storage.user&&page.url().endsWith('/auth/signin')};
  `);
  run('reset-link-missing-token', `
    await page.goto('http://localhost:3000/auth/reset-password');await page.getByText('This reset link is incomplete.',{exact:false}).waitFor();
    return {passed:await page.getByRole('button',{name:'Update password'}).count()===0};
  `);
  run('forgot-password-provider-unavailable', `
    await page.goto('http://localhost:3000/auth/forgot-password');
    await page.getByRole('textbox').fill(${JSON.stringify(fixture.student.email)});
    await page.getByRole('button',{name:/Send reset link/i}).click();
    await page.getByText('Password reset email is not configured. Please contact support.',{exact:true}).waitFor();
    return {passed:true,externalDelivery:'not tested; provider deliberately disabled'};
  `);
}
if (process.argv.includes('--interactions')) {
  run('mobile-navigation', `
    await page.goto('http://localhost:3000/student/dashboard');
    await page.getByRole('heading',{name:'Assigned Lecturer'}).waitFor();
    const links=await page.getByRole('link').evaluateAll(elements=>elements.filter(element=>element.getBoundingClientRect().width>0).map(element=>({name:element.textContent||element.getAttribute('aria-label'),href:element.getAttribute('href')})));
    const missing=['/student/courses','/student/settings','/student/support','/student/billing'].filter(href=>!links.some(link=>link.href===href));
    return {passed:missing.length===0,missing,links};
  `);
  run('desktop-sidebar-collapse', `
    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole('button',{name:'Collapse',exact:true}).click();
    await page.getByRole('button',{name:'Expand',exact:true}).waitFor();
    await page.getByRole('button',{name:'Expand',exact:true}).click();
    return {passed:await page.getByRole('link',{name:'Settings',exact:true}).isVisible()};
  `);
  run('materials-viewer-keyboard', `
    await page.goto('http://localhost:3000/student/courses/${course}/materials');
    await page.getByRole('button',{name:'View',exact:true}).waitFor();
    await page.getByRole('button',{name:'View',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor();
    const dialogText=await page.getByRole('dialog').innerText();
    await page.keyboard.press('Escape');
    return {passed:dialogText.includes('Alif to Khaa')&&await page.getByRole('dialog').count()===0,dialogText,focus:await page.evaluate(()=>document.activeElement?.textContent)};
  `);
  run('lesson-outline-download', `
    const pending=page.waitForEvent('download');
    await page.getByRole('button',{name:'Download outline for Alif to Khaa'}).click();
    const download=await pending;
    await download.saveAs(${JSON.stringify(path.join(output,'lesson-outline.txt'))});
    return {passed:download.suggestedFilename().endsWith('.txt'),filename:download.suggestedFilename()};
  `);
  run('shared-pdf-download', `
    await page.getByText('QA Browser Resource',{exact:true}).waitFor();
    const pending=page.waitForEvent('download');
    await page.getByRole('button',{name:'Download',exact:true}).click();
    const download=await pending; await download.saveAs(${JSON.stringify(path.join(output,'shared-resource.pdf'))});
    return {passed:download.suggestedFilename().endsWith('.pdf'),filename:download.suggestedFilename()};
  `);
  run('profile-save-and-reload', `
    await page.goto('http://localhost:3000/student/settings');
    await page.getByRole('textbox',{name:'Full name',exact:true}).fill('QA Browser Updated');
    const response=page.waitForResponse(response=>response.url().endsWith('/profile/student')&&response.request().method()==='PUT');
    await page.getByRole('button',{name:'Save changes'}).click(); const saved=await response;
    await page.reload(); await page.getByRole('textbox',{name:'Full name',exact:true}).waitFor();
    return {passed:saved.status()===200&&await page.getByRole('textbox',{name:'Full name',exact:true}).inputValue()==='QA Browser Updated'};
  `);
  run('profile-invalid-timezone', `
    await page.getByRole('textbox',{name:'Timezone',exact:true}).fill('Mars/Olympus');
    const response=page.waitForResponse(response=>response.url().endsWith('/profile/student')&&response.request().method()==='PUT');
    await page.getByRole('button',{name:'Save changes'}).click(); const saved=await response;
    await page.getByText('Save failed',{exact:true}).waitFor();
    return {passed:saved.status()===400&&await page.getByRole('textbox',{name:'Timezone',exact:true}).inputValue()==='Mars/Olympus',error:await saved.json()};
  `);
  run('feedback-save-reload', `
    await page.goto('http://localhost:3000/student/courses/${course}/feedback?sessionId=${fixture.completed.id}');
    await page.getByRole('combobox',{name:'Session',exact:true}).waitFor();
    await page.getByRole('combobox',{name:'Session',exact:true}).selectOption('${fixture.completed.id}');
    await page.getByRole('button',{name:/5 stars:/}).click();
    await page.getByRole('textbox',{name:'Write your review'}).fill('QA browser feedback persisted');
    const response=page.waitForResponse(response=>response.url().endsWith('/feedbacks')&&response.request().method()==='POST');
    await page.getByRole('button',{name:/Submit feedback|Update feedback/}).click(); const saved=await response;
    await page.reload(); await page.getByRole('button',{name:'Update feedback'}).waitFor();
    return {passed:saved.status()===201&&await page.getByRole('textbox',{name:'Write your review'}).inputValue()==='QA browser feedback persisted'};
  `);
  run('message-keyboard-send', `
    await page.goto('http://localhost:3000/student/messages');
    await page.getByRole('button',{name:/QA Assigned Scholar/}).click();
    await page.getByRole('textbox',{name:'Type a message... (Enter to send)'}).fill('QA browser keyboard message');
    const response=page.waitForResponse(response=>response.url().endsWith('/messages')&&response.request().method()==='POST');
    await page.keyboard.press('Enter'); const saved=await response;
    await page.getByText('QA browser keyboard message',{exact:true}).last().waitFor();
    return {passed:saved.status()===201&&await page.getByRole('textbox',{name:'Type a message... (Enter to send)'}).inputValue()===''};
  `);
  run('support-create-history', `
    await page.goto('http://localhost:3000/student/support?tab=contact');
    await page.getByRole('button',{name:'Submit Support Ticket'}).waitFor();
    const initiallyDisabled=await page.getByRole('button',{name:'Submit Support Ticket'}).isDisabled();
    await page.getByRole('combobox').selectOption('TECHNICAL_ISSUE');
    await page.getByPlaceholder('e.g. Video call disconnected during Tajweed lesson').fill('QA browser help request');
    await page.getByPlaceholder('Please provide specifics: when it happened, error messages, or what you need assistance with...').fill('QA temporary request for student testing');
    const response=page.waitForResponse(response=>response.url().endsWith('/support/request')&&response.request().method()==='POST');
    await page.getByRole('button',{name:'Submit Support Ticket'}).click(); const saved=await response;
    await page.getByText('Support Ticket Logged!',{exact:true}).waitFor();
    await page.getByRole('button',{name:/My Tickets/}).click();
    await page.getByText(/QA browser help request/).first().waitFor();
    return {passed:initiallyDisabled&&saved.status()===201};
  `);
  const booking=run('browser-booking', `
    await page.goto('http://localhost:3000/student/courses/${course}/sessions/book');
    await page.getByText('Select available time slots',{exact:false}).waitFor();
    await page.getByRole('button',{name:'Next week',exact:true}).click();
    const available=page.getByRole('button',{name:/Available session/}).filter({visible:true});
    await available.first().click();
    const response=page.waitForResponse(response=>response.url().endsWith('/bookings')&&response.request().method()==='POST');
    await page.getByRole('button',{name:'Confirm Booking (1)',exact:true}).click(); const saved=await response;
    const data=await saved.json();
    await page.getByRole('heading',{name:'Sessions Booked!'}).waitFor();
    return {passed:saved.status()===201,booking:data};
  `);
  if(booking.booking?.id) {
    run('browser-reschedule-dialog', `
      await page.goto('http://localhost:3000/student/courses/${course}/sessions');
      await page.getByRole('button',{name:'Reschedule',exact:true}).last().click();
      await page.getByRole('button',{name:'Confirm New Time'}).waitFor();
      const dialogCount=await page.getByRole('dialog').count();
      const focus=await page.evaluate(()=>document.activeElement?.textContent?.slice(0,100));
      return {passed:dialogCount>0,dialogCount,focus,snapshot:await page.locator('body').ariaSnapshot()};
    `);
  }
}
