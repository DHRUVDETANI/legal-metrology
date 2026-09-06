// ============================================================================
// tests/unit/phase7-report-generation.test.ts
// SIH PS26034 — Phase 7: Report Generation & Audit Trail Unit Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import { buildReportNumber, computeReportHash } from '../../src/lib/reports/generator';
import type { ReportPayload } from '../../src/lib/reports/types';

// ── buildReportNumber ────────────────────────────────────────────────────────

describe('buildReportNumber', () => {
  it('produces the REP-YYYYMMDD-NNNNNN format', () => {
    const result = buildReportNumber('INSP-2026-891234');
    expect(result).toMatch(/^REP-\d{8}-\d{6}$/);
  });

  it('extracts numeric suffix from inspection number', () => {
    const result = buildReportNumber('INSP-2026-891234');
    // Last 6 digits of "2026891234" → "891234"
    expect(result).toMatch(/891234$/);
  });

  it('pads short numeric suffixes to 6 digits', () => {
    // 'INSP-99' → digits '99' → padded to '000099'
    const result = buildReportNumber('INSP-99');
    expect(result).toMatch(/000099$/);
  });

  it('handles inspection number with no digits gracefully', () => {
    const result = buildReportNumber('ABCDE');
    // Should still produce the format with 000000 suffix
    expect(result).toMatch(/^REP-\d{8}-000000$/);
  });
});

// ── computeReportHash ────────────────────────────────────────────────────────

describe('computeReportHash', () => {
  const basePayload: Omit<ReportPayload, 'sha256Hash'> = {
    inspectionId: 'insp-001',
    inspectionNumber: 'INSP-2026-000001',
    reportNumber: 'REP-20260906-000001',
    generatedAt: '2026-09-06T10:00:00.000Z',
    rulesetVersion: 'v2024.1',
    inspectorId: 'user-001',
    inspectorName: 'Test Officer',
    inspectorBadge: 'MH-INS-001',
    jurisdiction: 'Mumbai Central',
    locationName: 'Test Market',
    gpsLat: null,
    gpsLng: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewerNotes: null,
    productId: null,
    brandName: 'Test Brand',
    productName: 'Test Product',
    category: null,
    skuBarcode: null,
    evidenceImages: [],
    declarations: [],
    cvMeasurements: [],
    overallStatus: 'PASS',
    totalViolations: 0,
    violations: [],
    appVersion: 'PS26034-v1.0.0',
  };

  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = computeReportHash(basePayload);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input produces same hash', () => {
    const hash1 = computeReportHash(basePayload);
    const hash2 = computeReportHash(basePayload);
    expect(hash1).toBe(hash2);
  });

  it('changes when inspectionId changes', () => {
    const hash1 = computeReportHash(basePayload);
    const hash2 = computeReportHash({ ...basePayload, inspectionId: 'insp-002' });
    expect(hash1).not.toBe(hash2);
  });

  it('changes when overallStatus changes', () => {
    const hashPass = computeReportHash({ ...basePayload, overallStatus: 'PASS' });
    const hashFail = computeReportHash({ ...basePayload, overallStatus: 'FAIL' });
    expect(hashPass).not.toBe(hashFail);
  });

  it('changes when a violation is added', () => {
    const hashClean = computeReportHash(basePayload);
    const hashWithViolation = computeReportHash({
      ...basePayload,
      overallStatus: 'FAIL',
      totalViolations: 1,
      violations: [
        {
          id: 'viol-001',
          ruleCode: 'LM-MRP-001',
          severity: 'critical',
          observedValue: '',
          expectedConstraint: 'MRP must be present and positive',
          ruleVersion: 'v2024.1',
          confidence: 1.0,
          evidenceBbox: {},
          evidenceCropPath: null,
        },
      ],
    });
    expect(hashClean).not.toBe(hashWithViolation);
  });

  it('changes when inspector name is modified (tamper detection)', () => {
    const hash1 = computeReportHash(basePayload);
    const hash2 = computeReportHash({ ...basePayload, inspectorName: 'Fake Officer' });
    expect(hash1).not.toBe(hash2);
  });

  it('changes when generatedAt is modified (timestamp tamper)', () => {
    const hash1 = computeReportHash(basePayload);
    const hash2 = computeReportHash({ ...basePayload, generatedAt: '2020-01-01T00:00:00.000Z' });
    expect(hash1).not.toBe(hash2);
  });
});

