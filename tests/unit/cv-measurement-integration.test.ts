import { describe, it, expect } from 'vitest';
import { measureFontGeometry } from '@/lib/cv/client';
import { evaluateCompliance, PRESERVED_DEMO_RULES } from '@/lib/compliance';

describe('Phase 6 Computer Vision Measurement Integration with Compliance Engine', () => {
  it('measures character height from candidate text bounding box', async () => {
    const result = await measureFontGeometry({
      bbox: { x: 50, y: 100, width: 250, height: 35 },
      targetField: 'net_quantity',
    });

    expect(result.characterHeightPx).toBeGreaterThan(15.0);
    expect(result.isCalibrated).toBe(false);
    expect(result.characterHeightMm).toBeNull();
    expect(result.contrastRatio).toBeGreaterThan(1.0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.70);
  });

  it('calculates physical height in mm when calibration factor is provided', async () => {
    // 10 pixels per mm calibration scale factor
    const result = await measureFontGeometry({
      bbox: { x: 50, y: 100, width: 250, height: 35 },
      targetField: 'net_quantity',
      calibrationFactor: 10.0,
    });

    expect(result.isCalibrated).toBe(true);
    expect(result.characterHeightMm).toBeDefined();
    expect(result.characterHeightMm).toBe(Number((result.characterHeightPx / 10.0).toFixed(2)));
  });

  it('integrates CV measurement into Phase 5 compliance engine rule evaluation', () => {
    // Evaluation context with compliant declarations and CV measurement
    const context = {
      inspectionId: 'insp-cv-integ-1',
      rulesetVersion: 'v2024.1',
      declarations: {
        mrp: {
          fieldName: 'mrp',
          rawOcrText: 'MRP Rs. 50.00 (inclusive of all taxes)',
          observedValue: 'Rs. 50.00 (incl. of all taxes)',
          normalizedValue: { amount: 50, currency: 'INR', taxes_included: true },
          confidence: 0.98,
        },
        net_quantity: {
          fieldName: 'net_quantity',
          rawOcrText: 'Net Qty: 200 g',
          observedValue: '200 g',
          normalizedValue: { quantity: 200, unit: 'g' },
          confidence: 0.96,
        },
        manufacturing_date: {
          fieldName: 'manufacturing_date',
          rawOcrText: 'Mfg Date: 08/2026',
          observedValue: '08/2026',
          normalizedValue: { month: 8, year: 2026 },
          confidence: 0.95,
        },
        name_address_manufacturer: {
          fieldName: 'name_address_manufacturer',
          rawOcrText: 'Manufactured by: Sunrise Foods Pvt. Ltd., Pune',
          observedValue: 'Sunrise Foods Pvt. Ltd., Pune',
          normalizedValue: { name_and_address: 'Sunrise Foods Pvt. Ltd., Pune' },
          confidence: 0.92,
        },
        consumer_care: {
          fieldName: 'consumer_care',
          rawOcrText: 'Consumer Care: 1800 209 4455',
          observedValue: '1800 209 4455',
          normalizedValue: { phone: '1800 209 4455' },
          confidence: 0.93,
        },
      },
      cvMeasurements: {
        font_measurement: {
          targetField: 'font_measurement',
          characterHeightPx: 22.0, // Above 15px threshold in DEMO rule
          contrastRatio: 6.5,
          isCalibrated: true,
        },
      },
    };

    const summary = evaluateCompliance(context, PRESERVED_DEMO_RULES);

    const fontCheck = summary.checkResults.find((r) => r.ruleCode === 'DEMO-LM-FONT-HEIGHT-001');
    expect(fontCheck).toBeDefined();
    expect(fontCheck?.verdict).toBe('PASS');
    expect(fontCheck?.observedValue).toContain('22 px');
    expect(summary.overallStatus).toBe('PASS');
  });

  it('evaluates font rule to REVIEW when CV measurement is uncalibrated', () => {
    const context = {
      inspectionId: 'insp-cv-integ-2',
      rulesetVersion: 'v2024.1',
      declarations: {
        mrp: {
          fieldName: 'mrp',
          rawOcrText: 'MRP Rs. 50.00 (inclusive of all taxes)',
          observedValue: 'Rs. 50.00 (incl. of all taxes)',
          normalizedValue: { amount: 50, currency: 'INR', taxes_included: true },
          confidence: 0.98,
        },
        net_quantity: {
          fieldName: 'net_quantity',
          rawOcrText: 'Net Qty: 200 g',
          observedValue: '200 g',
          normalizedValue: { quantity: 200, unit: 'g' },
          confidence: 0.96,
        },
        manufacturing_date: {
          fieldName: 'manufacturing_date',
          rawOcrText: 'Mfg Date: 08/2026',
          observedValue: '08/2026',
          normalizedValue: { month: 8, year: 2026 },
          confidence: 0.95,
        },
        name_address_manufacturer: {
          fieldName: 'name_address_manufacturer',
          rawOcrText: 'Manufactured by: Sunrise Foods Pvt. Ltd., Pune',
          observedValue: 'Sunrise Foods Pvt. Ltd., Pune',
          normalizedValue: { name_and_address: 'Sunrise Foods Pvt. Ltd., Pune' },
          confidence: 0.92,
        },
        consumer_care: {
          fieldName: 'consumer_care',
          rawOcrText: 'Consumer Care: 1800 209 4455',
          observedValue: '1800 209 4455',
          normalizedValue: { phone: '1800 209 4455' },
          confidence: 0.93,
        },
      },
      cvMeasurements: {
        font_measurement: {
          targetField: 'font_measurement',
          characterHeightPx: 12.0, // Below nominal threshold while uncalibrated
          contrastRatio: 5.0,
          isCalibrated: false,
        },
      },
    };

    const summary = evaluateCompliance(context, PRESERVED_DEMO_RULES);

    const fontCheck = summary.checkResults.find((r) => r.ruleCode === 'DEMO-LM-FONT-HEIGHT-001');
    expect(fontCheck).toBeDefined();
    // In Phase 5 operators.ts: uncalibrated below threshold yields REVIEW to avoid false negative
    expect(fontCheck?.verdict).toBe('REVIEW');
    expect(summary.overallStatus).toBe('REVIEW');
  });
});
