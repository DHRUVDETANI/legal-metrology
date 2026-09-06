// ============================================================================
// src/app/api/inspections/[id]/report/route.ts
// SIH PS26034 — Compliance Report Generation Route
//
// POST: Generates a structured compliance report payload, computes its
//       SHA-256 hash, persists a reports record, and emits an audit log.
//       Returns the report metadata including a short-lived signed URL.
//
// SECURITY:
//   - Authenticated session required.
//   - IDOR protected: Inspectors can only generate reports for their own inspections.
//   - One report per inspection (upsert by inspection_id unique constraint).
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';
import { generateReportPayload, buildReportNumber } from '@/lib/reports/generator';
import type { Inspection, Report } from '@/types/database.types';

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

    // 1. Verify inspection access + IDOR
    const { data: inspection, error: inspError } = await (
      supabase.from('inspections') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: Pick<Inspection, 'id' | 'inspector_id' | 'inspection_number' | 'status'> | null; error: Error | null }>;
          };
        };
      }
    )
      .select('id, inspector_id, inspection_number, status')
      .eq('id', inspectionId)
      .single();

    if (inspError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found.' }, { status: 404 });
    }

    if (profile.role === 'inspector' && inspection.inspector_id !== user.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // 2. Generate report payload with SHA-256 hash
    const reportPayload = await generateReportPayload(inspectionId, supabase, {
      id: profile.id,
      full_name: profile.full_name,
      badge_number: profile.badge_number,
      jurisdiction: profile.jurisdiction,
    });

    // 3. Build storage path (reports bucket)
    const pdfStoragePath = `reports/${inspectionId}/report.json`;
    const reportNumber = buildReportNumber(inspection.inspection_number);

    // 4. Upsert report record (one report per inspection)
    const { data: existingReport } = await (
      supabase.from('reports') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: Report | null; error: Error | null }>;
          };
        };
      }
    )
      .select('id')
      .eq('inspection_id', inspectionId)
      .single();

    let report: Report | null = null;

    if (existingReport) {
      // Update existing report
      const { data: updated, error: updateErr } = await (
        supabase.from('reports') as unknown as {
          update: (vals: Record<string, unknown>) => {
            eq: (col: string, val: string) => {
              select: (cols: string) => {
                single: () => Promise<{ data: Report | null; error: Error | null }>;
              };
            };
          };
        }
      )
        .update({
          sha256_hash: reportPayload.sha256Hash,
          report_number: reportNumber,
          pdf_storage_path: pdfStoragePath,
          created_by: profile.id,
        })
        .eq('inspection_id', inspectionId)
        .select('*')
        .single();
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      report = updated;
    } else {
      // Insert new report
      const { data: inserted, error: insertErr } = await (
        supabase.from('reports') as unknown as {
          insert: (vals: Record<string, unknown>) => {
            select: (cols: string) => {
              single: () => Promise<{ data: Report | null; error: Error | null }>;
            };
          };
        }
      )
        .insert({
          inspection_id: inspectionId,
          report_number: reportNumber,
          sha256_hash: reportPayload.sha256Hash,
          pdf_storage_path: pdfStoragePath,
          created_by: profile.id,
        })
        .select('*')
        .single();
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      report = inserted;
    }

    // 5. Write audit log
    await (
      supabase.from('audit_logs') as unknown as {
        insert: (row: Record<string, unknown>) => Promise<{ error: Error | null }>;
      }
    ).insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: 'REPORT_GENERATED',
      entity_type: 'report',
      entity_id: report?.id || inspectionId,
      details: {
        inspection_id: inspectionId,
        inspection_number: inspection.inspection_number,
        report_number: reportNumber,
        sha256_hash: reportPayload.sha256Hash,
        overall_status: reportPayload.overallStatus,
        total_violations: reportPayload.totalViolations,
      },
    });

    return NextResponse.json(
      {
        success: true,
        report,
        payload: reportPayload,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message }, { status });
  }
}

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

    const supabase = await createServerSupabaseClient();

    // IDOR check
    const { data: inspection, error: inspError } = await (
      supabase.from('inspections') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: Pick<Inspection, 'id' | 'inspector_id'> | null; error: Error | null }>;
          };
        };
      }
    )
      .select('id, inspector_id')
      .eq('id', inspectionId)
      .single();

    if (inspError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found.' }, { status: 404 });
    }

    if (profile.role === 'inspector' && inspection.inspector_id !== user.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const { data: report, error: reportError } = await (
      supabase.from('reports') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: Report | null; error: Error | null }>;
          };
        };
      }
    )
      .select('*')
      .eq('inspection_id', inspectionId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found. Generate it first.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
