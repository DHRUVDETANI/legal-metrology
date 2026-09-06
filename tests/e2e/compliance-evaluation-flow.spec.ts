import { test, expect } from '@playwright/test';

test.describe('Phase 5 Deterministic Compliance Evaluation Flow', () => {
  test('evaluates candidate declarations, renders compliance result view, and displays rule verdicts', async ({
    page,
  }) => {
    const inspectionId = 'test-insp-flow-201';

    // Mock evaluation endpoint
    await page.route(`**/api/inspections/${inspectionId}/evaluate`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          summary: {
            inspectionId,
            overallStatus: 'PASS',
            rulesetVersion: 'v2024.1',
            evaluatedAt: new Date().toISOString(),
            totalRulesEvaluated: 6,
            passedCount: 6,
            failedCount: 0,
            reviewCount: 0,
            notApplicableCount: 0,
            totalViolations: 0,
            checkResults: [
              {
                ruleCode: 'DEMO-LM-MRP-001',
                ruleId: 'r-1',
                ruleVersion: 'v2024.1',
                targetField: 'mrp',
                title: '[DEMO] MRP Mandatory Declaration',
                verdict: 'PASS',
                observedValue: 'Rs. 50.00 (incl. of all taxes)',
                expectedConstraint: 'MRP declaration must state inclusive of all taxes',
                severity: 'CRITICAL',
                confidence: 0.98,
                explanation: 'Declaration matches statutory format requirements.',
                evaluatedAt: new Date().toISOString(),
              },
              {
                ruleCode: 'DEMO-LM-NET-QTY-001',
                ruleId: 'r-2',
                ruleVersion: 'v2024.1',
                targetField: 'net_quantity',
                title: '[DEMO] Net Quantity with SI Unit',
                verdict: 'PASS',
                observedValue: '200 g',
                expectedConstraint: 'Net quantity must be expressed with standard SI unit symbol',
                severity: 'CRITICAL',
                confidence: 0.96,
                explanation: 'Declaration matches statutory format requirements.',
                evaluatedAt: new Date().toISOString(),
              },
            ],
            violations: [],
          },
        }),
      });
    });

    // Navigate to demo result page
    await page.goto(`/scan/demo-insp-001/result`);

    // Verify page title and structure
    await expect(page.getByRole('heading', { name: /Compliance Verdict & Findings/i })).toBeVisible();

    // Verify status badge and rules ledger
    await expect(page.getByText('Statutory Rules Evaluation Ledger')).toBeVisible();

    // Verify metrics cards exist
    await expect(page.getByText('Rules Checked')).toBeVisible();
    await expect(page.getByText('Satisfied')).toBeVisible();

    // Verify Re-run evaluation button exists
    await expect(page.getByRole('button', { name: /Re-run Evaluation/i })).toBeVisible();
  });
});
