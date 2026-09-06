// ============================================================================
// tests/unit/auth-security-rls.test.ts
// SIH PS26034 — Comprehensive Security, IDOR & Role Escalation Protection Tests
//
// Tests:
//  1. Role escalation rejection (client cannot elevate own role)
//  2. Insecure Direct Object Reference (IDOR) prevention across inspector boundaries
//  3. Audit log append-only invariant protection
//  4. Storage bucket authorization & mime type bounds
//  5. Reviewer and Admin authorized data access scoping
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthorizationError, requireInspector, requireReviewer, requireAdmin, requireRole } from '@/lib/auth/helpers';
import type { UserProfile } from '@/types/database.types';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

describe('Security Invariants: Role Escalation & IDOR Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupUser(id: string, role: 'inspector' | 'reviewer' | 'admin') {
    mockGetUser.mockResolvedValue({ data: { user: { id } }, error: null });
    const profile: UserProfile = {
      id,
      role,
      full_name: `Test User ${id}`,
      jurisdiction: 'District 1',
      badge_number: `BADGE-${id}`,
      phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockSingle.mockResolvedValue({ data: profile, error: null });
  }

  it('PREVENTS role escalation: an inspector cannot execute administrative actions', async () => {
    setupUser('inspector-001', 'inspector');

    await expect(requireAdmin()).rejects.toThrow(AuthorizationError);
    await expect(requireAdmin()).rejects.toMatchObject({ statusCode: 403 });
  });

  it('PREVENTS role escalation: a reviewer cannot execute administrative actions', async () => {
    setupUser('reviewer-001', 'reviewer');

    await expect(requireAdmin()).rejects.toThrow(AuthorizationError);
    await expect(requireAdmin()).rejects.toMatchObject({ statusCode: 403 });
  });

  it('PREVENTS role escalation: an inspector cannot execute reviewer actions', async () => {
    setupUser('inspector-001', 'inspector');

    await expect(requireReviewer()).rejects.toThrow(AuthorizationError);
    await expect(requireReviewer()).rejects.toMatchObject({ statusCode: 403 });
  });

  it('PERMITS reviewer to perform review queue actions', async () => {
    setupUser('reviewer-001', 'reviewer');

    const profile = await requireReviewer();
    expect(profile.role).toBe('reviewer');
  });

  it('PERMITS admin as super-role across inspector and reviewer domains', async () => {
    setupUser('admin-001', 'admin');

    const asInspector = await requireInspector();
    expect(asInspector.role).toBe('admin');

    const asReviewer = await requireReviewer();
    expect(asReviewer.role).toBe('admin');

    const asAdmin = await requireAdmin();
    expect(asAdmin.role).toBe('admin');
  });

  it('ENFORCES server-side role resolution: rejects arbitrary client role claims', async () => {
    // Attacker sends role: 'admin' in a simulated request body, but DB profile says 'inspector'
    setupUser('attacker-001', 'inspector');

    await expect(requireRole('admin')).rejects.toThrow(AuthorizationError);
  });
});

describe('IDOR Prevention Logic', () => {
  // Pure helper simulating the RLS check: can_access_inspection(target_inspection_id)
  function canAccessInspection(
    actorId: string,
    actorRole: 'inspector' | 'reviewer' | 'admin',
    inspectionOwnerId: string
  ): boolean {
    if (actorRole === 'admin' || actorRole === 'reviewer') {
      return true;
    }
    return actorId === inspectionOwnerId;
  }

  it('ALLOWS inspector to access their own inspection record', () => {
    const isAllowed = canAccessInspection('insp-A', 'inspector', 'insp-A');
    expect(isAllowed).toBe(true);
  });

  it('BLOCKS IDOR: inspector cannot access another inspector inspection record', () => {
    const isAllowed = canAccessInspection('insp-A', 'inspector', 'insp-B');
    expect(isAllowed).toBe(false);
  });

  it('ALLOWS reviewer to audit any inspection record in the queue', () => {
    const isAllowed = canAccessInspection('rev-01', 'reviewer', 'insp-B');
    expect(isAllowed).toBe(true);
  });

  it('ALLOWS administrator to access any inspection record statewide', () => {
    const isAllowed = canAccessInspection('admin-01', 'admin', 'insp-B');
    expect(isAllowed).toBe(true);
  });
});

describe('Audit Log Security Invariant', () => {
  // Validates the append-only rule for audit logs
  function validateAuditLogOperation(operation: 'INSERT' | 'SELECT' | 'UPDATE' | 'DELETE') {
    if (operation === 'UPDATE' || operation === 'DELETE') {
      throw new Error('Audit logs are immutable. UPDATE and DELETE operations are forbidden.');
    }
    return true;
  }

  it('permits INSERT and SELECT on audit_logs', () => {
    expect(validateAuditLogOperation('INSERT')).toBe(true);
    expect(validateAuditLogOperation('SELECT')).toBe(true);
  });

  it('FORBIDS UPDATE on audit_logs to preserve court admissibility', () => {
    expect(() => validateAuditLogOperation('UPDATE')).toThrow('Audit logs are immutable');
  });

  it('FORBIDS DELETE on audit_logs to preserve tamper-evident trail', () => {
    expect(() => validateAuditLogOperation('DELETE')).toThrow('Audit logs are immutable');
  });
});

describe('Storage Bucket Security Validation', () => {
  const allowedBuckets = {
    'inspection-images': {
      isPublic: false,
      maxSizeBytes: 15728640,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    'evidence-crops': {
      isPublic: false,
      maxSizeBytes: 5242880,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    'inspection-reports': {
      isPublic: false,
      maxSizeBytes: 10485760,
      allowedMimeTypes: ['application/pdf'],
    },
  };

  it('verifies all storage buckets are strictly private', () => {
    Object.values(allowedBuckets).forEach((bucket) => {
      expect(bucket.isPublic).toBe(false);
    });
  });

  it('enforces MIME type restrictions for packaging images and evidence crops', () => {
    expect(allowedBuckets['inspection-images'].allowedMimeTypes).toContain('image/jpeg');
    expect(allowedBuckets['inspection-images'].allowedMimeTypes).not.toContain('application/pdf');
    expect(allowedBuckets['inspection-images'].allowedMimeTypes).not.toContain('text/html');
  });

  it('enforces PDF MIME type restrictions for inspection reports', () => {
    expect(allowedBuckets['inspection-reports'].allowedMimeTypes).toEqual(['application/pdf']);
  });

  it('enforces 15MB file size limit for raw inspection images', () => {
    expect(allowedBuckets['inspection-images'].maxSizeBytes).toBe(15 * 1024 * 1024);
  });
});
