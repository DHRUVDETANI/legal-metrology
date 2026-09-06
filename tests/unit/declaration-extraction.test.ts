import { describe, it, expect } from 'vitest';
import { extractCandidateDeclarations } from '@/lib/declarations/extractor';
import type { RawOcrResult } from '@/lib/ocr/types';

describe('Phase 4 Candidate Declaration Extraction Pipeline', () => {
  const mockRawOcr: RawOcrResult = {
    fullText: `SUNRISE WHOLE WHEAT BISCUITS
MRP Rs. 50.00 (inclusive of all taxes)
Net Qty: 200 g
Mfg Date: 08/2026
USP: Rs. 0.25 / g
Manufactured by: Sunrise Foods Pvt. Ltd., Plot 45, Pune 411028
Consumer Care: 1800-209-4455 / customercare@sunrisefoods.in
Country of Origin: India`,
    lines: [
      {
        text: 'SUNRISE WHOLE WHEAT BISCUITS',
        confidence: 0.98,
        bbox: { x: 50, y: 100, width: 400, height: 35 },
        words: [],
      },
      {
        text: 'MRP Rs. 50.00 (inclusive of all taxes)',
        confidence: 0.96,
        bbox: { x: 50, y: 160, width: 320, height: 30 },
        words: [],
      },
      {
        text: 'Net Qty: 200 g',
        confidence: 0.97,
        bbox: { x: 50, y: 210, width: 150, height: 28 },
        words: [],
      },
      {
        text: 'Mfg Date: 08/2026',
        confidence: 0.94,
        bbox: { x: 50, y: 260, width: 180, height: 26 },
        words: [],
      },
      {
        text: 'USP: Rs. 0.25 / g',
        confidence: 0.91,
        bbox: { x: 50, y: 310, width: 160, height: 24 },
        words: [],
      },
      {
        text: 'Manufactured by: Sunrise Foods Pvt. Ltd., Plot 45, Pune 411028',
        confidence: 0.93,
        bbox: { x: 50, y: 360, width: 450, height: 30 },
        words: [],
      },
      {
        text: 'Consumer Care: 1800-209-4455 / customercare@sunrisefoods.in',
        confidence: 0.92,
        bbox: { x: 50, y: 410, width: 420, height: 28 },
        words: [],
      },
      {
        text: 'Country of Origin: India',
        confidence: 0.95,
        bbox: { x: 50, y: 460, width: 220, height: 26 },
        words: [],
      },
    ],
    engine: 'standard-ocr-v1',
    language: 'eng+hin',
    processingTimeMs: 45,
    rawPayload: {},
  };

  it('extracts all 8 candidate statutory declarations', () => {
    const candidates = extractCandidateDeclarations(mockRawOcr);
    expect(candidates.length).toBe(8);

    const fields = candidates.map((c) => c.fieldName);
    expect(fields).toContain('mrp');
    expect(fields).toContain('net_quantity');
    expect(fields).toContain('manufacturing_date');
    expect(fields).toContain('unit_sale_price');
    expect(fields).toContain('name_address_manufacturer');
    expect(fields).toContain('consumer_care');
    expect(fields).toContain('country_of_origin');
    expect(fields).toContain('common_generic_name');
  });

  it('correctly parses MRP candidate with taxes included flag', () => {
    const candidates = extractCandidateDeclarations(mockRawOcr);
    const mrp = candidates.find((c) => c.fieldName === 'mrp');
    expect(mrp).toBeDefined();
    expect(mrp?.observedValue).toBe('Rs. 50.00 (incl. of all taxes)');
    expect(mrp?.normalizedValue).toEqual({
      amount: 50.0,
      currency: 'INR',
      taxes_included: true,
    });
    expect(mrp?.confidence).toBeGreaterThan(0.9);
  });

  it('correctly parses Net Quantity candidate with standard SI unit', () => {
    const candidates = extractCandidateDeclarations(mockRawOcr);
    const netQty = candidates.find((c) => c.fieldName === 'net_quantity');
    expect(netQty).toBeDefined();
    expect(netQty?.observedValue).toBe('200 g');
    expect(netQty?.normalizedValue).toEqual({
      quantity: 200,
      unit: 'g',
      raw_unit: 'g',
    });
  });

  it('correctly parses Date of Manufacture candidate', () => {
    const candidates = extractCandidateDeclarations(mockRawOcr);
    const mfgDate = candidates.find((c) => c.fieldName === 'manufacturing_date');
    expect(mfgDate).toBeDefined();
    expect(mfgDate?.observedValue).toBe('08/2026');
    expect(mfgDate?.normalizedValue).toEqual({
      month: 8,
      year: 2026,
      formatted: '08/2026',
    });
  });

  it('correctly parses Unit Sale Price (USP) candidate', () => {
    const candidates = extractCandidateDeclarations(mockRawOcr);
    const usp = candidates.find((c) => c.fieldName === 'unit_sale_price');
    expect(usp).toBeDefined();
    expect(usp?.observedValue).toBe('Rs. 0.25 / g');
    expect(usp?.normalizedValue).toEqual({
      price_per_unit: 0.25,
      unit: 'g',
    });
  });

  it('correctly extracts Manufacturer Name and Address', () => {
    const candidates = extractCandidateDeclarations(mockRawOcr);
    const mfr = candidates.find((c) => c.fieldName === 'name_address_manufacturer');
    expect(mfr).toBeDefined();
    expect(mfr?.observedValue).toContain('Sunrise Foods Pvt. Ltd.');
    expect(mfr?.observedValue).toContain('Pune 411028');
  });

  it('correctly extracts Consumer Care phone and email details', () => {
    const candidates = extractCandidateDeclarations(mockRawOcr);
    const cc = candidates.find((c) => c.fieldName === 'consumer_care');
    expect(cc).toBeDefined();
    expect(cc?.normalizedValue).toHaveProperty('email', 'customercare@sunrisefoods.in');
    expect(cc?.normalizedValue).toHaveProperty('phone', '1800 209 4455');
  });

  it('attaches bounding box to all candidates for visual alignment', () => {
    const candidates = extractCandidateDeclarations(mockRawOcr);
    for (const c of candidates) {
      expect(c.bbox).toBeDefined();
      expect(c.bbox.width).toBeGreaterThan(0);
      expect(c.bbox.height).toBeGreaterThan(0);
    }
  });

  it('preserves raw OCR text immutable for audit integrity', () => {
    const candidates = extractCandidateDeclarations(mockRawOcr);
    const mrp = candidates.find((c) => c.fieldName === 'mrp');
    expect(mrp?.rawOcrText).toBe('MRP Rs. 50.00 (inclusive of all taxes)');
  });
});
