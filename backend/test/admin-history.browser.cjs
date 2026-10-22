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
  const region = (name) => page.getByRole('region', { name, exact: true });
  const tab = (name) =>
    page.getByRole('tab', { name: new RegExp(`^${name}(?: \\d+)?$`) });
  const openStudent = () =>
    page.getByRole('button', { name: /History Student العربية/ }).click();
  async function screenshot(name) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, name), fullPage: true });
  }
  try {
    await page.goto(`${base}/admin/history`);
    await check(
      'Full-width people directory and sidebar navigation',
      async () => {
        await expect(
          page.getByRole('heading', { name: 'People & History', exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'People & History', exact: true }),
        ).toBeVisible();
        await expect(tab('Students')).toHaveAttribute('aria-selected', 'true');
        await expect(region('Student directory')).toBeVisible();
        assert((await region('Student directory').boundingBox()).width > 1000);
        await expect(region('Account & profile')).toHaveCount(0);
        await screenshot('directory-desktop.png');
      },
    );
    await check('Search, no matches and clear-search action', async () => {
      await page
        .getByLabel('Search students', { exact: true })
        .fill('no-such-person');
      await expect(
        page.getByText('No people match your search.', { exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Clear search', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: /History Student العربية/ }),
      ).toBeVisible();
      await page
        .getByLabel('Search students', { exact: true })
        .fill('History Student');
    });
    await check(
      'Selecting a person replaces directory with focused full-width profile',
      async () => {
        await openStudent();
        await expect(page).toHaveURL(
          new RegExp(`person=${fixture.student.id}`),
        );
        await expect(region('Student directory')).toHaveCount(0);
        await expect(
          page.getByRole('heading', {
            name: 'History Student العربية',
            exact: true,
          }),
        ).toBeFocused();
        await expect(region('History Student العربية')).toContainText(
          'LKR 36,000.00',
        );
        await expect(region('Account & profile')).toBeVisible();
        await expect(region('Session history')).toHaveCount(0);
        await expect(region('Payment history')).toHaveCount(0);
        assert(
          (await region('History Student العربية').boundingBox()).width > 1000,
        );
        await screenshot('student-desktop.png');
      },
    );
    await check('Account reference uses keyboard disclosure', async () => {
      await page.getByText('Show account ID', { exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(
        region('Account & profile').getByText(fixture.student.id, {
          exact: true,
        }),
      ).toBeVisible();
    });
    await check(
      'Payments tab reveals only billing, with all statuses and totals',
      async () => {
        await tab('Payments').click();
        await expect(region('Payment history')).toContainText('refunded');
        await expect(region('Payment history')).toContainText(
          'Successful payments',
        );
        await expect(region('Subscription history')).toBeVisible();
        await expect(region('Account & profile')).toHaveCount(0);
        await expect(region('Session history')).toHaveCount(0);
        await region('Payment history')
          .getByText('Payment references', { exact: true })
          .first()
          .click();
        await expect(
          region('Payment history')
            .getByText(/Gateway reference:/)
            .first(),
        ).toBeVisible();
        await screenshot('student-payments-desktop.png');
      },
    );
    await check(
      'Sessions tab exposes notes and status history directly',
      async () => {
        await tab('Sessions').click();
        await expect(region('Session history')).toContainText('7 total');
        await region('Session history')
          .getByText(/1 Oct 2026.*completed/)
          .click();
        await expect(
          region('Session history').getByText(
            'Internal notes: QA internal note',
            { exact: true },
          ),
        ).toBeVisible();
        await expect(region('Payment history')).toHaveCount(0);
      },
    );
    await check(
      'Assessments tab groups scores, reports and certificates',
      async () => {
        await tab('Assessments').click();
        await expect(region('Assessment history')).toContainText('85/100');
        await expect(region('Certificates')).toContainText('History QA course');
        await region('Progress reports')
          .getByText(/2026-10.*History Lecturer/)
          .click();
        await expect(
          region('Progress reports')
            .getByRole('group')
            .filter({ hasText: 'History Lecturer' })
            .getByText('Clear reading', { exact: true }),
        ).toBeVisible();
      },
    );
    await check(
      'Activity tab groups requests, conversations and account events',
      async () => {
        await tab('Activity').click();
        await expect(region('Course requests')).toContainText('accepted');
        await region('Support & assignment requests')
          .getByText('Conversation (1)', { exact: true })
          .click();
        await expect(
          region('Support & assignment requests').getByText(
            'QA support message',
            { exact: true },
          ),
        ).toBeVisible();
        await region('Account activity')
          .getByText(/admin assigned lecturer/)
          .click();
        await expect(
          region('Account activity').getByText(fixture.lecturer.id, {
            exact: true,
          }),
        ).toBeVisible();
      },
    );
    await check(
      'Section tabs support arrows, wrapping, Home and End',
      async () => {
        await tab('Overview').focus();
        await page.keyboard.press('ArrowLeft');
        await expect(tab('Activity')).toBeFocused();
        await page.keyboard.press('ArrowRight');
        await expect(tab('Overview')).toBeFocused();
        await page.keyboard.press('End');
        await expect(tab('Activity')).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('Home');
        await expect(tab('Overview')).toBeFocused();
        await expect(region('Account & profile')).toBeVisible();
      },
    );
    await check(
      'Back to directory preserves search and profile URLs survive reload',
      async () => {
        await page
          .getByRole('button', { name: 'Back to students', exact: true })
          .click();
        await expect(
          page.getByLabel('Search students', { exact: true }),
        ).toHaveValue('History Student');
        await expect(
          page.getByRole('button', { name: /Empty Student/ }),
        ).toHaveCount(0);
        await openStudent();
        await expect(page).toHaveURL(
          new RegExp(`person=${fixture.student.id}`),
        );
        await page.reload();
        await expect(region('History Student العربية')).toBeVisible();
        await expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');
        await page
          .getByRole('button', { name: 'Back to students', exact: true })
          .click();
        await page.getByLabel('Search students', { exact: true }).fill('');
      },
    );
    await check('Directory role tabs support keyboard switching', async () => {
      await tab('Students').focus();
      await page.keyboard.press('End');
      await expect(tab('Lecturers')).toBeFocused();
      await expect(region('Lecturer directory')).toBeVisible();
      await page.keyboard.press('Home');
      await expect(tab('Students')).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(tab('Lecturers')).toHaveAttribute('aria-selected', 'true');
    });
    await check(
      'Lecturer overview and Earnings keep the payout breakdown separate',
      async () => {
        await page.getByRole('button', { name: /History Lecturer/ }).click();
        await expect(region('History Lecturer')).toContainText('LKR 7,000.00');
        await expect(region('Payout history')).toHaveCount(0);
        await screenshot('lecturer-desktop.png');
        await tab('Earnings').click();
        await expect(region('Payout history')).toContainText('LKR 4,500.00');
        await expect(region('Payout history')).toContainText('QA bank failure');
        await expect(region('Session block earnings')).toContainText(
          'paid out',
        );
        await region('Payout history')
          .getByText('Payout reference & blocks', { exact: true })
          .first()
          .click();
        await region('Session block earnings')
          .getByText('Block & session references', { exact: true })
          .first()
          .click();
        await screenshot('lecturer-earnings-desktop.png');
        await tab('Sessions').click();
        await expect(region('Student feedback')).toContainText(
          'Helpful lesson',
        );
        await tab('Assessments').click();
        await expect(region('Authored course assessments')).toContainText(
          'Authored QA assessment',
        );
        await tab('Activity').click();
        await expect(region('Account activity')).toBeVisible();
      },
    );
    await check(
      'Assigned student opens with clean section state and browser Back works',
      async () => {
        await tab('Students').click();
        await expect(region('Assigned students')).toContainText(
          '2 currently assigned',
        );
        await region('Assigned students')
          .getByRole('button', { name: 'History Student العربية', exact: true })
          .click();
        await expect(region('History Student العربية')).toBeVisible();
        await expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');
        await expect(tab('Earnings')).toHaveCount(0);
        await page.goBack();
        await expect(region('History Lecturer')).toBeVisible();
        await page
          .getByRole('button', { name: 'Back to lecturers', exact: true })
          .click();
        await expect(region('Lecturer directory')).toBeVisible();
      },
    );
    await check(
      'Empty lecturer profile retains working navigation',
      async () => {
        await page.getByRole('button', { name: /Empty Lecturer/ }).click();
        await expect(region('Empty Lecturer')).toBeVisible();
        await tab('Earnings').click();
        await expect(region('Payout history')).toContainText(
          'No payout requests recorded.',
        );
        await tab('Students').click();
        await expect(region('Assigned students')).toContainText(
          'No students currently assigned.',
        );
        await page
          .getByRole('button', { name: 'Back to lecturers', exact: true })
          .click();
      },
    );
    await check(
      '375px and 320px layouts contain the page and keep navigation sticky',
      async () => {
        await page.setViewportSize({ width: 375, height: 812 });
        await screenshot('directory-mobile.png');
        await page.getByRole('button', { name: /History Lecturer/ }).click();
        await expect(region('History Lecturer')).toBeVisible();
        await tab('Earnings').click();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        );
        await screenshot('lecturer-mobile.png');
        await page
          .getByRole('button', { name: 'Back to lecturers', exact: true })
          .click();
        await tab('Students').click();
        await openStudent();
        await expect(region('History Student العربية')).toBeVisible();
        await screenshot('student-mobile.png');
        await page.setViewportSize({ width: 320, height: 740 });
        await tab('Payments').click();
        await expect(region('Payment history')).toBeVisible();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        );
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        const box = await page
          .getByRole('tablist', { name: 'Record sections', exact: true })
          .boundingBox();
        assert(
          box.y >= 71 && box.y <= 73,
          `Section navigation must stay below the topbar: ${box.y}`,
        );
        await tab('Overview').click();
        await expect(region('Account & profile')).toBeVisible();
        await page
          .getByRole('button', { name: 'Back to students', exact: true })
          .click();
      },
    );
    await check(
      'Empty student profile retains zero totals and category empty states',
      async () => {
        await page.getByRole('button', { name: /Empty Student/ }).click();
        await expect(region('Empty Student')).toBeVisible();
        await tab('Payments').click();
        await expect(region('Payment history')).toContainText(
          'No payments recorded.',
        );
        await expect(
          region('Payment history').getByText('0', { exact: true }),
        ).toBeVisible();
        await tab('Sessions').click();
        await expect(region('Session history')).toContainText(
          'No sessions recorded.',
        );
        await tab('Assessments').click();
        await expect(region('Assessment history')).toContainText(
          'No assessment results recorded.',
        );
        await page
          .getByRole('button', { name: 'Back to students', exact: true })
          .click();
      },
    );
    await check(
      'Loading can be cancelled without stale data replacing the next person',
      async () => {
        await expect(region('Student directory')).toBeVisible();
        await expect(page).not.toHaveURL(/person=/);
        await page.reload();
        let release;
        const gate = new Promise((resolve) => {
          release = resolve;
        });
        const pattern = `**/admin/users/${fixture.student.id}/history`;
        await page.route(pattern, async (route) => {
          await gate;
          await route.continue();
        });
        await openStudent();
        await expect(
          page.getByText('Loading history...', { exact: true }),
        ).toBeVisible();
        await page
          .getByRole('button', { name: 'Back to students', exact: true })
          .click();
        await page.getByRole('button', { name: /Empty Student/ }).click();
        await expect(region('Empty Student')).toBeVisible();
        const response = page.waitForResponse((response) =>
          response.url().includes(`/admin/users/${fixture.student.id}/history`),
        );
        release();
        await response;
        await expect(region('Empty Student')).toBeVisible();
        await expect(region('History Student العربية')).toHaveCount(0);
        await page.unroute(pattern);
        await page
          .getByRole('button', { name: 'Back to students', exact: true })
          .click();
      },
    );
    await check('History error offers Retry and Back', async () => {
      await expect(region('Student directory')).toBeVisible();
      await expect(page).not.toHaveURL(/person=/);
      await page.reload();
      await page.route('**/admin/users/*/history', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"message":"QA unavailable"}',
        }),
      );
      await page.getByRole('button', { name: /Empty Student/ }).click();
      await expect(region('History unavailable')).toBeVisible({
        timeout: 20000,
      });
      await expect(
        page.getByRole('button', { name: 'Back to students', exact: true }),
      ).toBeVisible();
      await page.unroute('**/admin/users/*/history');
      await page
        .getByRole('button', { name: 'Retry history', exact: true })
        .click();
      await expect(region('Empty Student')).toBeVisible();
      await page
        .getByRole('button', { name: 'Back to students', exact: true })
        .click();
    });
    await check('Directory error offers a working Retry', async () => {
      await expect(region('Student directory')).toBeVisible();
      await expect(page).not.toHaveURL(/person=/);
      await page.route('**/admin/users?role=*', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"message":"QA unavailable"}',
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
    });
    await check(
      'Finance and sidebar links work from the Earnings section',
      async () => {
        await tab('Lecturers').click();
        await page.getByRole('button', { name: /History Lecturer/ }).click();
        await tab('Earnings').click();
        await page
          .getByRole('link', { name: 'Manage payouts in Finance', exact: true })
          .click();
        await expect(page).toHaveURL(`${base}/admin/finance`);
        await page.getByText('Menu', { exact: true }).click();
        await page
          .getByRole('link', { name: 'People & History', exact: true })
          .click();
        await expect(page).toHaveURL(`${base}/admin/history`);
        await page.getByText('Menu', { exact: true }).click();
        await expect(
          page.getByRole('navigation', { name: 'Admin pages', exact: true }),
        ).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(
          page.getByRole('navigation', { name: 'Admin pages', exact: true }),
        ).not.toBeVisible();
      },
    );
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
  process.exitCode = 1;
});
