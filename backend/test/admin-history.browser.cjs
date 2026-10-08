const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(playwrightModule);
const { expect } = require(`${playwrightModule}/test`);
const out = path.resolve(__dirname, '../../output/playwright/admin-history');
const base = 'http://localhost:3023';
const checks = [];
async function check(name, work) {
  await work();
  checks.push({ name, passed: true, at: new Date().toISOString() });
  console.log(`PASS ${name}`);
}
(async () => {
  const fixture = JSON.parse(await fs.readFile(path.join(out, 'fixture.json')));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    storageState: {
      cookies: [],
      origins: [
        {
          origin: base,
          localStorage: [
            { name: 'ilm_token', value: fixture.admin.token },
            { name: 'ilm_user', value: JSON.stringify(fixture.admin) },
          ],
        },
      ],
    },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`${base}/admin/history`);
    await check('Sidebar entry and Students/Lecturers tabs', async () => {
      await expect(
        page.getByRole('heading', { name: 'People & History', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'People & History', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('tab', { name: 'Students', exact: true }),
      ).toHaveAttribute('aria-selected', 'true');
      await expect(
        page.getByRole('tab', { name: 'Lecturers', exact: true }),
      ).toBeVisible();
    });
    await check(
      'Student full record, totals, payments, assessments, notes, support and activity',
      async () => {
        await page
          .getByRole('button', { name: /History Student العربية/ })
          .click();
        const summary = page.getByRole('region', {
          name: 'History Student العربية',
          exact: true,
        });
        await expect(summary).toContainText('Sessions attended');
        await expect(
          summary.getByText('36,000.00', { exact: false }),
        ).toBeVisible();
        await expect(
          page.getByRole('region', { name: 'Payment history', exact: true }),
        ).toContainText('refunded');
        await expect(
          page.getByRole('region', { name: 'Assessment history', exact: true }),
        ).toContainText('85/100');
        const sessions = page.getByRole('region', {
          name: 'Session history',
          exact: true,
        });
        await sessions.getByText(/1 Oct 2026.*completed/).click();
        await expect(
          sessions.getByText('Internal notes: QA internal note', {
            exact: true,
          }),
        ).toBeVisible();
        const support = page.getByRole('region', {
          name: 'Support & assignment requests',
          exact: true,
        });
        await support.getByText('Conversation (1)', { exact: true }).click();
        await expect(
          support.getByText('QA support message', { exact: true }),
        ).toBeVisible();
        const activity = page.getByRole('region', {
          name: 'Account activity',
          exact: true,
        });
        await activity.getByText(/admin assigned lecturer/).click();
        await expect(
          activity.getByText(fixture.lecturer.id, { exact: true }),
        ).toBeVisible();
        const reports = page.getByRole('region', {
          name: 'Progress reports',
          exact: true,
        });
        await reports.getByText(/2026-10.*History Lecturer/).click();
        await expect(
          reports
            .getByRole('group')
            .filter({ hasText: 'History Lecturer' })
            .getByText('Clear reading', { exact: true }),
        ).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: path.join(out, 'student-desktop.png'),
          fullPage: true,
        });
      },
    );
    await check('Search and no-match state', async () => {
      await page
        .getByLabel('Search students', { exact: true })
        .fill('no-such-person');
      await expect(
        page.getByText('No people match your search.', { exact: true }),
      ).toBeVisible();
      await page
        .getByLabel('Search students', { exact: true })
        .fill(fixture.student.email);
      await expect(
        page.getByRole('button', { name: /History Student العربية/ }),
      ).toBeVisible();
      await page.getByLabel('Search students', { exact: true }).fill('');
    });
    await check('Empty profile clears previous student records', async () => {
      await page.getByRole('button', { name: /Empty Student/ }).click();
      await expect(
        page.getByRole('region', { name: 'Empty Student', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText('No payments recorded.', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText('No sessions recorded.', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('region', { name: 'Assessment history', exact: true }),
      ).toContainText('No assessment results recorded.');
    });
    await check('Keyboard tab switching and selection reset', async () => {
      await page.getByRole('tab', { name: 'Students', exact: true }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(
        page.getByRole('tab', { name: 'Lecturers', exact: true }),
      ).toBeFocused();
      await expect(
        page.getByRole('tab', { name: 'Lecturers', exact: true }),
      ).toHaveAttribute('aria-selected', 'true');
      await expect(
        page.getByRole('region', { name: 'Select a person', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('region', { name: 'Empty Student', exact: true }),
      ).toHaveCount(0);
    });
    await check(
      'Lecturer earnings, payouts, students, assessment and feedback records',
      async () => {
        await page.getByRole('button', { name: /History Lecturer/ }).click();
        const summary = page.getByRole('region', {
          name: 'History Lecturer',
          exact: true,
        });
        await expect(summary).toContainText('Amount owed');
        await expect(
          summary.getByText('7,000.00', { exact: false }),
        ).toBeVisible();
        await expect(
          summary.getByText('4,500.00', { exact: false }),
        ).toBeVisible();
        await expect(
          page.getByRole('region', { name: 'Payout history', exact: true }),
        ).toContainText('QA bank failure');
        await expect(
          page.getByRole('region', {
            name: 'Session block earnings',
            exact: true,
          }),
        ).toContainText('paid out');
        await expect(
          page.getByRole('region', {
            name: 'Authored course assessments',
            exact: true,
          }),
        ).toContainText('Authored QA assessment');
        await expect(
          page.getByRole('region', { name: 'Student feedback', exact: true }),
        ).toContainText('Helpful lesson');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: path.join(out, 'lecturer-desktop.png'),
          fullPage: true,
        });
      },
    );
    await check('Assigned student opens student history', async () => {
      await page
        .getByRole('region', { name: 'Assigned students', exact: true })
        .getByRole('button', { name: 'History Student العربية', exact: true })
        .click();
      await expect(
        page.getByRole('tab', { name: 'Students', exact: true }),
      ).toHaveAttribute('aria-selected', 'true');
      await expect(
        page.getByRole('region', {
          name: 'History Student العربية',
          exact: true,
        }),
      ).toBeVisible();
    });
    await check(
      'Mobile student and lecturer profiles do not overflow',
      async () => {
        await page.setViewportSize({ width: 375, height: 812 });
        await expect(
          page.getByRole('region', {
            name: 'History Student العربية',
            exact: true,
          }),
        ).toBeVisible();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(out, 'student-mobile.png'),
          fullPage: true,
        });
        await page.getByRole('tab', { name: 'Lecturers', exact: true }).click();
        await page.getByRole('button', { name: /History Lecturer/ }).click();
        await expect(
          page.getByRole('region', { name: 'History Lecturer', exact: true }),
        ).toBeVisible();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(out, 'lecturer-mobile.png'),
          fullPage: true,
        });
      },
    );
    await check('History failure has working retry', async () => {
      await page.route('**/admin/users/*/history', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'QA unavailable' }),
        }),
      );
      await page.getByRole('button', { name: /Empty Lecturer/ }).click();
      await expect(
        page.getByRole('region', { name: 'History unavailable', exact: true }),
      ).toBeVisible({ timeout: 20000 });
      await page.unroute('**/admin/users/*/history');
      await page
        .getByRole('button', { name: 'Retry history', exact: true })
        .click();
      await expect(
        page.getByRole('region', { name: 'Empty Lecturer', exact: true }),
      ).toBeVisible();
    });
    await check('Directory failure has working retry', async () => {
      await page.route('**/admin/users?role=*', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'QA unavailable' }),
        }),
      );
      await page.reload();
      await expect(
        page.getByText('Unable to load people.', { exact: true }),
      ).toBeVisible({ timeout: 20000 });
      await page.unroute('**/admin/users?role=*');
      await page
        .getByRole('button', { name: 'Retry directory', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: /History Student العربية/ }),
      ).toBeVisible();
    });
    await check(
      'Slow old profile response cannot replace newly selected profile',
      async () => {
        let release;
        const gate = new Promise((resolve) => {
          release = resolve;
        });
        const routePattern = `**/admin/users/${fixture.student.id}/history`;
        await page.route(routePattern, async (route) => {
          await gate;
          await route.continue();
        });
        await page
          .getByRole('button', { name: /History Student العربية/ })
          .click();
        await expect(page.getByText('Loading history...', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: /Empty Student/ }).click();
        await expect(
          page.getByRole('region', { name: 'Empty Student', exact: true }),
        ).toBeVisible();
        const response = page.waitForResponse((response) =>
          response.url().includes(`/admin/users/${fixture.student.id}/history`),
        );
        release();
        await response;
        await expect(
          page.getByRole('region', { name: 'Empty Student', exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('region', {
            name: 'History Student العربية',
            exact: true,
          }),
        ).toHaveCount(0);
        await page.unroute(routePattern);
      },
    );
    await check('Empty directory state', async () => {
      await page.route('**/admin/users?role=*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '[]',
        }),
      );
      await page.reload();
      await expect(
        page.getByText('No students recorded yet.', { exact: true }),
      ).toBeVisible();
      await page.unroute('**/admin/users?role=*');
      await page.reload();
      await expect(
        page.getByRole('button', { name: /History Student العربية/ }),
      ).toBeVisible();
    });
    await check('Tab Home and End keyboard controls', async () => {
      await page.getByRole('tab', { name: 'Students', exact: true }).focus();
      await page.keyboard.press('End');
      await expect(
        page.getByRole('tab', { name: 'Lecturers', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Home');
      await expect(
        page.getByRole('tab', { name: 'Students', exact: true }),
      ).toBeFocused();
    });
    await check(
      '320px viewport and long account references remain contained',
      async () => {
        await page.setViewportSize({ width: 320, height: 740 });
        await page
          .getByRole('button', { name: /History Student العربية/ })
          .click();
        await expect(
          page.getByRole('region', {
            name: 'History Student العربية',
            exact: true,
          }),
        ).toBeVisible();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        );
      },
    );
    await check('Finance link and sidebar navigation work', async () => {
      await page.getByRole('tab', { name: 'Lecturers', exact: true }).click();
      await page.getByRole('button', { name: /History Lecturer/ }).click();
      await page
        .getByRole('link', { name: 'Manage payouts in Finance', exact: true })
        .click();
      await expect(page).toHaveURL(`${base}/admin/finance`);
      await page
        .getByRole('link', { name: 'People & History', exact: true })
        .click();
      await expect(page).toHaveURL(`${base}/admin/history`);
    });
    await check('No browser runtime errors', async () =>
      assert.deepEqual(errors, []),
    );
    await fs.writeFile(
      path.join(out, 'browser-results.json'),
      JSON.stringify(checks, null, 2),
    );
    console.log(`PASS: ${checks.length} browser scenarios`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
