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
  await expect(page).toHaveTitle(/BriefcaseOS Onboarding/);
  await expect(page.getByRole('heading', { name: 'Make it feel like yours.' })).toBeVisible();
  await expect(page.getByText('Your candidate signal')).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.screenshot({ path: `artifacts/portfolio/${testInfo.project.name}-01-entry.png`, fullPage: true });

  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Start with evidence.' })).toBeVisible();
  await page.getByRole('button', { name: 'Try the sample profile' }).click();
  await expect(page.getByText('Review what we found')).toBeVisible();
  await expect(page.getByDisplayValue('Jordan Lee')).toBeVisible();
  await expect(page.getByText('8 core strengths')).toBeVisible();
  await expect(page.getByText('Fictional sample data for portfolio demonstration.')).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await page.screenshot({ path: `artifacts/portfolio/${testInfo.project.name}-02-sample.png`, fullPage: true });

  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Define the work worth finding.' })).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Make constraints explicit.' })).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Tune the agent’s judgment.' })).toBeVisible();
  await page.getByRole('button', { name: /Pack my briefcase/ }).click();

  await expect(page.getByRole('heading', { name: 'Your briefcase is packed.' })).toBeVisible();
  await expect(page.getByText('Candidate model ready')).toBeVisible();
  await page.getByRole('button', { name: 'candidate.yaml' }).click();
  await expect(page.getByText('schemaVersion: \'2.0\'')).toBeVisible();
  await expect(page.locator('.yaml-view')).not.toContainText('sourceText');
  await expect(page.locator('.yaml-view')).not.toContainText('dataBase64');
  await expectNoSeriousAccessibilityViolations(page);

  await page.screenshot({ path: `artifacts/portfolio/${testInfo.project.name}-03-completion.png`, fullPage: true });

  if (testInfo.project.name.includes('mobile')) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }

  await page.getByRole('button', { name: 'Clear local data and restart' }).click();
  await expect(page.getByRole('heading', { name: 'Make it feel like yours.' })).toBeVisible();
  const storedKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('briefcaseos.')));
  expect(storedKeys).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
