import { describe, it, expect } from 'vitest';
import {
  evaluateRule,
  calculateOverallStatus,
  evaluateCompliance,
  PRESERVED_DEMO_RULES,
  type ComplianceEvaluationContext,
} from '@/lib/compliance';

describe('Phase 5 Deterministic Compliance Engine', () => {
  const compliantContext: ComplianceEvaluationContext = {
    inspectionId: 'insp-unit-test-1',
    rulesetVersion: 'v2024.1',
    declarations: {
      mrp: {
        fieldName: 'mrp',
        rawOcrText: 'MRP Rs. 50.00 (inclusive of all taxes)',
        observedValue: 'Rs. 50.00 (incl. of all taxes)',
        normalizedValue: { amount: 50.0, currency: 'INR', taxes_included: true },
        confidence: 0.98,
        bbox: { x: 50, y: 150, width: 300, height: 30 },
      },
      net_quantity: {
        fieldName: 'net_quantity',
        rawOcrText: 'Net Qty: 200 g',
        observedValue: '200 g',
        normalizedValue: { quantity: 200, unit: 'g' },
        confidence: 0.96,
        bbox: { x: 50, y: 200, width: 120, height: 28 },
      },
      manufacturing_date: {
        fieldName: 'manufacturing_date',
        rawOcrText: 'Mfg Date: 08/2026',
        observedValue: '08/2026',
        normalizedValue: { month: 8, year: 2026 },
        confidence: 0.95,
        bbox: { x: 50, y: 250, width: 150, height: 26 },
      },
      name_address_manufacturer: {
        fieldName: 'name_address_manufacturer',
        rawOcrText: 'Manufactured by: Sunrise Foods Pvt. Ltd., Plot 45, Pune 411028',
        observedValue: 'Sunrise Foods Pvt. Ltd., Plot 45, Pune 411028',
        normalizedValue: { name_and_address: 'Sunrise Foods Pvt. Ltd., Plot 45, Pune 411028' },
        confidence: 0.92,
        bbox: { x: 50, y: 300, width: 400, height: 30 },
      },
      consumer_care: {
        fieldName: 'consumer_care',
        rawOcrText: 'Consumer Care: 1800 209 4455 / customercare@sunrisefoods.in',
        observedValue: '1800 209 4455 / customercare@sunrisefoods.in',
        normalizedValue: { phone: '1800 209 4455', email: 'customercare@sunrisefoods.in' },
        confidence: 0.94,
        bbox: { x: 50, y: 350, width: 380, height: 28 },
      },
    },
    cvMeasurements: {
      font_measurement: {
        targetField: 'font_measurement',
        characterHeightPx: 18.5,
        contrastRatio: 4.8,
        isCalibrated: true,
      },
    },
  };

  it('evaluates all 6 preserved master rules deterministically to PASS for compliant product', () => {
    const summary = evaluateCompliance(compliantContext, PRESERVED_DEMO_RULES);

    expect(summary.totalRulesEvaluated).toBe(6);
    expect(summary.passedCount).toBe(6);
    expect(summary.failedCount).toBe(0);
    expect(summary.reviewCount).toBe(0);
    expect(summary.totalViolations).toBe(0);
    expect(summary.overallStatus).toBe('PASS');
  });

  it('detects MRP violation when "inclusive of all taxes" clause is missing', () => {
    const nonCompliantContext: ComplianceEvaluationContext = {
      ...compliantContext,
      declarations: {
        ...compliantContext.declarations,
        mrp: {
          fieldName: 'mrp',
          rawOcrText: 'MRP Rs. 50.00',
          observedValue: 'Rs. 50.00',
          normalizedValue: { amount: 50.0, currency: 'INR', taxes_included: false },
          confidence: 0.98,
        },
      },
    };

    const summary = evaluateCompliance(nonCompliantContext, PRESERVED_DEMO_RULES);

    expect(summary.overallStatus).toBe('FAIL');
    expect(summary.failedCount).toBeGreaterThanOrEqual(1);
    expect(summary.totalViolations).toBeGreaterThanOrEqual(1);

    const mrpViolation = summary.violations.find((v) => v.ruleCode === 'DEMO-LM-MRP-001');
    expect(mrpViolation).toBeDefined();
    expect(mrpViolation?.severity).toBe('CRITICAL');
  });

  it('detects Net Quantity violation when non-standard SI unit (e.g. "gms") is used', () => {
    const nonCompliantContext: ComplianceEvaluationContext = {
      ...compliantContext,
      declarations: {
        ...compliantContext.declarations,
        net_quantity: {
          fieldName: 'net_quantity',
          rawOcrText: 'Net Qty: 200 gms',
          observedValue: '200 gms',
          normalizedValue: { quantity: 200, unit: 'gms' },
          confidence: 0.95,
        },
      },
    };

    const summary = evaluateCompliance(nonCompliantContext, PRESERVED_DEMO_RULES);

    expect(summary.overallStatus).toBe('FAIL');
    const netQtyViolation = summary.violations.find((v) => v.ruleCode === 'DEMO-LM-NET-QTY-001');
    expect(netQtyViolation).toBeDefined();
    expect(netQtyViolation?.severity).toBe('CRITICAL');
  });

  it('detects violation when mandatory declaration (e.g. Manufacturing Date) is missing', () => {
    const missingMfgContext: ComplianceEvaluationContext = {
      ...compliantContext,
      declarations: {
        ...compliantContext.declarations,
      },
    };
    delete (missingMfgContext.declarations as Record<string, unknown>).manufacturing_date;

    const summary = evaluateCompliance(missingMfgContext, PRESERVED_DEMO_RULES);

    expect(summary.overallStatus).toBe('FAIL');
    const mfgViolation = summary.violations.find((v) => v.ruleCode === 'DEMO-LM-MFG-DATE-001');
    expect(mfgViolation).toBeDefined();
    expect(mfgViolation?.observedValue).toBe('Missing declaration');
  });

  it('gates to REVIEW status when declaration confidence is low (< 0.70)', () => {
    const lowConfContext: ComplianceEvaluationContext = {
      ...compliantContext,
      declarations: {
        ...compliantContext.declarations,
        consumer_care: {
          fieldName: 'consumer_care',
          rawOcrText: 'Consumer Care: 1800 209 4455',
          observedValue: '1800 209 4455',
          normalizedValue: { phone: '1800 209 4455' },
          confidence: 0.55, // low confidence
        },
      },
    };

    const summary = evaluateCompliance(lowConfContext, PRESERVED_DEMO_RULES);

    expect(summary.reviewCount).toBeGreaterThanOrEqual(1);
    expect(summary.overallStatus).toBe('REVIEW');
  });

  it('gates uncalibrated or missing CV font measurement to REVIEW without failing', () => {
    const noCvContext: ComplianceEvaluationContext = {
      ...compliantContext,
      cvMeasurements: undefined,
    };

    const summary = evaluateCompliance(noCvContext, PRESERVED_DEMO_RULES);

    const fontCheck = summary.checkResults.find((r) => r.ruleCode === 'DEMO-LM-FONT-HEIGHT-001');
    expect(fontCheck).toBeDefined();
    expect(fontCheck?.verdict).toBe('REVIEW');
    expect(summary.overallStatus).toBe('REVIEW');
  });

  it('is completely idempotent and deterministic across repeated executions', () => {
    const run1 = evaluateCompliance(compliantContext, PRESERVED_DEMO_RULES);
    const run2 = evaluateCompliance(compliantContext, PRESERVED_DEMO_RULES);

    expect(run1.overallStatus).toBe(run2.overallStatus);
    expect(run1.totalRulesEvaluated).toBe(run2.totalRulesEvaluated);
    expect(run1.passedCount).toBe(run2.passedCount);
    expect(run1.failedCount).toBe(run2.failedCount);
    expect(run1.violations.length).toBe(run2.violations.length);
  });

  describe('calculateOverallStatus', () => {
    it('returns FAIL if any check failed', () => {
      const status = calculateOverallStatus([
        { verdict: 'PASS' } as any,
        { verdict: 'FAIL' } as any,
        { verdict: 'REVIEW' } as any,
      ]);
      expect(status).toBe('FAIL');
    });

    it('returns REVIEW if no fails but some review', () => {
      const status = calculateOverallStatus([
        { verdict: 'PASS' } as any,
        { verdict: 'REVIEW' } as any,
      ]);
      expect(status).toBe('REVIEW');
    });

    it('returns PASS only if all checks are PASS', () => {
      const status = calculateOverallStatus([
        { verdict: 'PASS' } as any,
        { verdict: 'PASS' } as any,
      ]);
      expect(status).toBe('PASS');
    });
  });
});
