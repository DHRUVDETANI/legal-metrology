// ============================================================================
// src/lib/reports/generator.ts
// SIH PS26034 — Compliance Report Generator
//
// Assembles a structured ReportPayload from all inspection data sources,
// computes a tamper-evident SHA-256 hash, and provides the canonical
// report number format. Zero fabrication — every field comes from DB.
// ============================================================================

import crypto from 'crypto';
import type { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  Inspection,
  PackagingImage,
  Declaration,
  CvMeasurement,
  Violation,
} from '@/types/database.types';
import type {
  ReportPayload,
  ReportDeclarationEntry,
  ReportViolationEntry,
  ReportCvMeasurementEntry,
  ReportEvidenceImage,
} from './types';

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** Application version embedded in every report for provenance. */
const APP_VERSION = 'PS26034-v1.0.0';

/**
 * Builds a canonical report reference number.
 * Format: REP-YYYYMMDD-{6-digit-suffix}
 */
export function buildReportNumber(inspectionNumber: string): string {
  const now = new Date();
  const dateStr =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0');
  // Derive suffix from inspection number to keep it deterministic per inspection
  const suffix = inspectionNumber.replace(/[^0-9]/g, '').slice(-6).padStart(6, '0');
  return `REP-${dateStr}-${suffix}`;
}

/**
 * Computes SHA-256 hash of the report payload (excluding the hash field itself).
 * Used for tamper-evident verification.
 */
export function computeReportHash(payload: Omit<ReportPayload, 'sha256Hash'>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Assembles the complete ReportPayload from all DB sources for an inspection.
 * This is a read-only operation — no writes to any table.
 *
 * @param inspectionId - The UUID of the inspection
 * @param supabase - Authenticated server-side Supabase client
 * @param inspectorProfile - The inspector's profile (name, badge, jurisdiction)
 */
export async function generateReportPayload(
  inspectionId: string,
  supabase: ServerSupabaseClient,
  inspectorProfile: {
    id: string;
    full_name: string;
    badge_number: string | null;
    jurisdiction: string;
  }
): Promise<ReportPayload> {
  // ── 1. Fetch inspection ──────────────────────────────────────────────────
  const { data: inspection, error: inspError } = await (
    supabase.from('inspections') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: Inspection & { products?: { brand_name?: string; product_name?: string; category?: string; sku_barcode?: string } | null } | null; error: Error | null }>;
        };
      };
    }
  )
    .select('*, products(*)')
    .eq('id', inspectionId)
    .single();

  if (inspError || !inspection) {
    throw new Error(`Inspection not found: ${inspectionId}`);
  }

  // ── 2. Fetch packaging images ────────────────────────────────────────────
  const { data: images } = await (
    supabase.from('packaging_images') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: PackagingImage[] | null }>;
        };
      };
    }
  )
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: true });

  // ── 3. Fetch declarations ────────────────────────────────────────────────
  const { data: declarations } = await (
    supabase.from('declarations') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: Declaration[] | null }>;
        };
      };
    }
  )
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: true });

  // ── 4. Fetch CV measurements ─────────────────────────────────────────────
  const { data: cvMeasurements } = await (
    supabase.from('cv_measurements') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => Promise<{ data: CvMeasurement[] | null }>;
      };
    }
  )
    .select('*')
    .eq('inspection_id', inspectionId);

  // ── 5. Fetch violations ──────────────────────────────────────────────────
  const { data: violations } = await (
    supabase.from('violations') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: Violation[] | null }>;
        };
      };
    }
  )
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: true });

  // ── 6. Map to typed structures ───────────────────────────────────────────
  const reportNumber = buildReportNumber(inspection.inspection_number);
  const generatedAt = new Date().toISOString();

  const evidenceImages: ReportEvidenceImage[] = (images || []).map((img) => ({
    id: img.id,
    storagePath: img.storage_path,
    panelType: img.panel_type,
    widthPx: img.width_px,
    heightPx: img.height_px,
    capturedAt: img.created_at,
  }));

  const declarationEntries: ReportDeclarationEntry[] = (declarations || []).map((d) => ({
    fieldName: d.field_name,
    observedValue: d.observed_value,
    rawOcrText: d.raw_ocr_text,
    normalizedValue: (d.normalized_value as Record<string, unknown>) || {},
    confidence: Math.round(d.confidence * 100), // store as 0–1, display as 0–100
    isManuallyEdited: d.is_manually_edited,
    editedBy: d.edited_by,
    bbox: d.bbox as { x: number; y: number; width: number; height: number } | null,
  }));

  const cvEntries: ReportCvMeasurementEntry[] = (cvMeasurements || []).map((c) => {
    const meta = (c.measurement_metadata as Record<string, unknown>) || {};
    return {
      targetField: c.target_field,
      characterHeightPx: c.character_height_px,
      characterHeightMm: typeof meta.character_height_mm === 'number' ? meta.character_height_mm : null,
      contrastRatio: c.contrast_ratio,
      isCalibrated: c.is_calibrated,
      confidence: typeof meta.confidence === 'number' ? meta.confidence : null,
      glyphCount: typeof meta.glyph_count === 'number' ? meta.glyph_count : null,
      methodVersion: typeof meta.method_version === 'string' ? meta.method_version : null,
      warning: typeof meta.warning === 'string' ? meta.warning : null,
    };
  });

  const violationEntries: ReportViolationEntry[] = (violations || []).map((v) => ({
    id: v.id,
    ruleCode: v.rule_code,
    severity: v.severity,
    observedValue: v.observed_value,
    expectedConstraint: v.expected_constraint,
    ruleVersion: v.rule_version,
    confidence: v.confidence,
    evidenceBbox: (v.evidence_bbox as Record<string, unknown>) || {},
    evidenceCropPath: v.evidence_crop_path,
  }));

  const productInfo = (inspection as Inspection & { products?: { brand_name?: string; product_name?: string; category?: string; sku_barcode?: string } | null }).products;

  // ── 7. Assemble payload (without hash) ──────────────────────────────────
  const payloadWithoutHash: Omit<ReportPayload, 'sha256Hash'> = {
    inspectionId,
    inspectionNumber: inspection.inspection_number,
    reportNumber,
    generatedAt,
    rulesetVersion: inspection.ruleset_version,

    inspectorId: inspectorProfile.id,
    inspectorName: inspectorProfile.full_name,
    inspectorBadge: inspectorProfile.badge_number,
    jurisdiction: inspectorProfile.jurisdiction,
    locationName: inspection.location_name,
    gpsLat: inspection.gps_lat,
    gpsLng: inspection.gps_lng,

    reviewedBy: inspection.reviewed_by,
    reviewedAt: inspection.reviewed_at,
    reviewerNotes: inspection.reviewer_notes,

    productId: inspection.product_id,
    brandName: productInfo?.brand_name || null,
    productName: productInfo?.product_name || null,
    category: productInfo?.category || null,
    skuBarcode: productInfo?.sku_barcode || null,

    evidenceImages,
    declarations: declarationEntries,
    cvMeasurements: cvEntries,

    overallStatus: inspection.status as 'PASS' | 'FAIL' | 'REVIEW',
    totalViolations: inspection.total_violations,
    violations: violationEntries,

    appVersion: APP_VERSION,
  };

  // ── 8. Compute hash and return ───────────────────────────────────────────
  const sha256Hash = computeReportHash(payloadWithoutHash);

  return {
    ...payloadWithoutHash,
    sha256Hash,
  };
}
