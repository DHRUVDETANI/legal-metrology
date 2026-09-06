import { describe, it, expect } from 'vitest';
import { extractCandidateDeclarations } from '@/lib/declarations/extractor';
import { StandardOcrEngine } from '@/lib/ocr/engine';
import type { RawOcrResult } from '@/lib/ocr/types';

describe('Phase 4 Malformed & Edge-Case OCR Handling', () => {
  const engine = new StandardOcrEngine();

  it('handles empty image buffer gracefully without throwing', async () => {
    const emptyResult = await engine.processImage(new Uint8Array([]), 'image/jpeg');
    expect(emptyResult.fullText).toBe('');
    expect(emptyResult.lines).toEqual([]);

    const candidates = extractCandidateDeclarations(emptyResult);
    expect(candidates).toEqual([]);
  });

  it('handles corrupted lines containing noise or gibberish', () => {
    const noiseOcr: RawOcrResult = {
      fullText: '###!!@@@\n~~~%%%___\n===',
      lines: [
        { text: '###!!@@@', confidence: 0.2, bbox: { x: 0, y: 0, width: 10, height: 10 }, words: [] },
        { text: '~~~%%%___', confidence: 0.15, bbox: { x: 0, y: 20, width: 10, height: 10 }, words: [] },
      ],
      engine: 'standard-ocr-v1',
      language: 'eng',
      processingTimeMs: 12,
      rawPayload: {},
    };

    const candidates = extractCandidateDeclarations(noiseOcr);
    // Noise lines should not trigger false positive statutory declarations
    expect(candidates.length).toBe(0);
  });

  it('handles lines with MRP keyword but missing numerical price', () => {
    const partialOcr: RawOcrResult = {
      fullText: 'MRP Rs. (incl of taxes)',
      lines: [
        {
          text: 'MRP Rs. (incl of taxes)',
          confidence: 0.65,
          bbox: { x: 20, y: 40, width: 200, height: 25 },
          words: [],
        },
      ],
      engine: 'standard-ocr-v1',
      language: 'eng',
      processingTimeMs: 10,
      rawPayload: {},
    };

    const candidates = extractCandidateDeclarations(partialOcr);
    const mrp = candidates.find((c) => c.fieldName === 'mrp');
    expect(mrp).toBeUndefined(); // Should not extract if amount is missing
  });

  it('handles lines with Net Qty keyword but missing numerical magnitude', () => {
    const partialOcr: RawOcrResult = {
      fullText: 'Net Quantity: grams',
      lines: [
        {
          text: 'Net Quantity: grams',
          confidence: 0.7,
          bbox: { x: 20, y: 80, width: 200, height: 25 },
          words: [],
        },
      ],
      engine: 'standard-ocr-v1',
      language: 'eng',
      processingTimeMs: 8,
      rawPayload: {},
    };

    const candidates = extractCandidateDeclarations(partialOcr);
    const netQty = candidates.find((c) => c.fieldName === 'net_quantity');
    expect(netQty).toBeUndefined();
  });
});
