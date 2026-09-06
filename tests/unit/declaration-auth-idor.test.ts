import { describe, it, expect } from 'vitest';

describe('Phase 4 Declaration Extraction & Edit Authorization Security', () => {
  function canExtractInspectionDeclarations(
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

  function canEditDeclaration(
    user: { id: string; role: 'inspector' | 'reviewer' | 'admin' } | null,
    inspection: { id: string; inspector_id: string }
  ): { allowed: boolean; statusCode: 200 | 401 | 403 } {
    if (!user) {
      return { allowed: false, statusCode: 401 };
    }

    if (user.role === 'admin' || user.role === 'reviewer') {
      return { allowed: true, statusCode: 200 };
    }

    if (user.role === 'inspector') {
      if (inspection.inspector_id === user.id) {
        return { allowed: true, statusCode: 200 };
      }
      return { allowed: false, statusCode: 403 };
    }

    return { allowed: false, statusCode: 403 };
  }

  const inspectorA = { id: 'usr-insp-1', role: 'inspector' as const };
  const inspectorB = { id: 'usr-insp-2', role: 'inspector' as const };
  const reviewer = { id: 'usr-rev-1', role: 'reviewer' as const };
  const admin = { id: 'usr-admin-1', role: 'admin' as const };

  const inspectionOwnedByA = {
    id: 'insp-100',
    inspector_id: 'usr-insp-1',
  };

  it('permits the owning inspector to trigger OCR extraction', () => {
    const access = canExtractInspectionDeclarations(inspectorA, inspectionOwnedByA);
    expect(access).toEqual({ allowed: true, statusCode: 200 });
  });

  it('PREVENTS IDOR: Rejects Inspector B from triggering extraction on Inspector A inspection', () => {
    const access = canExtractInspectionDeclarations(inspectorB, inspectionOwnedByA);
    expect(access.allowed).toBe(false);
    expect(access.statusCode).toBe(403);
  });

  it('PREVENTS IDOR: Rejects Inspector B from editing declarations on Inspector A inspection', () => {
    const access = canEditDeclaration(inspectorB, inspectionOwnedByA);
    expect(access.allowed).toBe(false);
    expect(access.statusCode).toBe(403);
  });

  it('permits Reviewer to edit declarations for statutory corrections', () => {
    const access = canEditDeclaration(reviewer, inspectionOwnedByA);
    expect(access).toEqual({ allowed: true, statusCode: 200 });
  });

  it('permits Admin full extraction and editing capabilities', () => {
    const extractAccess = canExtractInspectionDeclarations(admin, inspectionOwnedByA);
    expect(extractAccess).toEqual({ allowed: true, statusCode: 200 });

    const editAccess = canEditDeclaration(admin, inspectionOwnedByA);
    expect(editAccess).toEqual({ allowed: true, statusCode: 200 });
  });

  it('rejects unauthenticated requests with 401', () => {
    const extractAccess = canExtractInspectionDeclarations(null, inspectionOwnedByA);
    expect(extractAccess).toEqual({ allowed: false, statusCode: 401 });

    const editAccess = canEditDeclaration(null, inspectionOwnedByA);
    expect(editAccess).toEqual({ allowed: false, statusCode: 401 });
  });
});
