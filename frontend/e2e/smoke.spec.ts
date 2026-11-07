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
  await page.locator('#sign-in-email, input[name="email"]').first().fill(email!);
  await page.locator('#sign-in-password, input[name="password"]').first().fill(password!);
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
      // Collect loads without the plan hippie dialog that covers tabs.
      await page.goto(`${base}/dashboard/surveys/${surveyId}/collect`);
    } else {
      const surveyLink = page.locator('a[href*="/dashboard/surveys/"]').first();
      if (!(await surveyLink.count())) {
        test.skip(true, 'No survey in list — create one or set E2E_SURVEY_ID');
        return;
      }
      await surveyLink.click();
    }

    await expect(
      page.getByRole('dialog', { name: /loading/i })
    ).toHaveCount(0, { timeout: 60_000 });

    const workflow = page.getByRole('tablist', { name: /survey workflow/i });
    await expect(workflow.getByRole('tab', { name: /plan/i })).toBeVisible({
      timeout: 30_000
    });
    for (const label of [
      'Review',
      'Collect',
      'Respondents',
      'Analytics',
      'Report'
    ]) {
      await expect(
        workflow.getByRole('tab', { name: new RegExp(label, 'i') })
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
      page.getByText(/response summary|question distributions|saved views/i).first()
    ).toBeVisible({ timeout: 30_000 });

    await page.goto(`${base}/dashboard/surveys/${surveyId}/reports`);
    await expect(
      page.getByText(/generate report|download|pdf|donor|sections|report/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test('assistant workspace opens and can send a starter', async ({ page }) => {
    await signIn(page);
    await page.goto(`${base}/dashboard/assistant`);
    await expect(
      page.getByRole('button', { name: /new chat/i }).first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByPlaceholder(/ask about your org research/i)
    ).toBeVisible({ timeout: 20_000 });

    const starter = page
      .getByRole('button', {
        name: /what surveys do we have|summarize the latest|needs the most attention/i
      })
      .first();
    if (await starter.count()) {
      await starter.click();
    } else {
      const input = page.getByPlaceholder(/ask about your org research/i);
      await input.fill('What surveys do we have?');
      await page.getByRole('button', { name: /send message/i }).click();
    }

    await expect(
      page
        .getByText(
          /saving your question|searching org knowledge|planning tools|fetching metrics|writing answer|typing/i
        )
        .first()
    ).toBeVisible({ timeout: 20_000 });

    // Grounded Gemini reply — allow cold start + tools
    await expect(
      page.locator('[class*="rounded-bl-md"]').filter({ hasText: /.+/ }).last()
    ).toBeVisible({ timeout: 180_000 });
  });
});
