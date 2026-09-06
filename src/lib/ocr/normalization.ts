// ============================================================================
// src/lib/ocr/normalization.ts
// SIH PS26034 — OCR Text Normalization & Standardizer Utilities
//
// Invariant:
//   - Decoupled from raw OCR output. Raw OCR text must NEVER be overwritten.
//   - Normalizes currency, units, dates, and whitespace for candidate extraction.
// ============================================================================

const UNIT_MAP: Record<string, string> = {
  g: 'g',
  gm: 'g',
  gms: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kgs: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  mg: 'mg',
  milligram: 'mg',
  ml: 'ml',
  mls: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  ltr: 'l',
  ltrs: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  m: 'm',
  meter: 'm',
  meters: 'm',
  metre: 'm',
  metres: 'm',
  cm: 'cm',
  centimeter: 'cm',
  mm: 'mm',
  millimeter: 'mm',
  u: 'u',
  unit: 'u',
  units: 'u',
  pc: 'u',
  pcs: 'u',
  piece: 'u',
  pieces: 'u',
  n: 'u',
};

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/**
 * Normalizes unicode, trims excessive whitespace, removes unprintable characters.
 */
export function cleanUnicodeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
    .replace(/[\u2018\u2019]/g, "'") // normalize curly quotes
    .replace(/[\u201C\u201D]/g, '"') // normalize curly double quotes
    .replace(/[\u2013\u2014]/g, '-') // normalize em/en dash
    .replace(/[ \t]+/g, ' ') // collapse inline spaces
    .trim();
}

/**
 * Standardizes raw unit string to statutory SI unit symbol.
 */
export function standardizeUnit(rawUnit: string): string {
  const cleaned = rawUnit.toLowerCase().replace(/[^a-z]/g, '');
  return UNIT_MAP[cleaned] || rawUnit.toLowerCase();
}

/**
 * Extracts normalized currency details from raw text snippet.
 */
export function parseCurrencyAmount(rawText: string): {
  amount: number | null;
  currency: string;
  taxesIncluded: boolean;
  formatted: string;
} {
  const cleaned = cleanUnicodeText(rawText);
  // Match number with optional comma-grouping and decimals: 50, 50.00, 1,250.50
  // The pattern is anchored greedily: digits with optional comma-groups, then optional decimal.
  const match = cleaned.match(/(?:(?:Rs\.?|INR|₹)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?(?![0-9]))/i);

  let amount: number | null = null;
  if (match && match[1]) {
    const numStr = match[1].replace(/,/g, '');
    const parsed = parseFloat(numStr);
    if (!isNaN(parsed) && parsed >= 0) {
      amount = parsed;
    }
  }

  const taxesIncluded =
    /incl\.?(?:usive)?(?:\s*of)?\s*(?:all)?\s*taxes/i.test(cleaned) ||
    /incl\.?\s*taxes/i.test(cleaned);

  return {
    amount,
    currency: 'INR',
    taxesIncluded,
    formatted: amount !== null ? `₹${amount.toFixed(2)}` : rawText,
  };
}

/**
 * Extracts month and year from a raw date string (e.g. "08/2026", "AUG 2026", "15-08-2026").
 */
export function parseManufacturingDate(rawText: string): {
  month: number | null;
  year: number | null;
  formatted: string;
} {
  const cleaned = cleanUnicodeText(rawText);

  // Pattern 1: MM/YYYY or MM-YYYY or MM.YYYY
  const mmyyyy = cleaned.match(/\b(0?[1-9]|1[0-2])[\/\-\.\s](20\d{2}|\d{2})\b/);
  if (mmyyyy) {
    const month = parseInt(mmyyyy[1], 10);
    let year = parseInt(mmyyyy[2], 10);
    if (year < 100) year += 2000;
    return {
      month,
      year,
      formatted: `${String(month).padStart(2, '0')}/${year}`,
    };
  }

  // Pattern 2: Month name + Year (e.g. "AUG 2026", "August 2026")
  const namedMonth = cleaned.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)[\/\-\.\s]*(20\d{2}|\d{2})\b/i);
  if (namedMonth) {
    const month = MONTH_MAP[namedMonth[1].toLowerCase()] || null;
    let year = parseInt(namedMonth[2], 10);
    if (year < 100) year += 2000;
    return {
      month,
      year,
      formatted: month ? `${String(month).padStart(2, '0')}/${year}` : rawText,
    };
  }

  // Pattern 3: Full date DD/MM/YYYY
  const ddmmyyyy = cleaned.match(/\b([0-2]?[1-9]|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](20\d{2})\b/);
  if (ddmmyyyy) {
    const month = parseInt(ddmmyyyy[2], 10);
    const year = parseInt(ddmmyyyy[3], 10);
    return {
      month,
      year,
      formatted: `${String(month).padStart(2, '0')}/${year}`,
    };
  }

  return { month: null, year: null, formatted: rawText };
}

/**
 * Extracts clean email address from string.
 */
export function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Extracts telephone / mobile / toll-free number from string.
 */
export function extractPhoneNumber(text: string): string | null {
  // Matches Indian mobile, toll-free 1800..., or landline
  // Hyphens and spaces are treated as equivalent separators in toll-free numbers.
  const match = text.match(/(?:1800[\s-]\d{3}[\s-]\d{3,4}|1800\d{7}|(?:\+91[\s-]?)?[6-9]\d{9}|0\d{2,4}[\s-]?\d{6,8})/);
  return match ? match[0].replace(/[\s-]+/g, ' ').trim() : null;
}
