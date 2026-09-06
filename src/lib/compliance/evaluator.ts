// ============================================================================
// src/lib/compliance/evaluator.ts
// SIH PS26034 — Deterministic Compliance Evaluator
//
// Invariants:
//   - Pure, deterministic evaluation of candidate declarations & measurements.
//   - Traceable to rule code, rule version, and evidence coordinates.
//   - Strictly non-AI / LLM logic.
//   - Overall Status Calculation:
//       * FAIL: If ANY rule evaluates to FAIL.
//       * REVIEW: If NO rules failed, but at least 1 rule requires REVIEW.
//       * PASS: If ALL applicable enabled rules evaluate to PASS.
// ============================================================================

import type {
  EvaluatableRule,
  ComplianceEvaluationContext,
  ComplianceCheckResult,
  ComplianceSummary,
  ComplianceViolation,
} from './types';
import type { InspectionStatus } from '@/types/database.types';
import { evaluateExists, evaluateRegexMatch, evaluateNumericGte } from './operators';
import { buildViolation } from './violation-builder';

/**
 * Evaluates a single rule against declarations or CV measurements deterministically.
 */
export function evaluateRule(
  rule: EvaluatableRule,
  context: ComplianceEvaluationContext
): ComplianceCheckResult {
  const evaluatedAt = new Date().toISOString();
  const targetField = rule.targetField;

  // 1. If target is CV measurement (e.g. font height)
  if (targetField === 'font_measurement' || targetField === 'font_height') {
    const measurement = context.cvMeasurements?.[targetField];
    if (!measurement) {
      return {
        ruleCode: rule.ruleCode,
        ruleId: rule.id,
        ruleVersion: rule.currentVersion,
        targetField,
        title: rule.title,
        verdict: 'REVIEW',
        observedValue: 'No CV font measurement captured',
        expectedConstraint: rule.expectedConstraintText,
        severity: rule.severity,
        confidence: 0.5,
        explanation: 'Computer vision font measurement has not been performed on packaging evidence.',
        evaluatedAt,
      };
    }

    const opResult = evaluateNumericGte(
      measurement.characterHeightPx,
      rule.conditionParameters,
      measurement.isCalibrated
    );

    return {
      ruleCode: rule.ruleCode,
      ruleId: rule.id,
      ruleVersion: rule.currentVersion,
      targetField,
      title: rule.title,
      verdict: opResult.verdict,
      observedValue: `${measurement.characterHeightPx} px${measurement.isCalibrated ? ' (calibrated)' : ' (uncalibrated)'}`,
      expectedConstraint: rule.expectedConstraintText,
      severity: rule.severity,
      confidence: measurement.isCalibrated ? 1.0 : 0.8,
      explanation: opResult.explanation,
      evaluatedAt,
    };
  }

  // 2. Declaration-based statutory evaluation
  const declaration = context.declarations[targetField];

  // If declaration is completely missing
  if (!declaration) {
    return {
      ruleCode: rule.ruleCode,
      ruleId: rule.id,
      ruleVersion: rule.currentVersion,
      targetField,
      title: rule.title,
      verdict: 'FAIL',
      observedValue: 'Missing declaration',
      expectedConstraint: rule.expectedConstraintText,
      severity: rule.severity,
      confidence: 1.0,
      explanation: `Mandatory statutory declaration for "${targetField}" was not detected on the packaging.`,
      evaluatedAt,
    };
  }

  const textToEvaluate = declaration.observedValue || declaration.rawOcrText;
  let opResult: { verdict: import('./types').RuleVerdict; explanation: string } = {
    verdict: 'FAIL',
    explanation: 'Unsupported rule operator',
  };

  switch (rule.conditionOperator) {
    case 'EXISTS':
      opResult = evaluateExists(textToEvaluate, rule.conditionParameters, declaration.confidence);
      break;

    case 'REGEX_MATCH':
      // Test either against observedValue or rawOcrText for highest recall
      opResult = evaluateRegexMatch(
        textToEvaluate,
        rule.conditionParameters,
        declaration.confidence
      );
      // If failed on observedValue, try rawOcrText if distinct
      if (opResult.verdict === 'FAIL' && declaration.rawOcrText !== textToEvaluate) {
        const rawCheck = evaluateRegexMatch(
          declaration.rawOcrText,
          rule.conditionParameters,
          declaration.confidence
        );
        if (rawCheck.verdict === 'PASS') {
          opResult = rawCheck;
        }
      }
      break;

    default:
      opResult = {
        verdict: 'REVIEW',
        explanation: `Condition operator "${rule.conditionOperator}" requires manual auditor evaluation.`,
      };
  }

  return {
    ruleCode: rule.ruleCode,
    ruleId: rule.id,
    ruleVersion: rule.currentVersion,
    targetField,
    title: rule.title,
    verdict: opResult.verdict,
    observedValue: textToEvaluate,
    expectedConstraint: rule.expectedConstraintText,
    severity: rule.severity,
    confidence: declaration.confidence,
    explanation: opResult.explanation,
    evidenceBbox: declaration.bbox,
    evaluatedAt,
  };
}

/**
 * Computes deterministic overall compliance status from rule check results.
 *
 * Rules:
 *   - FAIL: If any rule has verdict === 'FAIL'
 *   - REVIEW: If no failures, but at least one rule has verdict === 'REVIEW'
 *   - PASS: If all applicable rules have verdict === 'PASS'
 */
export function calculateOverallStatus(results: ComplianceCheckResult[]): InspectionStatus {
  if (results.length === 0) {
    return 'REVIEW';
  }

  const hasFailures = results.some((r) => r.verdict === 'FAIL');
  if (hasFailures) {
    return 'FAIL';
  }

  const hasReviews = results.some((r) => r.verdict === 'REVIEW');
  if (hasReviews) {
    return 'REVIEW';
  }

  return 'PASS';
}

/**
 * Orchestrates deterministic compliance evaluation across all active rules.
 */
export function evaluateCompliance(
  context: ComplianceEvaluationContext,
  rules: EvaluatableRule[]
): ComplianceSummary {
  const evaluatedAt = new Date().toISOString();
  const checkResults: ComplianceCheckResult[] = [];
  const violations: ComplianceViolation[] = [];

  let passedCount = 0;
  let failedCount = 0;
  let reviewCount = 0;
  let notApplicableCount = 0;

  for (const rule of rules) {
    if (!rule.enabled) {
      notApplicableCount++;
      continue;
    }

    const check = evaluateRule(rule, context);
    checkResults.push(check);

    switch (check.verdict) {
      case 'PASS':
        passedCount++;
        break;
      case 'FAIL':
        failedCount++;
        violations.push(buildViolation(context.inspectionId, check));
        break;
      case 'REVIEW':
        reviewCount++;
        break;
      case 'NOT_APPLICABLE':
        notApplicableCount++;
        break;
    }
  }

  const overallStatus = calculateOverallStatus(checkResults);

  return {
    inspectionId: context.inspectionId,
    overallStatus,
    rulesetVersion: context.rulesetVersion,
    evaluatedAt,
    totalRulesEvaluated: checkResults.length,
    passedCount,
    failedCount,
    reviewCount,
    notApplicableCount,
    totalViolations: violations.length,
    checkResults,
    violations,
  };
}
