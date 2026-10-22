const fs = require('node:fs/promises');
const path = require('node:path');
const playwrightPath = process.env.QA_PLAYWRIGHT_PATH || '/Users/humaid/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = require(playwrightPath);
const { expect } = require(playwrightPath + '/test');

const output = path.resolve(__dirname, '../../output/super-admin-qa');
const base = process.env.QA_BROWSER_URL || 'http://localhost:3000';

async function main() {
  const fixture = JSON.parse(await fs.readFile(path.join(output, 'browser-fixtures.json'), 'utf8'));
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const width of [1440, 390, 320]) {
      for (const route of ['users', 'requests']) {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await context.newPage();
        try {
          await page.goto(base + '/auth/signin');
          await page.getByRole('textbox', { name: 'Email address' }).fill(fixture.admin.email);
          await page.getByRole('textbox', { name: 'Password', exact: true }).fill(fixture.password);
          await page.getByRole('button', { name: 'Log in', exact: true }).click();
          await page.waitForURL('**/admin/dashboard');
          await page.goto(base + '/admin/' + route);
          const trigger = route === 'users'
            ? page.getByRole('button', { name: 'Add Lecturer', exact: true })
            : page.getByRole('row').filter({ hasText: 'QA admin request' }).getByRole('button', { name: 'View & Reply' });
          await trigger.click();
          const dialog = page.getByRole('dialog');
          await expect(dialog).toBeVisible();
          await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
          const buttons = dialog.locator('button:enabled, input:enabled, textarea:enabled, select:enabled');
          await buttons.last().focus();
          await page.keyboard.press('Tab');
          await expect(buttons.first()).toBeFocused();
          await page.keyboard.press('Shift+Tab');
          await expect(buttons.last()).toBeFocused();
          await page.evaluate(async () => {
            await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
          });
          await page.addScriptTag({ path: process.env.QA_AXE_PATH || '/tmp/ilm-student-qa-tools/node_modules/axe-core/axe.min.js' });
          const violations = await dialog.evaluate(async element => (await window.axe.run(element, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })));
          const fits = await dialog.evaluate(element => element.getBoundingClientRect().right <= innerWidth && element.getBoundingClientRect().left >= 0);
          await page.keyboard.press('Escape');
          await expect(dialog).toHaveCount(0);
          await expect(trigger).toBeFocused();
          results.push({ name: `${route}-dialog-${width}`, passed: violations.length === 0 && fits, violations, fits });
        } catch (error) {
          results.push({ name: `${route}-dialog-${width}`, passed: false, error: error.message });
        }
        await page.screenshot({ path: path.join(output, `${route}-dialog-keyboard-${width}.png`), fullPage: true });
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  await fs.writeFile(path.join(output, 'dialog-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exitCode = results.some(result => !result.passed) ? 1 : 0;
}

main().catch(error => { console.error(error); process.exit(1); });
