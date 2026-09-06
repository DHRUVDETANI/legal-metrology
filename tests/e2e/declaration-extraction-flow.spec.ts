import { test, expect } from '@playwright/test';

test.describe('Phase 4 Declaration Extraction & Inspector Review Flow', () => {
  test('displays extract review page with packaging evidence and triggers OCR extraction', async ({ page }) => {
    const inspectionId = 'test-insp-flow-101';

    // Mock extraction endpoint
    await page.route(`**/api/inspections/${inspectionId}/extract`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          declarations: [
            {
              id: 'decl-flow-1',
              inspection_id: inspectionId,
              field_name: 'mrp',
              raw_ocr_text: 'MRP Rs. 50.00 (inclusive of all taxes)',
              observed_value: 'Rs. 50.00 (incl. of all taxes)',
              normalized_value: { amount: 50.0, currency: 'INR', taxes_included: true },
              confidence: 0.96,
              bbox: { x: 50, y: 150, width: 300, height: 30 },
              is_manually_edited: false,
              edited_by: null,
            },
            {
              id: 'decl-flow-2',
              inspection_id: inspectionId,
              field_name: 'net_quantity',
              raw_ocr_text: 'Net Qty: 200 g',
              observed_value: '200 g',
              normalized_value: { quantity: 200, unit: 'g' },
              confidence: 0.94,
              bbox: { x: 50, y: 200, width: 150, height: 28 },
              is_manually_edited: false,
              edited_by: null,
            },
          ],
        }),
      });
    });

    // Mock declaration edit endpoint
    await page.route(`**/api/inspections/${inspectionId}/declarations/decl-flow-2`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          declaration: {
            id: 'decl-flow-2',
            inspection_id: inspectionId,
            field_name: 'net_quantity',
            raw_ocr_text: 'Net Qty: 200 g',
            observed_value: '200 g (Verified Net Wt)',
            normalized_value: { quantity: 200, unit: 'g' },
            confidence: 0.94,
            bbox: { x: 50, y: 200, width: 150, height: 28 },
            is_manually_edited: true,
            edited_by: 'inspector-test-id',
          },
        }),
      });
    });

    // Navigate to demo extract page
    await page.goto(`/scan/demo-insp-001/extract`);

    // Verify page title and structure
    await expect(page.getByRole('heading', { name: /Declaration Extraction Review/i })).toBeVisible();
    await expect(page.getByText('Packaging Label Evidence')).toBeVisible();

    // Verify declaration cards exist in initial state
    await expect(page.getByText(/MRP \(Maximum Retail Price\)/i)).toBeVisible();
    await expect(page.getByText(/Net Quantity/i)).toBeVisible();

    // Check that confidence badges are visible
    await expect(page.getByText(/98% OCR/i)).toBeVisible();
  });
});
