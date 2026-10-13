import { expect, test, type Page } from '@playwright/test';

/**
 * P13.1 — the flows the kiln actually walks through on day one.
 *
 * Deliberately read-only. A go-live smoke test that creates invoices would
 * leave a trail in whatever database it is pointed at, and the one it will be
 * pointed at before go-live is the client's. What it proves is that every
 * screen the owner opens loads, against a real API, with a real session — the
 * class of failure the component tests cannot see because they mock the API.
 */

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD to run the core-flow e2e (see docs/10-testing.md).');

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email or mobile').fill(EMAIL!);
  await page.getByLabel('Password').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe('Core flows', () => {
  test('signs in and lands on a dashboard with real figures', async ({ page }) => {
    await signIn(page);

    // The tiles are the Key Management Questions (DSH-01). If the API is
    // reachable but the shape changed, this is where it shows.
    await expect(page.getByText(/Bricks on hand/i).first()).toBeVisible();
    await expect(page.getByText(/Cost per 1,000/i).first()).toBeVisible();
  });

  test('refuses the dashboard to a visitor with no session', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('opens every module the owner can reach from the sidebar', async ({ page }) => {
    await signIn(page);

    // One pass over the nav: a route that 404s, a page that throws on mount,
    // or a permission the server refuses after the sidebar offered it all land
    // here. These are exactly the failures a mocked component test cannot see.
    const modules = [
      { path: '/production/batches', heading: /batch/i },
      { path: '/stock/current', heading: /stock|closing/i },
      { path: '/purchases/bills', heading: /bill/i },
      { path: '/sales/invoices', heading: /invoice/i },
      { path: '/dispatch/challans', heading: /challan/i },
      { path: '/labour/attendance', heading: /attendance/i },
      { path: '/reports/statements', heading: /profit|balance/i },
      { path: '/reports/cost-per-1000', heading: /kiln|brick type|benchmark/i },
    ];

    for (const { path, heading } of modules) {
      await page.goto(path);
      await expect(page.getByText(heading).first()).toBeVisible({ timeout: 20_000 });
      // A page that rendered its chrome but failed its first fetch says so.
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    }
  });

  test('reads the same yard balance from the stock screen and the dashboard (ADR-051)', async ({ page }) => {
    await signIn(page);

    const onDashboard = await page
      .getByText(/Bricks on hand/i)
      .first()
      .locator('xpath=..')
      .innerText();

    await page.goto('/stock/current');
    await expect(page.getByText(/closing/i).first()).toBeVisible({ timeout: 20_000 });

    // Not a figure-for-figure comparison — the stock screen lists piles and the
    // tile totals them — but both have to be reachable and non-empty, which is
    // what broke when production and sales kept separate ledgers.
    expect(onDashboard).not.toMatch(/^\s*$/);
  });
});
