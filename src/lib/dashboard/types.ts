// ============================================================================
// src/lib/dashboard/types.ts
// SIH PS26034 — Dashboard & Operational Monitoring Types
// ============================================================================

import type { InspectionStatus, UserRole } from '@/types/database.types';

export interface ComplianceDistribution {
  pass: number;
  fail: number;
  review: number;
  total: number;
  complianceRatePercent: number;
}

export interface ViolationDistribution {
  critical: number;
  major: number;
  minor: number;
  total: number;
}

export interface InspectorDashboardStats {
  totalInspections: number;
  statusBreakdown: {
    pass: number;
    fail: number;
    review: number;
  };
  totalViolations: number;
  recentInspections: Array<{
    id: string;
    inspectionNumber: string;
    brandName: string;
    productName: string;
    status: InspectionStatus;
    locationName: string;
    totalViolations: number;
    createdAt: string;
  }>;
}

export interface ReviewerDashboardStats {
  pendingReviewCount: number;
  totalViolationsCount: number;
  failCount: number;
  passCount: number;
  totalInspections: number;
  severityDistribution: ViolationDistribution;
  priorityQueue: Array<{
    id: string;
    inspectionNumber: string;
    locationName: string;
    totalViolations: number;
    createdAt: string;
    status: InspectionStatus;
  }>;
}

export interface AdminDashboardStats {
  totalInspections: number;
  complianceDistribution: ComplianceDistribution;
  violationDistribution: ViolationDistribution;
  activeOfficersCount: number;
  activeRulesCount: number;
  totalAuditEvents: number;
  roleDistribution: Record<UserRole, number>;
  recentActivity: Array<{
    id: string;
    action: string;
    actorRole: UserRole;
    entityType: string;
    createdAt: string;
  }>;
}
