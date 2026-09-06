import { describe, it, expect } from 'vitest';

describe('Phase 6 Computer Vision Measurement Authorization & IDOR Security', () => {
  function canMeasureInspectionImage(
    user: { id: string; role: 'inspector' | 'reviewer' | 'admin' } | null,
    inspection: { id: string; inspector_id: string }
  ): { allowed: boolean; statusCode: 200 | 401 | 403 } {
    if (!user) {
      return { allowed: false, statusCode: 401 };
    }

    if (user.role === 'admin' || user.role === 'reviewer') {
      return { allowed: true, statusCode: 200 };
    }

    if (user.role === 'inspector' && inspection.inspector_id === user.id) {
      return { allowed: true, statusCode: 200 };
    }

    return { allowed: false, statusCode: 403 };
  }

  const inspectorA = { id: 'usr-insp-1', role: 'inspector' as const };
  const inspectorB = { id: 'usr-insp-2', role: 'inspector' as const };
  const reviewer = { id: 'usr-rev-1', role: 'reviewer' as const };
  const admin = { id: 'usr-admin-1', role: 'admin' as const };

  const inspectionOwnedByA = {
    id: 'insp-200',
    inspector_id: 'usr-insp-1',
  };

  it('permits the owning inspector to trigger CV measurement', () => {
    const access = canMeasureInspectionImage(inspectorA, inspectionOwnedByA);
    expect(access).toEqual({ allowed: true, statusCode: 200 });
  });

  it('PREVENTS IDOR: Rejects Inspector B from measuring Inspector A inspection', () => {
    const access = canMeasureInspectionImage(inspectorB, inspectionOwnedByA);
    expect(access.allowed).toBe(false);
    expect(access.statusCode).toBe(403);
  });

  it('permits Reviewer to run CV measurement for verification', () => {
    const access = canMeasureInspectionImage(reviewer, inspectionOwnedByA);
    expect(access).toEqual({ allowed: true, statusCode: 200 });
  });

  it('permits Admin to run CV measurement across all inspections', () => {
    const access = canMeasureInspectionImage(admin, inspectionOwnedByA);
    expect(access).toEqual({ allowed: true, statusCode: 200 });
  });

  it('rejects unauthenticated requests with 401', () => {
    const access = canMeasureInspectionImage(null, inspectionOwnedByA);
    expect(access).toEqual({ allowed: false, statusCode: 401 });
  });
});
