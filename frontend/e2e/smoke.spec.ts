/**
 * Playwright pilot smoke — login → survey tabs → (optional) collect/analytics/report.
 *
 * Requires running frontend + API and credentials:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000   # or Vercel URL
 *   E2E_EMAIL=...
 *   E2E_PASSWORD=...
 * Optional:
 *   E2E_SURVEY_ID=<uuid>   # published survey with ≥1 response for deeper checks
 *
 * Skips when env is unset (CI can enable by setting vars).
 */
import { test, expect, type Page } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const surveyId = process.env.E2E_SURVEY_ID;
const configured = Boolean(base && email && password);

async function signIn(page: Page) {
  await page.goto(`${base}/auth/sign-in`);
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });
}

test.describe('SurvAI pilot smoke', () => {
  test.skip(!configured, 'Set PLAYWRIGHT_BASE_URL, E2E_EMAIL, E2E_PASSWORD');

  test('login lands on dashboard', async ({ page }) => {
    await signIn(page);
  });

  test('survey workspace nav includes Plan through Report', async ({ page }) => {
    await signIn(page);

    if (surveyId) {
      await page.goto(`${base}/dashboard/surveys/${surveyId}/plan`);
    } else {
      const surveyLink = page.locator('a[href*="/dashboard/surveys/"]').first();
      if (!(await surveyLink.count())) {
        test.skip(true, 'No survey in list — create one or set E2E_SURVEY_ID');
        return;
      }
      await surveyLink.click();
    }

    await expect(page.getByRole('link', { name: /^plan$/i }).first()).toBeVisible({
      timeout: 20_000
    });
    for (const label of ['Build', 'Review', 'Collect', 'Analytics', 'Report']) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first()
      ).toBeVisible();
    }
  });

  test('collect → analytics → report tabs load for seeded survey', async ({
    page
  }) => {
    test.skip(!surveyId, 'Set E2E_SURVEY_ID for publish→report path');
    await signIn(page);

    await page.goto(`${base}/dashboard/surveys/${surveyId}/collect`);
    await expect(page.getByText(/collect|publish|share|qr/i).first()).toBeVisible({
      timeout: 20_000
    });

    await page.goto(`${base}/dashboard/surveys/${surveyId}/analytics`);
    await expect(
      page.getByText(/analytics|responses|distribution|summary/i).first()
    ).toBeVisible({ timeout: 30_000 });

    await page.goto(`${base}/dashboard/surveys/${surveyId}/report`);
    await expect(
      page.getByText(/report|generate|sections|download|pdf/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });
});
