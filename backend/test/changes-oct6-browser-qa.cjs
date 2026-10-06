const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const playwright = process.env.QA_PLAYWRIGHT_PATH || '/Users/humaid/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = require(playwright);
const { expect } = require(playwright + '/test');
const out = path.resolve(__dirname, '../../output/changes-qa-2026-10-06');
const base = 'http://localhost:3019';
let fixture, browser;
const results = [];
const selected = process.argv.find(argument => argument.startsWith('--only='))?.slice(7).split(',');
async function api(endpoint, method = 'GET', body, token = fixture.admin.token) {
  const response = await fetch('http://localhost:3009/api/v1' + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
async function login(page, person) {
  await page.goto(base + '/auth/signin');
  await page.getByRole('textbox', { name: 'Email address' }).fill(person.email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL('**/' + (person.role === 'SUPER_ADMIN' ? 'admin' : person.role.toLowerCase()) + '/dashboard');
}
async function test(name, run, person, width = 1440) {
  if (selected && !selected.includes(name)) return;
  const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Colombo', permissions: ['camera', 'microphone'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let result;
  try { if (person) await login(page, person); await run(page); result = { name, passed: true, errors }; }
  catch (error) { result = { name, passed: false, error: error.message, errors }; }
  result.at = new Date().toISOString();
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true }).catch(() => {});
  result.snapshot = await page.locator('body').ariaSnapshot().catch(() => '');
  results.push(result); await fs.writeFile(path.join(out, 'browser-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ name, passed: result.passed, error: result.error }));
  await context.close();
}
async function main() {
  fixture = JSON.parse(await fs.readFile(path.join(out, 'fixture.json'), 'utf8'));
  if (selected) results.push(...JSON.parse(await fs.readFile(path.join(out, 'browser-results.json'), 'utf8')).filter(result => !selected.includes(result.name)));
  browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try {
    await test('signup-availability-required', async page => {
      await page.goto(base + '/auth/signup');
      await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('QA Signup');
      await page.getByRole('combobox', { name: 'Gender', exact: true }).selectOption('PREFER_NOT_TO_SAY');
      await page.getByLabel('Date of birth', { exact: true }).fill('2000-01-01');
      await page.getByRole('textbox', { name: 'Email address' }).fill(`browser-qa-${crypto.randomUUID()}@example.test`);
      await page.getByRole('textbox', { name: 'Password', exact: true }).fill(fixture.password);
      await page.getByRole('checkbox', { name: /I agree/ }).check();
      await page.getByRole('button', { name: 'Create account', exact: true }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Choose at least one time window' })).toBeVisible();
      await page.getByRole('checkbox', { name: /Morning/ }).check();
      await expect(page.getByRole('alert').filter({ hasText: 'Choose at least one time window' })).toHaveCount(0);
    });
    for (const width of [1440, 390]) await test('signup-reflow-' + width, async page => {
      await page.goto(base + '/auth/signup');
      await expect(page.getByRole('checkbox', { name: /Evening/ })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }, null, width);
    await test('student-availability-save-reload', async page => {
      await api('/profile/student', 'PUT', { preferredHours: [18, 19, 20, 21] }, fixture.student.token);
      await page.goto(base + '/student/settings');
      await page.getByRole('button', { name: 'Change available times' }).click();
      const dialog = page.getByRole('dialog', { name: 'When can you attend lessons?' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('checkbox', { name: /Evening/ }).uncheck();
      await expect(dialog.getByRole('button', { name: 'Confirm availability' })).toBeDisabled();
      await dialog.getByRole('checkbox', { name: /Morning/ }).check();
      await dialog.getByRole('button', { name: 'Confirm availability' }).click();
      await expect(dialog).toHaveCount(0);
      await page.reload();
      await expect(page.getByText('10:00 AM to 2:00 PM', { exact: true })).toBeVisible();
      expect((await api('/profile/student', 'GET', undefined, fixture.student.token)).data.preferredHours).toEqual([10, 11, 12, 13]);
    }, fixture.student);
    await test('admin-independent-price-save-reload', async page => {
      await page.goto(base + '/admin/config');
      const local = page.getByRole('spinbutton', { name: 'Noorani Qaida Standard monthly price in LKR' });
      const international = page.getByRole('spinbutton', { name: 'Noorani Qaida Standard monthly price in USD' });
      await local.fill('6100'); await international.fill('61');
      await page.getByRole('spinbutton', { name: 'Noorani Qaida Fast Track monthly price in LKR' }).fill('7000');
      await page.getByRole('spinbutton', { name: 'Noorani Qaida Fast Track monthly price in USD' }).fill('70');
      await page.getByRole('button', { name: 'Save all prices' }).click();
      await expect(page.getByText('Prices saved', { exact: true })).toBeVisible();
      await page.reload(); await expect(local).toHaveValue('6100'); await expect(international).toHaveValue('61');
    }, fixture.admin);
    await test('admin-rate-panel-and-export', async page => {
      await page.goto(base + '/admin/finance');
      await expect(page.getByRole('heading', { name: 'Exchange rates & plan values' })).toBeVisible();
      await expect(page.getByText('Latest retrieved snapshot', { exact: false }).first()).toBeVisible();
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export rates & prices' }).click();
      const file = await download; await file.saveAs(path.join(out, 'rates-and-prices.csv'));
      expect(await fs.readFile(path.join(out, 'rates-and-prices.csv'), 'utf8')).toContain('Sri Lankan price LKR');
    }, fixture.admin);
    await test('request-based-assignment-save-reload', async page => {
      const email = `browser-request-${crypto.randomUUID()}@example.test`;
      const registered = await api('/auth/register', 'POST', { email, password: fixture.password, role: 'STUDENT', fullName: 'QA Browser Assignment', phone: '0000', country: 'Sri Lanka', timezone: 'Asia/Colombo', preferredHours: [10, 11, 12, 13] });
      expect(registered.status).toBe(201);
      await page.goto(base + '/admin/requests');
      const row = page.getByRole('row').filter({ hasText: email });
      await row.getByRole('button', { name: 'View & assign' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('combobox', { name: 'Choose a lecturer' }).selectOption(fixture.lecturer.id);
      await dialog.getByRole('button', { name: 'Assign lecturer and resolve request' }).click();
      await expect(dialog.getByText('Lecturer assignment is complete.')).toBeVisible();
      await page.reload(); await expect(row).toContainText('Resolved');
    }, fixture.admin);
    for (const route of ['users', 'sessions', 'feedback', 'audit']) await test('old-admin-route-' + route, async page => {
      await page.goto(base + '/admin/' + route);
      await expect(page.getByRole('table')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }, fixture.admin, 390);
    await test('classroom-future-join-and-timer', async page => {
      await page.goto(`${base}/student/courses/${fixture.courseId}/sessions/${fixture.futureId}/room`);
      await page.getByRole('button', { name: 'Enter classroom', exact: true }).click();
      await expect(page.getByRole('timer', { name: 'Lesson elapsed time' })).toContainText('Waiting for lecturer');
      await expect(page.getByRole('button', { name: /Leave/ })).toBeVisible();
    }, fixture.student);
    await test('partial-hour-display-contract', async page => {
      const saved = await api('/profile/student', 'PUT', { preferredHours: [10] }, fixture.student.token);
      expect(saved.status).toBe(200);
      await page.goto(base + '/student/settings');
      await expect(page.getByRole('button', { name: 'Change available times' })).toBeVisible();
      await expect(page.getByText('Availability not provided', { exact: true })).toHaveCount(0);
    }, fixture.student);
  } finally { await browser.close(); }
  console.log(JSON.stringify({ total: results.length, passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length }));
  process.exitCode = results.some(result => !result.passed) ? 1 : 0;
}
main().catch(async error => { console.error(error); if (browser) await browser.close(); process.exitCode = 1; });
