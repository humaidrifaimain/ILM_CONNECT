const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(
  process.env.QA_PLAYWRIGHT_PATH ||
    '/Users/humaid/.npm/_npx/e41f203b7505f1fb/node_modules/playwright',
);

async function run() {
  const fixture = JSON.parse(
    await fs.readFile('/tmp/ilm-course-request-fixture.json', 'utf8'),
  );
  const browser = await chromium.launch({ headless: true });
  const contexts = [];
  const errors = [];
  async function pageFor(user, viewport) {
    const context = await browser.newContext({ viewport });
    contexts.push(context);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    const initialSession = page.waitForResponse((response) =>
      response.url().endsWith('/auth/me'),
    );
    await page.goto('http://localhost:3017/auth/signin');
    await initialSession;
    await page.getByRole('textbox', { name: 'Email address' }).fill(user.email);
    await page
      .getByRole('textbox', { name: 'Password', exact: true })
      .fill(fixture.password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.waitForURL(`**/${user.role.toLowerCase()}/dashboard`);
    return page;
  }
  try {
    const student = await pageFor(fixture.student, { width: 390, height: 844 });
    await student.goto('http://localhost:3017/student/courses');
    await student
      .getByRole('heading', { name: fixture.path.title, exact: true })
      .waitFor();
    assert.equal(
      await student
        .getByText('No learning path assigned yet.', { exact: false })
        .count(),
      0,
    );
    const sent = student.waitForResponse(
      (r) =>
        r.url().endsWith('/curriculum/requests') &&
        r.request().method() === 'POST',
    );
    await student
      .getByRole('button', { name: 'Request course', exact: true })
      .click();
    assert.equal((await sent).status(), 201);
    await student.getByRole('button', { name: 'Request pending' }).waitFor();
    assert(
      await student
        .getByRole('button', { name: 'Request pending' })
        .isDisabled(),
    );
    await student.reload();
    await student
      .getByText('Awaiting lecturer review', { exact: true })
      .waitFor();
    assert(
      await student.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await fs.mkdir('../output/course-requests', { recursive: true });
    await student.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      );
    });
    await student.screenshot({
      path: '../output/course-requests/student-request-mobile.png',
      fullPage: true,
    });
    const lecturer = await pageFor(fixture.lecturer, {
      width: 1440,
      height: 1000,
    });
    await lecturer.goto('http://localhost:3017/lecturer/courses');
    const panel = lecturer.getByRole('region', {
      name: 'Course requests',
      exact: true,
    });
    await panel.getByText(fixture.path.title, { exact: true }).waitFor();
    await lecturer
      .getByRole('button', { name: 'Notifications', exact: true })
      .click();
    await lecturer
      .getByRole('button')
      .filter({
        hasText: `${fixture.student.fullName} requested ${fixture.path.title}.`,
      })
      .first()
      .click();
    await lecturer.waitForURL('**/lecturer/courses');
    assert.equal(
      await panel
        .getByRole('link', { name: fixture.student.fullName })
        .getAttribute('href'),
      `/lecturer/students/${fixture.student.id}`,
    );
    await lecturer.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      );
    });
    await lecturer.screenshot({
      path: '../output/course-requests/lecturer-pending.png',
      fullPage: true,
    });
    const accepted = lecturer.waitForResponse(
      (r) =>
        r.url().includes('/curriculum/requests/') &&
        r.request().method() === 'PATCH',
    );
    await panel.getByRole('button', { name: 'Accept request' }).click();
    assert.equal((await accepted).status(), 200);
    await panel
      .getByText('Course assigned. The student has been notified.', {
        exact: true,
      })
      .waitFor();
    await panel
      .getByText('No pending course requests.', { exact: true })
      .waitFor();
    await student.reload();
    await student.getByText('Course progress: 0%', { exact: true }).waitFor();
    await student
      .getByRole('link', { name: 'Materials', exact: true })
      .waitFor();
    await student
      .getByRole('button', { name: 'Notifications', exact: true })
      .click();
    await student
      .getByRole('button')
      .filter({
        hasText: `${fixture.path.title}: your lecturer accepted your request.`,
      })
      .first()
      .click();
    await student.waitForURL('**/student/courses');
    await student.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      );
    });
    await fs.mkdir('../output/course-requests', { recursive: true });
    await student.screenshot({
      path: '../output/course-requests/student-mobile.png',
      fullPage: true,
    });
    await lecturer.screenshot({
      path: '../output/course-requests/lecturer.png',
      fullPage: true,
    });
    const unassigned = await pageFor(fixture.unassigned, {
      width: 1440,
      height: 1000,
    });
    await unassigned.goto('http://localhost:3017/student/courses');
    await unassigned
      .getByRole('heading', { name: fixture.path.title, exact: true })
      .waitFor();
    assert(
      await unassigned
        .getByRole('button', { name: 'Request course', exact: true })
        .isDisabled(),
    );
    await unassigned
      .getByRole('link', { name: 'Contact support', exact: true })
      .waitFor();
    await unassigned.route('**/curriculum/requests', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Service unavailable' }),
      }),
    );
    await unassigned.reload();
    await unassigned
      .getByText(
        'Course requests are temporarily unavailable. You can still browse courses.',
        { exact: true },
      )
      .waitFor();
    await unassigned
      .getByRole('heading', { name: fixture.path.title, exact: true })
      .waitFor();
    assert(
      await unassigned
        .getByRole('button', { name: 'Request course', exact: true })
        .isDisabled(),
    );
    const admin = await pageFor(fixture.admin, { width: 1440, height: 1000 });
    await admin.route('**/api/v1/admin/finance', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ payments: [], payouts: [] }),
      }),
    );
    await admin.goto('http://localhost:3017/admin/finance');
    await admin
      .getByRole('alert')
      .filter({
        hasText: 'Financial data is incompatible with this dashboard.',
      })
      .waitFor();
    assert.equal(
      await admin
        .getByRole('button', { name: 'Export CSV', exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      'PASS: mobile catalogue, persisted request, lecturer acceptance, student notification, rollout fallback, legacy finance guard, no overflow or page crashes',
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
