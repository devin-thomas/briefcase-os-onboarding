import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''));
  expect(serious, serious.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('fictional sample completes the portfolio-safe onboarding flow', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle(/BriefcaseOS.*candidate onboarding/i);
  await expect(page.getByRole('heading', { name: 'Make it feel like yours.' })).toBeVisible();
  await expect(page.getByText('Your candidate signal')).toBeVisible();
  const sampleButton = page.getByRole('button', { name: 'Fill every field with the sample' });
  await expect(sampleButton).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await sampleButton.click();
  await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveValue('Jordan Lee');
  await expect(page.getByText('Role strategy set')).toBeVisible();
  await expect(page.getByText('Fictional sample data loaded across all five onboarding steps.')).not.toBeVisible();
  await page.screenshot({ path: `artifacts/portfolio/${testInfo.project.name}-01-sample-entry.png`, fullPage: true });

  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Start with evidence.' })).toBeVisible();
  await expect(page.getByText('Review what we found')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Jordan Lee');
  await expect(page.getByText('8 core strengths')).toBeVisible();
  await expect(page.getByText('Fictional sample data loaded across all five onboarding steps.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try the sample profile' })).toHaveCount(0);
  await expectNoSeriousAccessibilityViolations(page);

  await page.screenshot({ path: `artifacts/portfolio/${testInfo.project.name}-02-sample.png`, fullPage: true });

  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Define the work worth finding.' })).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Make constraints explicit.' })).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Tune the agent’s judgment.' })).toBeVisible();
  await expect(page.locator('.priority-chart__segment text')).toHaveCount(4);
  await expect(page.locator('.priority-chart__total')).toHaveCount(0);
  await expect(page.locator('.check-row')).toHaveCount(6);
  const permissionLayout = await page.locator('.check-row').first().evaluate((row) => {
    const checkbox = row.querySelector('input');
    const label = row.querySelector('span');
    if (!checkbox || !label) return null;
    const box = checkbox.getBoundingClientRect();
    const text = label.getBoundingClientRect();
    return { display: getComputedStyle(row).display, checkboxWidth: box.width, gap: text.left - box.right };
  });
  expect(permissionLayout).not.toBeNull();
  expect(permissionLayout?.display).toBe('flex');
  expect(permissionLayout?.checkboxWidth).toBeLessThanOrEqual(20);
  expect(permissionLayout?.gap).toBeLessThanOrEqual(16);
  await expectNoSeriousAccessibilityViolations(page);
  await page.screenshot({ path: `artifacts/portfolio/${testInfo.project.name}-03-agent.png`, fullPage: true });
  await page.getByRole('button', { name: /Pack my briefcase/ }).click();

  await expect(page.getByRole('heading', { name: 'Your briefcase is packed.' })).toBeVisible();
  await expect(page.getByText('Candidate model ready')).toBeVisible();
  await page.getByRole('tab', { name: 'candidate.json' }).click();
  await expect(page.getByLabel('Candidate JSON')).toContainText('"schemaVersion": "2.0"');
  await expect(page.getByLabel('Candidate JSON')).not.toContainText('sourceText');
  await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible();
  await page.getByRole('tab', { name: 'candidate.yaml' }).click();
  await expect(page.getByText('schemaVersion: \'2.0\'')).toBeVisible();
  await expect(page.getByLabel('Candidate YAML')).not.toContainText('sourceText');
  await expect(page.getByLabel('Candidate YAML')).not.toContainText('dataBase64');
  await expect(page.getByRole('button', { name: 'Download YAML' })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.screenshot({ path: `artifacts/portfolio/${testInfo.project.name}-04-completion.png`, fullPage: true });

  if (testInfo.project.name.includes('mobile')) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }

  await page.getByRole('button', { name: 'Clear local data and restart' }).click();
  await expect(page.getByRole('heading', { name: 'Make it feel like yours.' })).toBeVisible();
  const storageState = await page.evaluate(() => ({
    candidateKeys: Object.keys(localStorage).filter((key) => /candidate-draft|onboarding-step/.test(key)),
    preferences: JSON.parse(localStorage.getItem('briefcaseos.demo.preferences.v1') || '{}') as Record<string, unknown>,
  }));
  expect(storageState.candidateKeys).toEqual([]);
  expect(Object.keys(storageState.preferences).sort()).toEqual(['accent', 'theme']);
  expect(JSON.stringify(storageState.preferences)).not.toContain('Jordan Lee');
  expect(consoleErrors).toEqual([]);
});
