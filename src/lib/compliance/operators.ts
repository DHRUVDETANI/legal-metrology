// ============================================================================
// src/lib/compliance/operators.ts
// SIH PS26034 — Deterministic Condition Operators
//
// Invariants:
//   - Pure, deterministic evaluation functions.
//   - Zero side-effects.
//   - Emits PASS, FAIL, or REVIEW.
// ============================================================================

import type { RuleVerdict } from './types';

export interface OperatorResult {
  verdict: RuleVerdict;
  explanation: string;
}

/**
 * Evaluates whether a required declaration exists and is non-empty.
 */
export function evaluateExists(
  value: string | undefined | null,
  parameters: Record<string, unknown>,
  confidence: number
): OperatorResult {
  if (value === undefined || value === null || value.trim() === '') {
    return {
      verdict: 'FAIL',
      explanation: 'Mandatory declaration is absent from the packaging.',
    };
  }

  // If OCR confidence is too low to confirm text, gate to REVIEW
  if (confidence < 0.70) {
    return {
      verdict: 'REVIEW',
      explanation: `Declaration detected with low OCR confidence (${(confidence * 100).toFixed(0)}%). Manual reviewer inspection required.`,
    };
  }



  return {
    verdict: 'PASS',
    explanation: 'Mandatory declaration is declared.',
  };
}

/**
 * Evaluates whether observed text matches a statutory regular expression.
 */
export function evaluateRegexMatch(
  value: string | undefined | null,
  parameters: Record<string, unknown>,
  confidence: number
): OperatorResult {
  if (value === undefined || value === null || value.trim() === '') {
    return {
      verdict: 'FAIL',
      explanation: 'Mandatory declaration is absent.',
    };
  }

  if (confidence < 0.70) {
    return {
      verdict: 'REVIEW',
      explanation: `Declaration text has low OCR confidence (${(confidence * 100).toFixed(0)}%). Requires reviewer audit.`,
    };
  }

  const rawPattern = parameters.pattern;
  if (typeof rawPattern !== 'string' || !rawPattern) {
    return {
      verdict: 'REVIEW',
      explanation: 'Rule pattern is undefined or malformed.',
    };
  }

  try {
    // Handle inline (?i) flag if present
    let flags = '';
    let cleanPattern = rawPattern;
    if (cleanPattern.startsWith('(?i)')) {
      flags = 'i';
      cleanPattern = cleanPattern.substring(4);
    }

    const regex = new RegExp(cleanPattern, flags);
    const matches = regex.test(value);

    if (matches) {
      return {
        verdict: 'PASS',
        explanation: 'Declaration matches statutory format requirements.',
      };
    } else {
      return {
        verdict: 'FAIL',
        explanation: `Observed value "${value}" does not conform to the statutory format specification.`,
      };
    }
  } catch (err: unknown) {
    return {
      verdict: 'REVIEW',
      explanation: `Regex evaluation error: ${err instanceof Error ? err.message : 'Invalid regex pattern'}.`,
    };
  }
}

/**
 * Evaluates numeric greater-than-or-equal condition (e.g. font character height).
 */
export function evaluateNumericGte(
  numericValue: number | undefined | null,
  parameters: Record<string, unknown>,
  isCalibrated: boolean
): OperatorResult {
  if (numericValue === undefined || numericValue === null || isNaN(numericValue)) {
    return {
      verdict: 'REVIEW',
      explanation: 'Measurement data is missing or not yet captured.',
    };
  }

  const threshold =
    typeof parameters.minimum_pixel_height === 'number'
      ? parameters.minimum_pixel_height
      : typeof parameters.threshold === 'number'
        ? parameters.threshold
        : null;

  if (threshold === null) {
    return {
      verdict: 'REVIEW',
      explanation: 'Rule threshold parameter is not configured.',
    };
  }

  // If measurement is uncalibrated, gate to REVIEW with notice
  if (!isCalibrated) {
    if (numericValue >= threshold) {
      return {
        verdict: 'PASS',
        explanation: `Observed dimension (${numericValue} px) meets statutory threshold (${threshold} px). Calibration unverified.`,
      };
    } else {
      return {
        verdict: 'REVIEW',
        explanation: `Observed uncalibrated dimension (${numericValue} px) is below nominal threshold (${threshold} px). Requires physical calibration audit.`,
      };
    }
  }

  if (numericValue >= threshold) {
    return {
      verdict: 'PASS',
      explanation: `Measurement (${numericValue}) satisfies minimum threshold (${threshold}).`,
    };
  } else {
    return {
      verdict: 'FAIL',
      explanation: `Observed measurement (${numericValue}) is below mandatory minimum (${threshold}).`,
    };
  }
}
