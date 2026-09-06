import { describe, it, expect } from 'vitest';
import {
  cleanUnicodeText,
  standardizeUnit,
  parseCurrencyAmount,
  parseManufacturingDate,
  extractEmail,
  extractPhoneNumber,
} from '@/lib/ocr/normalization';

describe('Phase 4 OCR Text Normalization Utilities', () => {
  describe('cleanUnicodeText', () => {
    it('normalizes curly quotes, em dashes, and collapses whitespace', () => {
      const input = '“Sunrise  Foods” – Pune\u200B';
      const output = cleanUnicodeText(input);
      expect(output).toBe('"Sunrise Foods" - Pune');
    });

    it('handles empty or whitespace-only strings gracefully', () => {
      expect(cleanUnicodeText('')).toBe('');
      expect(cleanUnicodeText('   ')).toBe('');
    });
  });

  describe('standardizeUnit', () => {
    it('standardizes weight units to standard SI symbol (g, kg, mg)', () => {
      expect(standardizeUnit('gms')).toBe('g');
      expect(standardizeUnit('gm')).toBe('g');
      expect(standardizeUnit('grams')).toBe('g');
      expect(standardizeUnit('KGS')).toBe('kg');
      expect(standardizeUnit('kilogram')).toBe('kg');
      expect(standardizeUnit('mg')).toBe('mg');
    });

    it('standardizes volume units to standard SI symbol (ml, l)', () => {
      expect(standardizeUnit('mls')).toBe('ml');
      expect(standardizeUnit('millilitre')).toBe('ml');
      expect(standardizeUnit('ltr')).toBe('l');
      expect(standardizeUnit('litres')).toBe('l');
      expect(standardizeUnit('L')).toBe('l');
    });

    it('standardizes count / measure units to u', () => {
      expect(standardizeUnit('pcs')).toBe('u');
      expect(standardizeUnit('pieces')).toBe('u');
      expect(standardizeUnit('units')).toBe('u');
      expect(standardizeUnit('N')).toBe('u');
    });
  });

  describe('parseCurrencyAmount', () => {
    it('parses standard MRP with rupee symbol and tax inclusive clause', () => {
      const parsed = parseCurrencyAmount('MRP ₹ 150.00 (inclusive of all taxes)');
      expect(parsed.amount).toBe(150.0);
      expect(parsed.currency).toBe('INR');
      expect(parsed.taxesIncluded).toBe(true);
      expect(parsed.formatted).toBe('₹150.00');
    });

    it('parses MRP Rs format with comma separators', () => {
      const parsed = parseCurrencyAmount('MRP Rs. 1,250.50 incl. of all taxes');
      expect(parsed.amount).toBe(1250.5);
      expect(parsed.taxesIncluded).toBe(true);
    });

    it('detects when taxes included statement is absent', () => {
      const parsed = parseCurrencyAmount('MRP Rs. 85.00');
      expect(parsed.amount).toBe(85.0);
      expect(parsed.taxesIncluded).toBe(false);
    });
  });

  describe('parseManufacturingDate', () => {
    it('parses MM/YYYY format correctly', () => {
      const parsed = parseManufacturingDate('Mfg: 08/2026');
      expect(parsed.month).toBe(8);
      expect(parsed.year).toBe(2026);
      expect(parsed.formatted).toBe('08/2026');
    });

    it('parses named month format correctly (e.g. AUG 2026)', () => {
      const parsed = parseManufacturingDate('Date of Pkg: August 2026');
      expect(parsed.month).toBe(8);
      expect(parsed.year).toBe(2026);
      expect(parsed.formatted).toBe('08/2026');
    });

    it('parses full DD/MM/YYYY format correctly', () => {
      const parsed = parseManufacturingDate('Mfd: 15/09/2026');
      expect(parsed.month).toBe(9);
      expect(parsed.year).toBe(2026);
      expect(parsed.formatted).toBe('09/2026');
    });
  });

  describe('Contact Details Extraction', () => {
    it('extracts official email from contact text', () => {
      const email = extractEmail('For feedback: customercare@sunrisefoods.co.in');
      expect(email).toBe('customercare@sunrisefoods.co.in');
    });

    it('extracts toll-free and mobile phone numbers', () => {
      const tollFree = extractPhoneNumber('Call toll free: 1800 209 4455');
      expect(tollFree).toBe('1800 209 4455');

      const mobile = extractPhoneNumber('Helpline: +91 9876543210');
      expect(mobile).toBe('+91 9876543210');
    });
  });
});
