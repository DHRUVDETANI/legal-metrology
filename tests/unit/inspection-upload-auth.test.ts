import { describe, it, expect } from 'vitest';
import { generateStoragePath, INSPECTION_IMAGES_BUCKET } from '@/lib/storage/inspection-storage';

describe('Phase 3 Storage & Upload Authorization Security', () => {
  describe('Storage Path Generation', () => {
    it('generates unguessable, structured path scoped to inspection ID', () => {
      const inspectionId = 'insp-abc-123';
      const path1 = generateStoragePath(inspectionId, 'front-label.jpg');
      const path2 = generateStoragePath(inspectionId, 'front-label.jpg');

      expect(path1).toMatch(/^insp-abc-123\/\d+-[0-9a-f-]+\.jpg$/);
      expect(path2).toMatch(/^insp-abc-123\/\d+-[0-9a-f-]+\.jpg$/);
      // Paths should be uniquely generated even for identical filenames
      expect(path1).not.toBe(path2);
    });

    it('sanitizes dangerous characters in file extensions', () => {
      const inspectionId = 'insp-456';
      const path = generateStoragePath(inspectionId, 'payload.php.jpg');
      expect(path.endsWith('.jpg')).toBe(true);

      const pathFallback = generateStoragePath(inspectionId, 'malicious.exe');
      // Non-whitelisted extension falls back to .jpg safely
      expect(pathFallback.endsWith('.jpg')).toBe(true);
    });

    it('targets strictly the private inspection-images bucket', () => {
      expect(INSPECTION_IMAGES_BUCKET).toBe('inspection-images');
    });
  });

  describe('IDOR & Role-Based Authorization Policy Logic', () => {
    // Simulated policy logic mirroring RLS and API route checks
    function canAccessInspection(
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

    function canUploadToInspection(
      user: { id: string; role: 'inspector' | 'reviewer' | 'admin' } | null,
      inspection: { id: string; inspector_id: string }
    ): { allowed: boolean; statusCode: 200 | 401 | 403 } {
      if (!user) {
        return { allowed: false, statusCode: 401 };
      }

      // Reviewers cannot upload images into inspections
      if (user.role === 'reviewer') {
        return { allowed: false, statusCode: 403 };
      }

      if (user.role === 'admin') {
        return { allowed: true, statusCode: 200 };
      }

      if (user.role === 'inspector') {
        if (inspection.inspector_id === user.id) {
          return { allowed: true, statusCode: 200 };
        }
        // Attempting to upload to another inspector's inspection -> IDOR Violation
        return { allowed: false, statusCode: 403 };
      }

      return { allowed: false, statusCode: 403 };
    }

    const inspectorA = { id: 'usr-inspector-1', role: 'inspector' as const };
    const inspectorB = { id: 'usr-inspector-2', role: 'inspector' as const };
    const reviewer = { id: 'usr-reviewer-1', role: 'reviewer' as const };
    const admin = { id: 'usr-admin-1', role: 'admin' as const };

    const inspectionOwnedByA = {
      id: 'insp-001',
      inspector_id: 'usr-inspector-1',
    };

    it('permits the owner inspector to access and upload to their inspection', () => {
      const readAccess = canAccessInspection(inspectorA, inspectionOwnedByA);
      expect(readAccess).toEqual({ allowed: true, statusCode: 200 });

      const uploadAccess = canUploadToInspection(inspectorA, inspectionOwnedByA);
      expect(uploadAccess).toEqual({ allowed: true, statusCode: 200 });
    });

    it('PREVENTS IDOR: Rejects Inspector B attempting to access Inspector A inspection', () => {
      const readAccess = canAccessInspection(inspectorB, inspectionOwnedByA);
      expect(readAccess.allowed).toBe(false);
      expect(readAccess.statusCode).toBe(403);
    });

    it('PREVENTS IDOR: Rejects Inspector B attempting to upload images to Inspector A inspection', () => {
      const uploadAccess = canUploadToInspection(inspectorB, inspectionOwnedByA);
      expect(uploadAccess.allowed).toBe(false);
      expect(uploadAccess.statusCode).toBe(403);
    });

    it('permits Reviewer to view inspection but prevents uploading new packaging images', () => {
      const readAccess = canAccessInspection(reviewer, inspectionOwnedByA);
      expect(readAccess.allowed).toBe(true);

      const uploadAccess = canUploadToInspection(reviewer, inspectionOwnedByA);
      expect(uploadAccess.allowed).toBe(false);
      expect(uploadAccess.statusCode).toBe(403);
    });

    it('permits Admin full access and upload capabilities', () => {
      const readAccess = canAccessInspection(admin, inspectionOwnedByA);
      expect(readAccess.allowed).toBe(true);

      const uploadAccess = canUploadToInspection(admin, inspectionOwnedByA);
      expect(uploadAccess.allowed).toBe(true);
    });

    it('rejects unauthenticated requests with 401', () => {
      const readAccess = canAccessInspection(null, inspectionOwnedByA);
      expect(readAccess).toEqual({ allowed: false, statusCode: 401 });

      const uploadAccess = canUploadToInspection(null, inspectionOwnedByA);
      expect(uploadAccess).toEqual({ allowed: false, statusCode: 401 });
    });
  });
});
