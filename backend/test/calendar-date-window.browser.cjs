const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, expect } = require(process.env.QA_PLAYWRIGHT_PATH || '/Users/humaid/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/test');
const web = process.env.CALENDAR_QA_WEB_URL || 'http://localhost:3007';
const out = path.resolve(__dirname, '../../output/calendar-date-window-qa');
const results = [];

async function check(browser, role, width, dateString) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: 'Asia/Colombo', locale: 'en-US' });
  try {
    const user = { id: 'calendar-qa', email: 'calendar@example.test', role, status: 'ACTIVE' };
    await context.addInitScript(user => { localStorage.setItem('ilm_user', JSON.stringify(user)); localStorage.setItem('ilm_token', 'local-qa'); localStorage.setItem('ilm-sessions-view', 'calendar'); }, user);
    const today = new Date(dateString);
    const bookings = [-3, -2, -1, 0, 1].map(offset => {
      const startsAt = new Date(+today + offset * 86400000);
      return { id: `day-${offset}`, startsAt: startsAt.toISOString(), endsAt: new Date(+startsAt + 2400000).toISOString(), status: offset < 0 ? 'COMPLETED' : 'SCHEDULED', tier: 'Standard', subject: `QA day ${offset}`, student: { fullName: `QA day ${offset}` }, lecturer: { fullName: `QA day ${offset}` } };
    });
    await context.route('http://localhost:3017/api/v1/**', async route => {
      const endpoint = new URL(route.request().url()).pathname.replace('/api/v1', '');
      let body = [];
      if (endpoint === '/auth/me') body = user;
      if (endpoint === '/bookings/student' || endpoint === '/bookings/lecturer') body = bookings;
      if (endpoint === '/subscriptions/access') body = { requiresSubscription: false };
      if (endpoint === '/subscriptions/me') body = { tier: 'Standard', status: 'ACTIVE', currentPeriodEnd: '2028-01-01T00:00:00Z', lkrAmount: 0 };
      if (endpoint === '/profile/student' || endpoint === '/profile/lecturer') body = { fullName: 'Calendar QA', hourlyAvailabilityJson: [10], assignedLecturer: { fullName: 'QA Lecturer', hourlyAvailabilityJson: [10] } };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': web, 'Access-Control-Allow-Credentials': 'true' } });
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(today);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(web + (role === 'LECTURER' ? '/lecturer/sessions' : '/student/courses/beginner-qaida/sessions'));
    const calendar = page.getByRole('region', { name: role === 'LECTURER' ? 'Lecturer sessions calendar' : 'Student sessions calendar' });
    await expect(calendar).toBeVisible();
    for (const view of ['Week', 'Month', 'Day']) {
      await calendar.getByRole('button', { name: view, exact: true }).click();
      await expect(calendar.getByRole('button', { name: /QA day -3|QA day -2/ })).toHaveCount(0);
      if (view === 'Month') for (const offset of [-3, -2]) {
        const oldDate = new Date(+today + offset * 86400000);
        await expect(calendar.getByRole('button', { name: oldDate.toLocaleDateString('en-US', { timeZone: 'Asia/Colombo', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), exact: true })).toHaveCount(0);
      }
    }
    await expect(calendar.getByRole('button', { name: /QA day 0/ })).toHaveCount(1);
    await calendar.getByRole('button', { name: 'Previous day' }).click();
    await expect(calendar.getByRole('button', { name: /QA day -1/ })).toHaveCount(1);
    await expect(calendar.getByRole('button', { name: 'Previous day' })).toBeDisabled();
    await calendar.getByRole('button', { name: 'Next day' }).click();
    await calendar.getByRole('button', { name: 'Next day' }).click();
    await expect(calendar.getByRole('button', { name: /QA day 1/ })).toHaveCount(1);
    await calendar.getByRole('button', { name: 'Today', exact: true }).click();
    await calendar.getByRole('button', { name: 'Week', exact: true }).click();
    if (dateString.startsWith('2026-10-12')) {
      await calendar.getByRole('button', { name: 'Previous week' }).click();
      await expect(calendar.getByRole('button', { name: /QA day -1/ })).toHaveCount(1);
    } else {
      await expect(calendar.getByRole('button', { name: /QA day -1/ })).toHaveCount(1);
    }
    await expect(calendar.getByRole('button', { name: 'Previous week' })).toBeDisabled();
    await calendar.getByRole('button', { name: 'Today', exact: true }).click();
    await calendar.getByRole('button', { name: 'Month', exact: true }).click();
    const yesterday = new Date(+today - 86400000);
    const firstCell = calendar.getByRole('button', { name: yesterday.toLocaleDateString('en-US', { timeZone: 'Asia/Colombo', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), exact: true });
    await expect(firstCell).toBeVisible();
    const column = await firstCell.evaluate(button => getComputedStyle(button.parentElement).gridColumnStart);
    assert.equal(Number(column), (yesterday.getUTCDay() + 6) % 7 + 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    if (role === 'STUDENT') {
      await page.goto(web + '/student/dashboard');
      const dashboardCalendar = page.getByRole('region', { name: 'Student session calendar' });
      await expect(dashboardCalendar).toBeVisible();
      await dashboardCalendar.getByRole('button', { name: 'Day', exact: true }).click();
      await dashboardCalendar.getByRole('button', { name: 'Previous day' }).click();
      await expect(dashboardCalendar.getByRole('button', { name: /QA day -1/ })).toHaveCount(1);
      await expect(dashboardCalendar.getByRole('button', { name: /QA day -3|QA day -2/ })).toHaveCount(0);
      await expect(dashboardCalendar.getByRole('button', { name: 'Previous day' })).toBeDisabled();
      assert.deepEqual(errors, []);
    }
    const name = `${role}-${width}-${dateString.slice(0, 10)}`;
    await page.screenshot({ path: path.join(out, name + '.png') });
    results.push({ name, passed: true });
    console.log('PASS ' + name);
  } finally { await context.close(); }
}

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const role of ['LECTURER', 'STUDENT']) for (const width of [1440, 390]) for (const date of ['2026-10-08T10:00:00+05:30', '2026-10-12T10:00:00+05:30', '2027-01-01T10:00:00+05:30']) await check(browser, role, width, date);
  } finally {
    await browser.close();
    await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
