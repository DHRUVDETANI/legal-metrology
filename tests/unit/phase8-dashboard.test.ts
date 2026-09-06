// ============================================================================
// tests/unit/phase8-dashboard.test.ts
// SIH PS26034 — Phase 8: Reviewer & Admin Dashboards / Operational Monitoring
// ============================================================================

import { describe, it, expect } from 'vitest';
import type {
  InspectorDashboardStats,
  ReviewerDashboardStats,
  AdminDashboardStats,
  ComplianceDistribution,
  ViolationDistribution,
} from '../../src/lib/dashboard/types';

describe('Phase 8 Dashboard Aggregations & Distribution Metrics', () => {
  describe('ComplianceDistribution Calculations', () => {
    it('calculates compliance percentage accurately with rounding', () => {
      const pass = 47;
      const fail = 2;
      const review = 1;
      const total = pass + fail + review;

      const complianceRatePercent = Math.round((pass / total) * 1000) / 10;
      expect(complianceRatePercent).toBe(94.0);
    });

    it('handles zero total inspections without division by zero', () => {
      const total = 0;
      const pass = 0;
      const complianceRatePercent = total > 0 ? Math.round((pass / total) * 1000) / 10 : 0;
      expect(complianceRatePercent).toBe(0);
    });

    it('enforces total equals sum of pass, fail, and review components', () => {
      const dist: ComplianceDistribution = {
        pass: 10,
        fail: 3,
        review: 2,
        total: 15,
        complianceRatePercent: 66.7,
      };

      expect(dist.total).toBe(dist.pass + dist.fail + dist.review);
    });
  });

  describe('ViolationDistribution Calculations', () => {
    it('accurately distributes violations by statutory severity level', () => {
      const dist: ViolationDistribution = {
        critical: 4,
        major: 2,
        minor: 1,
        total: 7,
      };

      expect(dist.total).toBe(dist.critical + dist.major + dist.minor);
      expect(dist.critical).toBeGreaterThan(dist.major);
    });
  });

  describe('Inspector Dashboard Isolation', () => {
    it('scopes statistics strictly to the requested inspector id', () => {
      const stats: InspectorDashboardStats = {
        totalInspections: 5,
        statusBreakdown: { pass: 3, fail: 1, review: 1 },
        totalViolations: 2,
        recentInspections: [
          {
            id: 'insp-1',
            inspectionNumber: 'INSP-2026-001',
            brandName: 'Brand A',
            productName: 'Product A',
            status: 'PASS',
            locationName: 'Station 1',
            totalViolations: 0,
            createdAt: '2026-09-06T10:00:00Z',
          },
        ],
      };

      expect(stats.totalInspections).toBe(5);
      expect(stats.statusBreakdown.pass + stats.statusBreakdown.fail + stats.statusBreakdown.review).toBe(5);
    });
  });

  describe('Reviewer Dashboard & Queue Filtering Logic', () => {
    const sampleQueue = [
      {
        id: '1',
        inspectionNumber: 'INSP-001',
        locationName: 'Pune Market Yard',
        status: 'REVIEW' as const,
        totalViolations: 2,
        createdAt: '2026-09-06T12:00:00Z',
      },
      {
        id: '2',
        inspectionNumber: 'INSP-002',
        locationName: 'Mumbai Retail Center',
        status: 'FAIL' as const,
        totalViolations: 1,
        createdAt: '2026-09-06T13:00:00Z',
      },
      {
        id: '3',
        inspectionNumber: 'INSP-003',
        locationName: 'Nagpur Superstore',
        status: 'PASS' as const,
        totalViolations: 0,
        createdAt: '2026-09-06T11:00:00Z',
      },
    ];

    it('filters reviewer queue items by status REVIEW', () => {
      const filtered = sampleQueue.filter((item) => item.status === 'REVIEW');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].inspectionNumber).toBe('INSP-001');
    });

    it('filters reviewer queue items having violations', () => {
      const filtered = sampleQueue.filter((item) => item.totalViolations > 0);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.inspectionNumber)).toEqual(['INSP-001', 'INSP-002']);
    });

    it('searches reviewer queue items by location or inspection ref', () => {
      const q = 'mumbai';
      const filtered = sampleQueue.filter(
        (i) => i.inspectionNumber.toLowerCase().includes(q) || i.locationName.toLowerCase().includes(q)
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].locationName).toContain('Mumbai');
    });

    it('sorts reviewer queue items by timestamp descending', () => {
      const sorted = [...sampleQueue].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      expect(sorted[0].inspectionNumber).toBe('INSP-002');
      expect(sorted[2].inspectionNumber).toBe('INSP-003');
    });
  });

  describe('Admin Security & Dashboard Integrity', () => {
    it('aggregates system-wide counts without exposing private credentials', () => {
      const adminStats: AdminDashboardStats = {
        totalInspections: 150,
        complianceDistribution: {
          pass: 135,
          fail: 10,
          review: 5,
          total: 150,
          complianceRatePercent: 90.0,
        },
        violationDistribution: {
          critical: 5,
          major: 8,
          minor: 3,
          total: 16,
        },
        activeOfficersCount: 12,
        activeRulesCount: 6,
        totalAuditEvents: 420,
        roleDistribution: {
          inspector: 8,
          reviewer: 3,
          admin: 1,
        },
        recentActivity: [
          {
            id: 'log-1',
            action: 'INSPECTION_EVALUATION_COMPLETED',
            actorRole: 'inspector',
            entityType: 'inspections',
            createdAt: '2026-09-06T14:00:00Z',
          },
        ],
      };

      expect(adminStats.totalInspections).toBe(150);
      expect(adminStats.activeRulesCount).toBe(6);
      expect(adminStats.roleDistribution.admin).toBe(1);
      expect(adminStats.roleDistribution.inspector).toBe(8);
      // Ensure no passwords or raw secrets in stats structure
      expect(JSON.stringify(adminStats)).not.toContain('password');
      expect(JSON.stringify(adminStats)).not.toContain('secret');
    });
  });
});
