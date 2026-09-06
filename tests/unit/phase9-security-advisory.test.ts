// ============================================================================
// tests/unit/phase9-security-advisory.test.ts
// SIH PS26034 — Phase 9: AI Advisory Invariants & Security Hardening Unit Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import { generateInspectionAdvisory } from '../../src/lib/advisory/service';
import type { ComplianceSummary } from '../../src/lib/compliance/types';
import { PRESERVED_DEMO_RULES } from '../../src/lib/compliance/registry';
import type { Declaration } from '../../src/types/database.types';

describe('Phase 9 AI Rule Auditor & Advisory Invariants', () => {
  const baseSummary: ComplianceSummary = {
    inspectionId: 'test-insp-001',
    overallStatus: 'FAIL',
    rulesetVersion: 'v2024.1',
    evaluatedAt: '2026-09-06T12:00:00Z',
    totalRulesEvaluated: 6,
    passedCount: 5,
    failedCount: 1,
    reviewCount: 0,
    notApplicableCount: 0,
    totalViolations: 1,
    checkResults: [
      {
        ruleCode: 'DEMO-LM-MRP-001',
        ruleId: 'r-1',
        ruleVersion: 'v2024.1',
        targetField: 'mrp',
        title: '[DEMO] MRP Mandatory Declaration',
        verdict: 'FAIL',
        observedValue: 'Rs. 50.00',
        expectedConstraint: 'MRP declaration must state inclusive of all taxes',
        severity: 'CRITICAL',
        confidence: 0.95,
        explanation: 'Declaration does not state inclusive of all taxes',
        evaluatedAt: '2026-09-06T12:00:00Z',
      },
      {
        ruleCode: 'DEMO-LM-NET-QTY-001',
        ruleId: 'r-2',
        ruleVersion: 'v2024.1',
        targetField: 'net_quantity',
        title: '[DEMO] Net Quantity with SI Unit',
        verdict: 'PASS',
        observedValue: '200 g',
        expectedConstraint: 'Net quantity must be expressed with standard SI unit symbol',
        severity: 'CRITICAL',
        confidence: 0.98,
        explanation: 'Declaration matches statutory format requirements.',
        evaluatedAt: '2026-09-06T12:00:00Z',
      },
    ],
    violations: [
      {
        inspectionId: 'test-insp-001',
        ruleCode: 'DEMO-LM-MRP-001',
        ruleId: 'r-1',
        ruleVersion: 'v2024.1',
        observedValue: 'Rs. 50.00',
        expectedConstraint: 'MRP declaration must state inclusive of all taxes',
        severity: 'CRITICAL',
        evidenceBbox: {},
        evidenceCropPath: null,
        confidence: 0.95,
        explanation: 'Declaration does not state inclusive of all taxes',
      },
    ],
  };

  describe('Non-Negotiable Compliance Invariants', () => {
    it('never alters or overrides the deterministic overall status', () => {
      const advisory = generateInspectionAdvisory('test-insp-001', baseSummary);
      expect(advisory.deterministicOverallStatus).toBe('FAIL');
      expect(advisory.deterministicOverallStatus).not.toBe('PASS');
    });

    it('attaches prominent non-authoritative legal notice to all advisory outputs', () => {
      const advisory = generateInspectionAdvisory('test-insp-001', baseSummary);
      expect(advisory.isAiAssisted).toBe(true);
      expect(advisory.authoritativeNotice).toContain('sole legal authority');
      expect(advisory.authoritativeNotice).toContain('Gazette of India');
    });

    it('maps statutory section references accurately for canonical demo rules', () => {
      const advisory = generateInspectionAdvisory('test-insp-001', baseSummary);
      const mrpAdv = advisory.advisories.find((a) => a.ruleCode === 'DEMO-LM-MRP-001');
      expect(mrpAdv).toBeDefined();
      expect(mrpAdv?.statutoryReference).toContain('Rule 6(1)(e)');
      expect(mrpAdv?.advisoryType).toBe('VIOLATION_EXPLANATION');
      expect(mrpAdv?.requiresHumanReview).toBe(true);
    });

    it('flags low-confidence declarations for human inspector verification', () => {
      const lowConfDeclarations: Declaration[] = [
        {
          id: 'd-1',
          inspection_id: 'test-insp-001',
          image_id: null,
          field_name: 'mfg_date',
          raw_ocr_text: 'MFG: ??/2026',
          observed_value: '08/2026',
          normalized_value: {},
          confidence: 0.45,
          bbox: {},
          is_manually_edited: false,
          edited_by: null,
          created_at: '2026-09-06T12:00:00Z',
          updated_at: '2026-09-06T12:00:00Z',
        },
      ];

      const advisory = generateInspectionAdvisory('test-insp-001', baseSummary, lowConfDeclarations);
      expect(advisory.discrepancyCount).toBe(1);
    });
  });

  describe('Canonical Rule Preservation & Security Guardrails', () => {
    it('preserves all six statutory DEMO rules with version v2024.1', () => {
      expect(PRESERVED_DEMO_RULES).toHaveLength(6);
      const ruleCodes = PRESERVED_DEMO_RULES.map((r) => r.ruleCode);
      expect(ruleCodes).toContain('DEMO-LM-MRP-001');
      expect(ruleCodes).toContain('DEMO-LM-NET-QTY-001');
      expect(ruleCodes).toContain('DEMO-LM-MFG-DATE-001');
      expect(ruleCodes).toContain('DEMO-LM-MANUFACTURER-001');
      expect(ruleCodes).toContain('DEMO-LM-CONSUMER-CARE-001');
      expect(ruleCodes).toContain('DEMO-LM-FONT-HEIGHT-001');

      for (const rule of PRESERVED_DEMO_RULES) {
        expect(rule.currentVersion).toBe('v2024.1');
        expect(rule.enabled).toBe(true);
        expect(rule.title).toContain('[DEMO]');
      }
    });

    it('guarantees that empty or degraded inputs fail-safe without throwing', () => {
      const emptySummary: ComplianceSummary = {
        inspectionId: 'empty-1',
        overallStatus: 'REVIEW',
        rulesetVersion: 'v2024.1',
        evaluatedAt: '2026-09-06T12:00:00Z',
        totalRulesEvaluated: 0,
        passedCount: 0,
        failedCount: 0,
        reviewCount: 0,
        notApplicableCount: 0,
        totalViolations: 0,
        checkResults: [],
        violations: [],
      };

      const advisory = generateInspectionAdvisory('empty-1', emptySummary);
      expect(advisory.advisories).toEqual([]);
      expect(advisory.discrepancyCount).toBe(0);
      expect(advisory.deterministicOverallStatus).toBe('REVIEW');
    });
  });
});
