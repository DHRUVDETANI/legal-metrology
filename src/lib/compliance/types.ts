// ============================================================================
// src/lib/compliance/types.ts
// SIH PS26034 — Deterministic Compliance Engine Type Contracts
//
// Invariants:
//   - Compliance results are computed strictly by deterministic TypeScript functions.
//   - Traceable to rule code, rule version, observed value, and expected constraint.
//   - LLMs / AI are strictly prohibited from determining or altering verdicts.
// ============================================================================

import type { SeverityLevel, InspectionStatus } from '@/types/database.types';

export type RuleVerdict = 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE';

export type ConditionOperator =
  | 'EXISTS'
  | 'REGEX_MATCH'
  | 'NUMERIC_GTE'
  | 'NUMERIC_LTE'
  | 'NUMERIC_BETWEEN'
  | 'ALLOWED_UNIT'
  | 'CONTAINS_ALL'
  | 'CUSTOM_PREDICATE';

export interface EvaluatableRule {
  id: string;
  ruleCode: string;
  title: string;
  description: string;
  targetField: string;
  severity: SeverityLevel;
  conditionOperator: ConditionOperator;
  conditionParameters: Record<string, unknown>;
  expectedConstraintText: string;
  enabled: boolean;
  currentVersion: string;
}

export interface DeclarationInput {
  id?: string;
  fieldName: string;
  rawOcrText: string;
  observedValue: string;
  normalizedValue: Record<string, unknown>;
  confidence: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface CvMeasurementInput {
  id?: string;
  targetField: string;
  characterHeightPx: number;
  contrastRatio: number;
  isCalibrated: boolean;
  measurementMetadata?: Record<string, unknown>;
}

export interface ComplianceEvaluationContext {
  inspectionId: string;
  rulesetVersion: string;
  declarations: Record<string, DeclarationInput>;
  cvMeasurements?: Record<string, CvMeasurementInput>;
  productMetadata?: {
    productName?: string;
    category?: string;
    declaredNetQuantity?: string;
    declaredUnit?: string;
  };
}

export interface ComplianceCheckResult {
  ruleCode: string;
  ruleId: string;
  ruleVersion: string;
  targetField: string;
  title: string;
  verdict: RuleVerdict;
  observedValue: string;
  expectedConstraint: string;
  severity: SeverityLevel;
  confidence: number;
  explanation: string;
  evidenceBbox?: Record<string, unknown>;
  evaluatedAt: string;
}

export interface ComplianceViolation {
  inspectionId: string;
  ruleId: string | null;
  ruleCode: string;
  ruleVersion: string;
  observedValue: string;
  expectedConstraint: string;
  severity: SeverityLevel;
  confidence: number;
  evidenceBbox: Record<string, unknown>;
  evidenceCropPath: string | null;
  explanation: string;
}

export interface ComplianceSummary {
  inspectionId: string;
  overallStatus: InspectionStatus;
  rulesetVersion: string;
  evaluatedAt: string;
  totalRulesEvaluated: number;
  passedCount: number;
  failedCount: number;
  reviewCount: number;
  notApplicableCount: number;
  totalViolations: number;
  checkResults: ComplianceCheckResult[];
  violations: ComplianceViolation[];
}
