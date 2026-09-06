import { test, expect } from '@playwright/test';

test.describe('Phase 0 Application Shell Smoke Test', () => {
  test('renders home page and verifies core navigation', async ({ page }) => {
    await page.goto('/');

    // Verify title and header elements
    await expect(page).toHaveTitle(/Legal Metrology Compliance System/);
    await expect(page.getByRole('heading', { name: 'Legal Metrology Compliance System' })).toBeVisible();
    await expect(page.getByText('PS26034 Compliance')).toBeVisible();

    // Verify Scan CTA button exists and is accessible
    const scanButton = page.getByRole('button', { name: /Scan Product/i });
    await expect(scanButton).toBeVisible();

    // Verify Phase 0 badge
    await expect(page.getByText('Phase 0 Foundation')).toBeVisible();
  });

  test('health API endpoint returns ok status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('ps26034-web');
  });
});
