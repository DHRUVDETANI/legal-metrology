// ============================================================================
// src/lib/advisory/service.ts
// SIH PS26034 — Bounded AI Rule Auditor & Advisory Service
//
// Generates contextual explanations, statutory citations, and reviewer
// recommendations for deterministic compliance evaluation outcomes.
//
// STRICT INVARIANTS:
//   - THE LLM / ADVISORY LAYER IS NOT THE COMPLIANCE AUTHORITY.
//   - Cannot override, invert, or suppress any deterministic rule result.
//   - Operates fully deterministically/resiliently offline.
// ============================================================================

import type { ComplianceSummary, ComplianceCheckResult } from '@/lib/compliance/types';
import type { InspectionAdvisoryReport, RuleAdvisoryItem } from './types';
import type { Declaration } from '@/types/database.types';

const STATUTORY_REFERENCES: Record<string, string> = {
  'DEMO-LM-MRP-001': 'Rule 6(1)(e) — Retail sale price inclusive of all taxes',
  'DEMO-LM-NET-QTY-001': 'Rule 6(1)(d) read with Second Schedule — Net quantity in standard SI units',
  'DEMO-LM-MFG-DATE-001': 'Rule 6(1)(d) — Month and year of manufacture or pre-packing',
  'DEMO-LM-MANUFACTURER-001': 'Rule 6(1)(a) — Name and complete postal address of manufacturer/packer',
  'DEMO-LM-CONSUMER-CARE-001': 'Rule 6(1)(n) — Name, address, telephone number, and email of consumer care executive',
  'DEMO-LM-FONT-HEIGHT-001': 'Rule 7 read with First Schedule — Minimum height of numerals and letters based on display area',
};

/**
 * Builds an explanation for a single rule check outcome.
 */
function buildRuleExplanation(check: ComplianceCheckResult): string {
  if (check.verdict === 'FAIL') {
    return `Statutory non-compliance detected for ${check.title}. Observed value "${check.observedValue}" fails requirement: ${check.expectedConstraint}.`;
  }
  if (check.verdict === 'REVIEW') {
    return `Potential ambiguity or missing verification for ${check.title}. Observed evidence "${check.observedValue}" requires physical or visual audit by a certified reviewer.`;
  }
  return `Declaration satisfies statutory criteria for ${check.title}. Observed value "${check.observedValue}" matches required constraints.`;
}

/**
 * Generates an advisory report for an evaluated inspection.
 */
export function generateInspectionAdvisory(
  inspectionId: string,
  summary: ComplianceSummary,
  declarations?: Declaration[]
): InspectionAdvisoryReport {
  const advisories: RuleAdvisoryItem[] = [];

  for (const check of summary.checkResults) {
    const statutoryRef =
      STATUTORY_REFERENCES[check.ruleCode] ||
      'Legal Metrology (Packaged Commodities) Rules, 2011 [DEMO / TEST REGULATION]';

    const isNonCompliant = check.verdict === 'FAIL';
    const isUnderReview = check.verdict === 'REVIEW';

    let suggestedAction: string | undefined;
    if (isNonCompliant) {
      suggestedAction =
        'Issue notice of violation under Rule 32 of Legal Metrology (Packaged Commodities) Rules, 2011; preserve photographic evidence crop.';
    } else if (isUnderReview) {
      suggestedAction =
        'Review original high-resolution packaging photo; manually verify text readability or calibrate contour height.';
    }

    advisories.push({
      id: `adv-${check.ruleCode.toLowerCase()}`,
      advisoryType: isNonCompliant
        ? 'VIOLATION_EXPLANATION'
        : isUnderReview
          ? 'AMBIGUITY_ALERT'
          : 'STATUTORY_CITATION',
      ruleCode: check.ruleCode,
      ruleTitle: check.title,
      deterministicVerdict: check.verdict,
      severity: check.severity,
      explanation: buildRuleExplanation(check),
      statutoryReference: statutoryRef,
      supportingEvidence: check.observedValue,
      confidence: check.confidence,
      requiresHumanReview: isUnderReview || isNonCompliant,
      suggestedAction,
    });
  }

  // Cross-declaration sanity checks (e.g. OCR low confidence warnings)
  let discrepancyCount = 0;
  if (declarations) {
    for (const d of declarations) {
      if (d.confidence < 0.7) {
        discrepancyCount++;
      }
    }
  }

  const failCount = summary.failedCount;
  const reviewCount = summary.reviewCount;

  let executiveSummary = '';
  if (summary.overallStatus === 'PASS') {
    executiveSummary =
      'Statutory compliance successfully verified across all applicable packaged commodity declaration rules. No contraventions identified.';
  } else if (summary.overallStatus === 'FAIL') {
    executiveSummary = `Deterministic rule evaluation identified ${failCount} statutory violation(s). The commodity cannot be certified as compliant without corrective action or rectification.`;
  } else {
    executiveSummary = `Inspection flagged for formal reviewer audit with ${reviewCount} item(s) pending determination. Manual review required prior to clearance.`;
  }

  return {
    inspectionId,
    deterministicOverallStatus: summary.overallStatus,
    generatedAt: new Date().toISOString(),
    advisories,
    executiveSummary,
    discrepancyCount,
    isAiAssisted: true,
    authoritativeNotice:
      'NOTICE: This advisory guidance is generated to assist human officers. The deterministic compliance engine outcome is the sole legal authority. All findings must be verified against the official Gazette of India.',
  };
}
