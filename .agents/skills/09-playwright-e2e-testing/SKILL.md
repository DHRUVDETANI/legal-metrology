---
name: playwright-e2e-testing
description: >-
  Playwright end-to-end testing suite for all user roles, label upload, OCR extraction,
  compliance verdicts, evidence verification, and negative edge cases in PS26034.
  Use when writing, executing, or debugging browser integration tests, test fixtures,
  or CI test pipelines.
---

# Playwright E2E Testing

This skill establishes the end-to-end automated testing strategy, critical test suites, selector practices, and mocking guidelines for **SIH PS26034** using Playwright.

---

## 1. Playwright Testing Philosophy

- **Test Real Workflows**: Playwright tests must validate full browser user journeys from login to report generation.
- **Accessible & Resilient Selectors**: Prefer role-based selectors (`getByRole`), text locators (`getByText`), label associations (`getByLabel`), or explicit test IDs (`getByTestId`) over fragile CSS class selectors.
- **Deterministic Test Environment**: Mock external non-deterministic cloud APIs (hosted OCR, external LLM calls) with predictable test fixtures to ensure reproducible CI/CD runs. Keep internal API routes, compliance engine, and database integration real.

---

## 2. 14 Critical User Journey Test Suites

Every deployment must validate these 14 core journeys:

1. **Inspector Authentication**: Login with inspector credentials, session establishment, redirect to mobile inspection screen.
2. **Administrator Authentication**: Login with admin credentials, access to administrative settings and user management.
3. **Reviewer Authentication**: Login with reviewer credentials, access to flagged review queue.
4. **Product Label Image Upload**: File picker and drag-and-drop packaging photo upload with instant client preview.
5. **OCR Ingestion & Progress**: Execution of OCR pipeline, display of loading indicator, receipt of raw text tokens.
6. **Declaration Field Mapping**: Verification that OCR text correctly maps to mandatory fields (MRP, Net Qty, Mfg Date, Manufacturer).
7. **Font & Readability Metrics**: Inspection screen reflects calculated character height in pixels and contrast ratio.
8. **Deterministic Compliance Evaluation**: Rule engine executes upon confirmation, yielding expected `PASS`, `FAIL`, or `REVIEW` badge.
9. **Violation Presentation**: For non-compliant packages, violation cards render correct rule codes, observed values, and statutory requirements.
10. **Evidence & Bounding Box Display**: Clicking a violation highlights the corresponding polygon on the visual evidence canvas.
11. **PDF Report Generation**: Generation of official PDF report, download initiation, and verification of non-empty binary blob.
12. **Inspection History Persistence**: New inspection appears immediately in inspector's local and cloud history list.
13. **Reviewer Audit Workflow**: Reviewer opens flagged `REVIEW` inspection, audits evidence crop, adds audit comment, and updates status.
14. **Admin Rule Configuration**: Administrator updates or disables a compliance rule; subsequent inspection reflects modified rule logic.

---

## 3. Negative & Edge-Case Test Scenarios

The test suite must explicitly assert proper error handling for:

- **Invalid / Corrupted Image Files**: Non-image file types (e.g. `.exe`, `.txt`) or corrupted image payloads rejected with clear error message.
- **Unsupported Dimensions / Oversized Files**: Image payloads exceeding maximum file size limits (15MB) rejected gracefully.
- **Degraded Image Quality (Extreme Blur / Glare)**: Laplacian variance below threshold flags image with quality warning prompting re-capture.
- **OCR Engine Downtime / Timeout**: Graceful fallback and user-facing alert when OCR service times out.
- **Missing Mandatory Declarations**: Label missing MRP or Net Quantity produces definitive statutory `FAIL` with associated rule codes.
- **Low Confidence OCR**: Unclear text segments routed directly to `REVIEW` status without false-positive failures.
- **Unauthorized Role Access**: Inspector attempting to access `/admin/rules` or modify another inspector's scan receives `403 Forbidden`.

---

## 4. Test Example: Inspector Upload & Compliance Check

```typescript
import { test, expect } from '@playwright/test';

test.describe('Inspector Scanning & Compliance Flow', () => {
  test('should upload label image, review declarations, and display compliance failure', async ({ page }) => {
    // 1. Authenticate as field inspector
    await page.goto('/login');
    await page.getByLabel('Email').fill('inspector.delhi@gov.in');
    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/scan');

    // 2. Upload test label image (Non-compliant: missing tax text)
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('upload-label-btn').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/labels/mrp_missing_tax.jpg');

    // 3. Wait for OCR and field extraction
    await expect(page.getByTestId('processing-indicator')).toBeVisible();
    await expect(page.getByTestId('declaration-review-table')).toBeVisible({ timeout: 15000 });

    // 4. Assert extracted fields
    await expect(page.getByTestId('field-mrp-observed')).toContainText('₹ 250.00');
    await expect(page.getByTestId('field-net-qty-observed')).toContainText('500 g');

    // 5. Trigger compliance engine evaluation
    await page.getByRole('button', { name: 'Evaluate Compliance' }).click();

    // 6. Assert verdict and violation details
    await expect(page.getByTestId('overall-status-badge')).toHaveText('FAIL');
    await expect(page.getByTestId('violation-card-LM-R6-MRP-INCL-TAX')).toBeVisible();
    await expect(page.getByTestId('violation-card-LM-R6-MRP-INCL-TAX')).toContainText(
      'Missing required text: inclusive of all taxes'
    );

    // 7. Test PDF report download
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Generate Inspection Report' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
```

---

## 5. Execution Workflow

- Run fast headless tests during active development: `npx playwright test`.
- Run visual UI tests when debugging layouts: `npx playwright test --ui`.
- Execute test run after any UI, route, or compliance engine change.
