// ============================================================================
// src/lib/advisory/types.ts
// SIH PS26034 — Bounded AI Rule Auditor & Advisory Contracts
//
// Invariants:
//   - Strictly non-authoritative.
//   - Deterministic engine verdicts always take precedence.
//   - Cites rule codes, evidence values, and human review flags.
// ============================================================================

import type { InspectionStatus, SeverityLevel } from '@/types/database.types';

export type AdvisoryType =
  | 'VIOLATION_EXPLANATION'
  | 'AMBIGUITY_ALERT'
  | 'REVIEWER_RECOMMENDATION'
  | 'STATUTORY_CITATION';

export interface RuleAdvisoryItem {
  id: string;
  advisoryType: AdvisoryType;
  ruleCode: string;
  ruleTitle: string;
  deterministicVerdict: 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE';
  severity: SeverityLevel;
  explanation: string;
  statutoryReference: string;
  supportingEvidence: string;
  confidence: number;
  requiresHumanReview: boolean;
  suggestedAction?: string;
}

export interface InspectionAdvisoryReport {
  inspectionId: string;
  deterministicOverallStatus: InspectionStatus;
  generatedAt: string;
  advisories: RuleAdvisoryItem[];
  executiveSummary: string;
  discrepancyCount: number;
  isAiAssisted: true;
  authoritativeNotice: string;
}
