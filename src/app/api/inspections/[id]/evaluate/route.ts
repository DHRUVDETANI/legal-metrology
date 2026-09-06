// ============================================================================
// src/app/api/inspections/[id]/evaluate/route.ts
// SIH PS26034 — Deterministic Legal Metrology Compliance Evaluation Route
//
// POST: Evaluates statutory declarations and CV measurements for an inspection,
//       creates structured violations, updates the inspection status, and emits an audit log.
//
// SECURITY:
//   - Requires authenticated session.
//   - IDOR protected: Caller must own the inspection (or be admin/reviewer).
//   - Idempotent: Repeated evaluation cleans previous violations cleanly.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';
import { getActiveRules, evaluateCompliance } from '@/lib/compliance';
import type {
  Inspection,
  Declaration,
  CvMeasurement,
} from '@/types/database.types';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 403 });
    }
    const { id: inspectionId } = await params;

    if (!inspectionId) {
      return NextResponse.json({ error: 'Inspection ID is required.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // 1. Verify inspection existence and enforce IDOR check
    const { data: inspection, error: inspError } = await (
      supabase.from('inspections') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{
              data: Pick<Inspection, 'id' | 'inspector_id' | 'ruleset_version'> | null;
              error: Error | null;
            }>;
          };
        };
      }
    )
      .select('id, inspector_id, ruleset_version')
      .eq('id', inspectionId)
      .single();

    if (inspError || !inspection) {
      return NextResponse.json({ error: 'Inspection record not found.' }, { status: 404 });
    }

    // Role-based IDOR access control
    if (profile.role === 'inspector' && inspection.inspector_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied: You cannot evaluate an inspection belonging to another inspector.' },
        { status: 403 }
      );
    }

    // 2. Fetch all declarations for this inspection
    const { data: declarationsData } = await (
      supabase.from('declarations') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => Promise<{
            data: Declaration[] | null;
            error: Error | null;
          }>;
        };
      }
    )
      .select('*')
      .eq('inspection_id', inspectionId);

    const declarationsMap: Record<
      string,
      {
        id?: string;
        fieldName: string;
        rawOcrText: string;
        observedValue: string;
        normalizedValue: Record<string, unknown>;
        confidence: number;
        bbox?: { x: number; y: number; width: number; height: number };
      }
    > = {};

    if (declarationsData) {
      for (const d of declarationsData) {
        declarationsMap[d.field_name] = {
          id: d.id,
          fieldName: d.field_name,
          rawOcrText: d.raw_ocr_text,
          observedValue: d.observed_value,
          normalizedValue: (d.normalized_value as Record<string, unknown>) || {},
          confidence: d.confidence,
          bbox: d.bbox as { x: number; y: number; width: number; height: number } | undefined,
        };
      }
    }

    // 3. Fetch CV measurements if present
    const { data: cvData } = await (
      supabase.from('cv_measurements') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => Promise<{
            data: CvMeasurement[] | null;
            error: Error | null;
          }>;
        };
      }
    )
      .select('*')
      .eq('inspection_id', inspectionId);

    const cvMap: Record<
      string,
      {
        id?: string;
        targetField: string;
        characterHeightPx: number;
        contrastRatio: number;
        isCalibrated: boolean;
        measurementMetadata?: Record<string, unknown>;
      }
    > = {};

    if (cvData) {
      for (const c of cvData) {
        cvMap[c.target_field] = {
          id: c.id,
          targetField: c.target_field,
          characterHeightPx: c.character_height_px,
          contrastRatio: c.contrast_ratio,
          isCalibrated: c.is_calibrated,
          measurementMetadata: c.measurement_metadata as Record<string, unknown> | undefined,
        };
      }
    }

    // 4. Load active rules for this inspection's ruleset_version
    const rulesetVersion = inspection.ruleset_version || 'v2024.1';
    const activeRules = await getActiveRules(supabase, rulesetVersion);

    // 5. Run deterministic compliance evaluation
    const summary = evaluateCompliance(
      {
        inspectionId,
        rulesetVersion,
        declarations: declarationsMap,
        cvMeasurements: cvMap,
      },
      activeRules
    );

    // 6. Idempotency: Clean previous violations for this inspection
    await (
      supabase.from('violations') as unknown as {
        delete: () => {
          eq: (col: string, val: string) => Promise<{ error: Error | null }>;
        };
      }
    )
      .delete()
      .eq('inspection_id', inspectionId);

    // 7. Insert new violations if any
    if (summary.violations.length > 0) {
      const violationRows = summary.violations.map((v) => ({
        inspection_id: inspectionId,
        rule_id: v.ruleId,
        rule_code: v.ruleCode,
        rule_version: v.ruleVersion,
        observed_value: v.observedValue,
        expected_constraint: v.expectedConstraint,
        severity: v.severity,
        confidence: v.confidence,
        evidence_bbox: v.evidenceBbox,
        evidence_crop_path: v.evidenceCropPath,
      }));

      const { error: violInsertErr } = await (
        supabase.from('violations') as unknown as {
          insert: (rows: Record<string, unknown>[]) => Promise<{ error: Error | null }>;
        }
      ).insert(violationRows);

      if (violInsertErr) {
        console.error('Failed to insert violations:', violInsertErr);
      }
    }

    // 8. Update inspection record with new verdict and violation count
    await (
      supabase.from('inspections') as unknown as {
        update: (values: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{ error: Error | null }>;
        };
      }
    )
      .update({
        status: summary.overallStatus,
        total_violations: summary.totalViolations,
      })
      .eq('id', inspectionId);

    // 9. Emit immutable audit log
    await (
      supabase.from('audit_logs') as unknown as {
        insert: (row: Record<string, unknown>) => Promise<{ error: Error | null }>;
      }
    ).insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: 'INSPECTION_EVALUATED',
      entity_type: 'inspection',
      entity_id: inspectionId,
      details: {
        overall_status: summary.overallStatus,
        total_rules_evaluated: summary.totalRulesEvaluated,
        passed_count: summary.passedCount,
        failed_count: summary.failedCount,
        review_count: summary.reviewCount,
        total_violations: summary.totalViolations,
        ruleset_version: rulesetVersion,
      },
    });

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
