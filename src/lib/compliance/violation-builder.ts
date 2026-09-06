// ============================================================================
// src/lib/compliance/violation-builder.ts
// SIH PS26034 — Structured Violation Builder
//
// Invariants:
//   - Constructs fully traceable violation records from failed rule checks.
//   - Attaches observed values, statutory expected constraint, severity, and evidence bbox.
// ============================================================================

import type { ComplianceCheckResult, ComplianceViolation } from './types';

/**
 * Builds an immutable, structured ComplianceViolation from a failed check result.
 */
export function buildViolation(
  inspectionId: string,
  check: ComplianceCheckResult,
  evidenceCropPath: string | null = null
): ComplianceViolation {
  return {
    inspectionId,
    ruleId: check.ruleId || null,
    ruleCode: check.ruleCode,
    ruleVersion: check.ruleVersion,
    observedValue: check.observedValue,
    expectedConstraint: check.expectedConstraint,
    severity: check.severity,
    confidence: check.confidence,
    evidenceBbox: check.evidenceBbox || {},
    evidenceCropPath,
    explanation: check.explanation,
  };
}
