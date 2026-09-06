// ============================================================================
// src/app/api/inspections/[id]/advisory/route.ts
// SIH PS26034 — Inspection AI Advisory Guidance Route
//
// GET: Returns advisory explanations, statutory citations, and reviewer
//      suggestions for an evaluated inspection.
//
// SECURITY:
//   - Requires authenticated session.
//   - IDOR protected: Caller must own the inspection (or hold reviewer/admin role).
//   - Audited: Logs AI_ADVISORY_GENERATED to immutable audit_logs.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';
import { getActiveRules, evaluateCompliance } from '@/lib/compliance';
import { generateInspectionAdvisory } from '@/lib/advisory/service';
import type {
  Inspection,
  Declaration,
  CvMeasurement,
} from '@/types/database.types';

export async function GET(
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
      return NextResponse.json({ error: 'Inspection not found.' }, { status: 404 });
    }

    // IDOR: Inspectors can only fetch advisory for their own inspections
    if (profile.role === 'inspector' && inspection.inspector_id !== user.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // 2. Fetch declarations & CV measurements to evaluate deterministic context
    const { data: declarationsData } = await (
      supabase.from('declarations') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => Promise<{ data: Declaration[] | null }>;
        };
      }
    )
      .select('*')
      .eq('inspection_id', inspectionId);

    const { data: cvData } = await (
      supabase.from('cv_measurements') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => Promise<{ data: CvMeasurement[] | null }>;
        };
      }
    )
      .select('*')
      .eq('inspection_id', inspectionId);

    const declarationsMap: Record<
      string,
      {
        fieldName: string;
        rawOcrText: string;
        observedValue: string;
        normalizedValue: Record<string, unknown>;
        confidence: number;
      }
    > = {};

    for (const d of declarationsData || []) {
      declarationsMap[d.field_name] = {
        fieldName: d.field_name,
        rawOcrText: d.raw_ocr_text,
        observedValue: d.observed_value,
        normalizedValue: (d.normalized_value as Record<string, unknown>) || {},
        confidence: d.confidence,
      };
    }

    const cvMeasurementsMap: Record<
      string,
      {
        targetField: string;
        characterHeightPx: number;
        contrastRatio: number;
        isCalibrated: boolean;
      }
    > = {};

    for (const cv of cvData || []) {
      cvMeasurementsMap[cv.target_field] = {
        targetField: cv.target_field,
        characterHeightPx: cv.character_height_px,
        contrastRatio: cv.contrast_ratio,
        isCalibrated: cv.is_calibrated,
      };
    }

    // 3. Compute deterministic compliance summary
    const rules = await getActiveRules(supabase, inspection.ruleset_version);
    const summary = evaluateCompliance(
      {
        inspectionId,
        rulesetVersion: inspection.ruleset_version,
        declarations: declarationsMap,
        cvMeasurements: cvMeasurementsMap,
      },
      rules
    );

    // 4. Generate post-deterministic AI advisory guidance
    const advisory = generateInspectionAdvisory(
      inspectionId,
      summary,
      declarationsData || undefined
    );

    // 5. Append-only audit logging for traceability
    await (
      supabase.from('audit_logs') as unknown as {
        insert: (row: Record<string, unknown>) => Promise<{ error: Error | null }>;
      }
    ).insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: 'AI_ADVISORY_GENERATED',
      entity_type: 'inspections',
      entity_id: inspectionId,
      details: {
        discrepancyCount: advisory.discrepancyCount,
        advisoriesCount: advisory.advisories.length,
      },
    });

    return NextResponse.json({
      success: true,
      advisory,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized access to advisory.';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
