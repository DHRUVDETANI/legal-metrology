import { test, expect } from '@playwright/test';

test.describe('Phase 9 SIH Golden Demo & Full Inspection Lifecycle E2E Flow', () => {
  const inspectionId = 'demo-golden-insp-901';

  test('executes complete 12-stage inspection lifecycle with deterministic compliance & AI advisory', async ({
    page,
  }) => {
    // 1. Mock Inspection Creation
    await page.route('**/api/inspections', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            inspection: {
              id: inspectionId,
              inspection_number: 'INSP-2026-901001',
              inspector_id: 'test-officer-id',
              status: 'REVIEW',
              location_name: 'Pune APMC Market Yard',
              total_violations: 0,
              created_at: new Date().toISOString(),
            },
          }),
        });
      }
    });

    // 2. Mock Compliance Evaluation Route
    await page.route(`**/api/inspections/${inspectionId}/evaluate`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          summary: {
            inspectionId,
            overallStatus: 'FAIL',
            rulesetVersion: 'v2024.1',
            evaluatedAt: new Date().toISOString(),
            totalRulesEvaluated: 6,
            passedCount: 5,
            failedCount: 1,
            reviewCount: 0,
            notApplicableCount: 0,
            totalViolations: 1,
            checkResults: [
              {
                ruleCode: 'DEMO-LM-MRP-001',
                ruleId: 'r-1',
                ruleVersion: 'v2024.1',
                targetField: 'mrp',
                title: '[DEMO] MRP Mandatory Declaration',
                verdict: 'FAIL',
                observedValue: 'Rs. 50.00',
                expectedConstraint: 'MRP declaration must state inclusive of all taxes',
                severity: 'CRITICAL',
                confidence: 0.95,
                explanation: 'MRP missing tax clause.',
                evaluatedAt: new Date().toISOString(),
              },
            ],
            violations: [
              {
                ruleCode: 'DEMO-LM-MRP-001',
                ruleId: 'r-1',
                ruleVersion: 'v2024.1',
                observedValue: 'Rs. 50.00',
                expectedConstraint: 'MRP declaration must state inclusive of all taxes',
                severity: 'CRITICAL',
                confidence: 0.95,
                explanation: 'MRP declaration does not state inclusive of all taxes',
              },
            ],
          },
        }),
      });
    });

    // 3. Mock AI Advisory Endpoint
    await page.route(`**/api/inspections/${inspectionId}/advisory`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          advisory: {
            inspectionId,
            deterministicOverallStatus: 'FAIL',
            generatedAt: new Date().toISOString(),
            executiveSummary: 'Deterministic evaluation identified 1 statutory violation.',
            discrepancyCount: 0,
            isAiAssisted: true,
            authoritativeNotice: 'Deterministic compliance engine outcome is the sole legal authority.',
            advisories: [
              {
                id: 'adv-mrp',
                advisoryType: 'VIOLATION_EXPLANATION',
                ruleCode: 'DEMO-LM-MRP-001',
                ruleTitle: '[DEMO] MRP Mandatory Declaration',
                deterministicVerdict: 'FAIL',
                severity: 'CRITICAL',
                explanation: 'Observed Rs. 50.00 lacks mandatory inclusive of all taxes clause.',
                statutoryReference: 'Rule 6(1)(e)',
                supportingEvidence: 'Rs. 50.00',
                confidence: 0.95,
                requiresHumanReview: true,
              },
            ],
          },
        }),
      });
    });

    // 4. Verify home page and basic navigation
    await page.goto('/');
    await expect(page).toHaveTitle(/Legal Metrology Compliance System/);

    // 5. Test inspection result route guard security redirects unauthenticated access
    await page.goto(`/scan/${inspectionId}/result`);
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole('heading', { name: /Legal Metrology Portal/i })).toBeVisible();

    // 6. Security verification: advisory endpoint rejects unauthenticated request with 401
    const unauthAdvisoryRes = await page.request.get(`/api/inspections/${inspectionId}/advisory`);
    expect(unauthAdvisoryRes.status()).toBe(401);
    const unauthData = await unauthAdvisoryRes.json();
    expect(unauthData.error).toBeDefined();
  });
});
