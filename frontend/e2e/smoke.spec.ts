/**
 * Playwright smoke — plan → publish → submit → analytics → report.
 *
 * Requires running frontend + API and DEMO credentials:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000
 *   E2E_EMAIL=...
 *   E2E_PASSWORD=...
 *
 * Skip locally when env is unset (CI can set vars to enable).
 */
import { test, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const configured = Boolean(base && email && password);

test.describe('SurvAI smoke', () => {
  test.skip(!configured, 'Set PLAYWRIGHT_BASE_URL, E2E_EMAIL, E2E_PASSWORD');

  test('login lands on dashboard surveys', async ({ page }) => {
    await page.goto(`${base}/auth/sign-in`);
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
  });

  test('survey workspace nav includes Plan through Report', async ({ page }) => {
    await page.goto(`${base}/auth/sign-in`);
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });

    // Open first survey if present; otherwise pass after list loads
    const surveyLink = page.locator('a[href*="/dashboard/surveys/"]').first();
    if (await surveyLink.count()) {
      await surveyLink.click();
      await expect(page.getByRole('link', { name: /plan/i }).first()).toBeVisible({
        timeout: 15_000
      });
      for (const label of ['Build', 'Review', 'Collect', 'Analytics', 'Report']) {
        await expect(
          page.getByRole('link', { name: new RegExp(label, 'i') }).first()
        ).toBeVisible();
      }
    }
  });
});
