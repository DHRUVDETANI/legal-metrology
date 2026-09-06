// ============================================================================
// src/lib/declarations/extractor.ts
// SIH PS26034 — Legal Metrology Candidate Declaration Extractor
//
// Strictly extracts CANDIDATE statutory declarations under Rule 6:
//   - MRP (amount, currency, taxes-inclusive clause)
//   - Net Quantity (magnitude, standard SI unit)
//   - Date of Manufacture / Packing
//   - Manufacturer / Packer / Importer Name & Postal Address
//   - Consumer Care Contact Details
//   - Common or Generic Product Name
//   - Country of Origin
//   - Unit Sale Price (USP)
//
// INVARIANT:
//   - Does NOT assess compliance or emit PASS/FAIL verdicts.
//   - Preserves raw OCR text and attaches token coordinates and confidence.
// ============================================================================

import type { RawOcrResult, CandidateDeclaration, OcrLine } from '../ocr/types';
import {
  cleanUnicodeText,
  standardizeUnit,
  parseCurrencyAmount,
  parseManufacturingDate,
  extractEmail,
  extractPhoneNumber,
} from '../ocr/normalization';

/**
 * Extracts candidate Legal Metrology declarations from OCR line streams.
 */
export function extractCandidateDeclarations(ocrResult: RawOcrResult): CandidateDeclaration[] {
  const candidates: CandidateDeclaration[] = [];
  const lines = ocrResult.lines;

  if (!lines || lines.length === 0) {
    return [];
  }

  // 1. MRP Extraction
  const mrpCandidate = extractMrp(lines);
  if (mrpCandidate) candidates.push(mrpCandidate);

  // 2. Net Quantity Extraction
  const netQtyCandidate = extractNetQuantity(lines);
  if (netQtyCandidate) candidates.push(netQtyCandidate);

  // 3. Date of Manufacture Extraction
  const mfgDateCandidate = extractMfgDate(lines);
  if (mfgDateCandidate) candidates.push(mfgDateCandidate);

  // 4. Unit Sale Price (USP) Extraction
  const uspCandidate = extractUnitSalePrice(lines);
  if (uspCandidate) candidates.push(uspCandidate);

  // 5. Manufacturer / Packer Info Extraction
  const mfrCandidate = extractManufacturer(lines);
  if (mfrCandidate) candidates.push(mfrCandidate);

  // 6. Consumer Care Extraction
  const ccCandidate = extractConsumerCare(lines);
  if (ccCandidate) candidates.push(ccCandidate);

  // 7. Country of Origin Extraction
  const originCandidate = extractCountryOfOrigin(lines);
  if (originCandidate) candidates.push(originCandidate);

  // 8. Common / Generic Name Extraction
  const nameCandidate = extractGenericName(lines);
  if (nameCandidate) candidates.push(nameCandidate);

  return candidates;
}

function extractMrp(lines: OcrLine[]): CandidateDeclaration | null {
  for (const line of lines) {
    if (/(?:m\.?r\.?p\.?|maximum\s*retail\s*price)/i.test(line.text)) {
      const parsed = parseCurrencyAmount(line.text);
      if (parsed.amount !== null) {
        return {
          fieldName: 'mrp',
          rawOcrText: line.text,
          observedValue: `Rs. ${parsed.amount.toFixed(2)}${parsed.taxesIncluded ? ' (incl. of all taxes)' : ''}`,
          normalizedValue: {
            amount: parsed.amount,
            currency: parsed.currency,
            taxes_included: parsed.taxesIncluded,
          },
          confidence: Math.min(1.0, Number((line.confidence * (parsed.taxesIncluded ? 1.0 : 0.9)).toFixed(2))),
          bbox: line.bbox,
        };
      }
    }
  }
  return null;
}

