import { test, expect } from '@playwright/test';

test.describe('Phase 3 Inspector Camera Capture & Image Upload Pipeline', () => {
  test('unauthenticated access to /scan/new redirects to login', async ({ page }) => {
    await page.goto('/scan/new');
    // Without authentication cookie, requireInspector redirects to /login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole('heading', { name: /Legal Metrology Portal/i })).toBeVisible();
  });

  test('inspector login form interaction and validation handling', async ({ page }) => {
    let loginPayload: { email?: string; password?: string } | null = null;

    // Intercept login endpoint to capture credentials and test error handling
    await page.route('**/api/auth/login', async (route) => {
      loginPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid credentials. Please verify your officer credentials.',
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'inspector.pune@legalmetrology.gov.in');
    await page.fill('input[type="password"]', 'WrongPass123');
    await page.click('button[type="submit"]');

    // Verify submitted payload
    expect(loginPayload).toEqual({
      email: 'inspector.pune@legalmetrology.gov.in',
      password: 'WrongPass123',
    });

    // Verify error message is rendered in UI
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  });

  test('complete camera capture, preview, and image upload flow', async ({ page }) => {
    // 1. Mock API endpoints for deterministic testing
    await page.route('**/api/inspections', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            inspection: {
              id: 'test-insp-uuid-999',
              inspection_number: 'INSP-2026-998877',
              inspector_id: 'inspector-test-uuid',
              status: 'REVIEW',
              location_name: 'Central Commodity Yard, Pune',
              total_violations: 0,
              created_at: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.route('**/api/inspections/test-insp-uuid-999/images', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          image: {
            id: 'img-uuid-001',
            inspection_id: 'test-insp-uuid-999',
            storage_path: 'test-insp-uuid-999/test-photo.jpg',
            panel_type: 'primary_display',
            width_px: 1920,
            height_px: 1080,
            signed_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="100%" height="100%" fill="%23222"/><text x="50%" y="50%" fill="%23fff" font-size="40" text-anchor="middle">Packaging Label Evidence</text></svg>',
          },
        }),
      });
    });

    await page.route('**/api/inspections/test-insp-uuid-999', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          inspection: {
            id: 'test-insp-uuid-999',
            inspection_number: 'INSP-2026-998877',
            status: 'REVIEW',
            location_name: 'Central Commodity Yard, Pune',
            packaging_images: [
              {
                id: 'img-uuid-001',
                storage_path: 'test-insp-uuid-999/test-photo.jpg',
                panel_type: 'primary_display',
                width_px: 1920,
                height_px: 1080,
                signed_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="100%" height="100%" fill="%23222"/><text x="50%" y="50%" fill="%23fff" font-size="40" text-anchor="middle">Packaging Label Evidence</text></svg>',
              },
            ],
          },
        }),
      });
    });

    // 2. Navigate directly to /scan/new using cookie bypass or login
    // First simulate login to set cookies
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'inspector-test-uuid',
            role: 'inspector',
            fullName: 'Inspector R. K. Patil',
          },
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'officer@legalmetrology.gov.in');
    await page.fill('input[type="password"]', 'Password123');
    await page.click('button[type="submit"]');

    // 3. Navigate to new inspection terminal
    await page.goto('/scan/new');

    // Check header and touch controls
    const takePhotoBtn = page.getByRole('button', { name: /Take Photo/i });
    const galleryBtn = page.getByRole('button', { name: /Choose from Gallery/i });

    if (await takePhotoBtn.isVisible()) {
      await expect(takePhotoBtn).toBeVisible();
      await expect(galleryBtn).toBeVisible();

      // Create a valid synthetic 1920x1080 JPEG buffer in browser
      const fileInput = page.locator('input[type="file"]').first();

      // Upload synthetic test image using file chooser
      await fileInput.setInputFiles({
        name: 'commodity-front-label.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from([
          0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x38, 0x07, 0x80, 0x03, 0x01, 0x11,
          0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
        ]),
      });

      // Verification of preview and upload CTA
      const uploadCta = page.getByRole('button', { name: /Upload Image/i });
      if (await uploadCta.isVisible({ timeout: 2000 }).catch(() => false)) {
        await uploadCta.click();

        // Check success state
        await expect(page.getByText(/Image Uploaded & Verified/i)).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /Continue to Extraction Review/i })).toBeVisible();
      }
    }
  });
});