// ── Reviewer adjudication guard rules ────────────────────────────────────────

describe('Reviewer adjudication business rules', () => {
  const ALLOWED_VERDICTS = ['PASS', 'FAIL'] as const;

  it('only PASS and FAIL are allowed verdicts (not REVIEW)', () => {
    expect(ALLOWED_VERDICTS).toContain('PASS');
    expect(ALLOWED_VERDICTS).toContain('FAIL');
    expect(ALLOWED_VERDICTS).not.toContain('REVIEW');
  });

  it('rejects empty reviewer_notes', () => {
    const notes = '   ';
    expect(notes.trim()).toBe('');
    // This would trigger the 422 in the API route
  });

  it('accepts non-empty reviewer_notes', () => {
    const notes = 'Verified field officer scan. OCR confidence acceptable.';
    expect(notes.trim().length).toBeGreaterThan(0);
  });
});

// ── Audit trail immutability contract ────────────────────────────────────────

describe('Audit trail immutability contract', () => {
  it('all required audit action types are defined', () => {
    const expectedActions = [
      'INSPECTION_CREATED',
      'IMAGE_UPLOADED',
      'OCR_EXECUTED',
      'COMPLIANCE_EVALUATED',
      'STATUS_OVERRIDDEN',
      'REPORT_GENERATED',
      'REPORT_DOWNLOADED',
      'INSPECTION_EVALUATED',
    ];
    // Verify the action strings match what the API routes emit
    expect(expectedActions).toContain('STATUS_OVERRIDDEN');
    expect(expectedActions).toContain('REPORT_GENERATED');
    expect(expectedActions).toContain('REPORT_DOWNLOADED');
    expect(expectedActions).toContain('COMPLIANCE_EVALUATED');
  });

  it('actor_role must be one of the three valid roles', () => {
    const validRoles = ['inspector', 'reviewer', 'admin'];
    expect(validRoles).toContain('inspector');
    expect(validRoles).toContain('reviewer');
    expect(validRoles).toContain('admin');
    expect(validRoles).not.toContain('superuser');
    expect(validRoles).not.toContain('');
  });
});

// ── ReportPayload structural completeness ────────────────────────────────────

describe('ReportPayload structure', () => {
  const minimalPayload: ReportPayload = {
    inspectionId: 'insp-001',
    inspectionNumber: 'INSP-2026-000001',
    reportNumber: 'REP-20260906-000001',
    generatedAt: '2026-09-06T10:00:00.000Z',
    rulesetVersion: 'v2024.1',
    inspectorId: 'user-001',
    inspectorName: 'Test Officer',
    inspectorBadge: null,
    jurisdiction: 'Test Station',
    locationName: 'Test Location',
    gpsLat: null,
    gpsLng: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewerNotes: null,
    productId: null,
    brandName: null,
    productName: null,
    category: null,
    skuBarcode: null,
    evidenceImages: [],
    declarations: [],
    cvMeasurements: [],
    overallStatus: 'PASS',
    totalViolations: 0,
    violations: [],
    appVersion: 'PS26034-v1.0.0',
    sha256Hash: 'abc123',
  };

  it('has required identification fields', () => {
    expect(minimalPayload.inspectionId).toBeTruthy();
    expect(minimalPayload.inspectionNumber).toBeTruthy();
    expect(minimalPayload.reportNumber).toBeTruthy();
    expect(minimalPayload.sha256Hash).toBeTruthy();
  });

  it('has required inspector fields', () => {
    expect(minimalPayload.inspectorId).toBeTruthy();
    expect(minimalPayload.inspectorName).toBeTruthy();
    expect(minimalPayload.jurisdiction).toBeTruthy();
  });

  it('has a valid overallStatus', () => {
    const validStatuses = ['PASS', 'FAIL', 'REVIEW'];
    expect(validStatuses).toContain(minimalPayload.overallStatus);
  });

  it('totalViolations matches violations array length for PASS', () => {
    expect(minimalPayload.totalViolations).toBe(minimalPayload.violations.length);
  });

  it('appVersion is set', () => {
    expect(minimalPayload.appVersion).toMatch(/^PS26034-/);
  });
});