function extractNetQuantity(lines: OcrLine[]): CandidateDeclaration | null {
  for (const line of lines) {
    const match = line.text.match(/(?:net\s*(?:qty|quantity|wt\.?|weight|vol\.?|volume)?[:\s]*)(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\b/i);
    if (match) {
      const rawNum = parseFloat(match[1]);
      const rawUnit = match[2];
      const unit = standardizeUnit(rawUnit);

      if (!isNaN(rawNum) && rawNum > 0) {
        return {
          fieldName: 'net_quantity',
          rawOcrText: line.text,
          observedValue: `${rawNum} ${unit}`,
          normalizedValue: {
            quantity: rawNum,
            unit,
            raw_unit: rawUnit,
          },
          confidence: Number(line.confidence.toFixed(2)),
          bbox: line.bbox,
        };
      }
    }
  }
  return null;
}

function extractMfgDate(lines: OcrLine[]): CandidateDeclaration | null {
  for (const line of lines) {
    if (/(?:mfg|pkg|packed|mfd|date\s*of\s*(?:mfg|packaging|manufacture))/i.test(line.text)) {
      const parsed = parseManufacturingDate(line.text);
      if (parsed.month !== null && parsed.year !== null) {
        return {
          fieldName: 'manufacturing_date',
          rawOcrText: line.text,
          observedValue: parsed.formatted,
          normalizedValue: {
            month: parsed.month,
            year: parsed.year,
            formatted: parsed.formatted,
          },
          confidence: Number(line.confidence.toFixed(2)),
          bbox: line.bbox,
        };
      }
    }
  }
  return null;
}

function extractUnitSalePrice(lines: OcrLine[]): CandidateDeclaration | null {
  for (const line of lines) {
    const match = line.text.match(/(?:usp|unit\s*sale\s*price)[:\s]*(?:rs\.?|₹|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:\/|\s*per\s*)\s*([a-zA-Z]+)/i);
    if (match) {
      const price = parseFloat(match[1]);
      const unit = standardizeUnit(match[2]);
      return {
        fieldName: 'unit_sale_price',
        rawOcrText: line.text,
        observedValue: `Rs. ${price.toFixed(2)} / ${unit}`,
        normalizedValue: {
          price_per_unit: price,
          unit,
        },
        confidence: Number(line.confidence.toFixed(2)),
        bbox: line.bbox,
      };
    }
  }
  return null;
}

function extractManufacturer(lines: OcrLine[]): CandidateDeclaration | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:manufactured|mfd|packed|mktd|marketed|imported)\s*(?:by|at|for)?[:\s]*/i.test(line.text)) {
      let combined = line.text;
      // If address spills onto next line, include it
      if (i + 1 < lines.length && !/(?:mrp|net\s*qty|mfg|consumer)/i.test(lines[i + 1].text)) {
        combined += ' ' + lines[i + 1].text;
      }
      const cleaned = cleanUnicodeText(combined.replace(/(?:manufactured|mfd|packed|mktd|marketed|imported)\s*(?:by|at|for)?[:\s]*/i, ''));

      return {
        fieldName: 'name_address_manufacturer',
        rawOcrText: line.text,
        observedValue: cleaned,
        normalizedValue: {
          name_and_address: cleaned,
        },
        confidence: Number((line.confidence * 0.95).toFixed(2)),
        bbox: line.bbox,
      };
    }
  }
  return null;
}

function extractConsumerCare(lines: OcrLine[]): CandidateDeclaration | null {
  for (const line of lines) {
    if (/(?:consumer\s*care|customer\s*care|feedback|complaint|helpline|toll\s*free)/i.test(line.text)) {
      const email = extractEmail(line.text);
      const phone = extractPhoneNumber(line.text);

      return {
        fieldName: 'consumer_care',
        rawOcrText: line.text,
        observedValue: cleanUnicodeText(line.text.replace(/(?:consumer\s*care|customer\s*care)[:\s]*/i, '')),
        normalizedValue: {
          email,
          phone,
          raw: line.text,
        },
        confidence: Number(line.confidence.toFixed(2)),
        bbox: line.bbox,
      };
    }
  }
  return null;
}

function extractCountryOfOrigin(lines: OcrLine[]): CandidateDeclaration | null {
  for (const line of lines) {
    const match = line.text.match(/(?:country\s*of\s*origin|made\s*in)[:\s]*([a-zA-Z\s]+)/i);
    if (match && match[1]) {
      const origin = cleanUnicodeText(match[1]);
      return {
        fieldName: 'country_of_origin',
        rawOcrText: line.text,
        observedValue: origin,
        normalizedValue: {
          country: origin,
        },
        confidence: Number(line.confidence.toFixed(2)),
        bbox: line.bbox,
      };
    }
  }
  return null;
}

function extractGenericName(lines: OcrLine[]): CandidateDeclaration | null {
  // First line or prominently capitalized header line often contains commodity generic name
  if (lines.length > 0) {
    const candidateLine = lines[0];
    // Require at least one alphabetic character to avoid returning noise lines as generic name
    if (!/(?:mrp|net|mfg|manufactured|consumer)/i.test(candidateLine.text) && /[a-zA-Z]/.test(candidateLine.text)) {
      const cleaned = cleanUnicodeText(candidateLine.text);
      return {
        fieldName: 'common_generic_name',
        rawOcrText: candidateLine.text,
        observedValue: cleaned,
        normalizedValue: {
          name: cleaned,
        },
        confidence: Number((candidateLine.confidence * 0.9).toFixed(2)),
        bbox: candidateLine.bbox,
      };
    }
  }
  return null;
}
