import { test, expect } from '@playwright/test';

test.describe('Phase 8 Dashboard & Operational Monitoring E2E Flow', () => {
  test('unauthenticated dashboard routes redirect to login', async ({ page }) => {
    // 1. Unauthenticated access to /admin
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/login/);

    // 2. Unauthenticated access to /reviewer
    await page.goto('/reviewer');
    await expect(page).toHaveURL(/.*\/login/);

    // 3. Unauthenticated access to /reviewer/queue
    await page.goto('/reviewer/queue');
    await expect(page).toHaveURL(/.*\/login/);

    // 4. Unauthenticated access to /admin/rules
    await page.goto('/admin/rules');
    await expect(page).toHaveURL(/.*\/login/);

    // 5. Unauthenticated access to /admin/users
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/.*\/login/);

    // 6. Unauthenticated access to /admin/audit-logs
    await page.goto('/admin/audit-logs');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('GET /api/dashboard/stats rejects unauthenticated requests with 401', async ({ request }) => {
    const response = await request.get('/api/dashboard/stats');
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
