// ============================================================================
// src/app/api/inspections/[id]/review/route.ts
// SIH PS26034 — Reviewer Adjudication Route
//
// POST: Allows a reviewer or admin to adjudicate an inspection verdict.
//       Permitted transition: REVIEW → PASS | FAIL.
//
// SECURITY:
//   - Requires reviewer or admin role (inspectors are blocked).
//   - Writes an immutable audit_logs entry for every adjudication.
//   - reviewer_notes is mandatory to ensure accountable adjudication.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireReviewer } from '@/lib/auth/helpers';
import type { Inspection } from '@/types/database.types';

const ALLOWED_VERDICTS = ['PASS', 'FAIL'] as const;
type AdjudicationVerdict = (typeof ALLOWED_VERDICTS)[number];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireReviewer();
    const { id: inspectionId } = await params;

    if (!inspectionId) {
      return NextResponse.json({ error: 'Inspection ID is required.' }, { status: 400 });
    }

    // Parse and validate request body
    let body: { verdict?: string; reviewer_notes?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const verdict = body.verdict as AdjudicationVerdict | undefined;
    const reviewerNotes = body.reviewer_notes?.trim() || '';

    if (!verdict || !ALLOWED_VERDICTS.includes(verdict)) {
      return NextResponse.json(
        { error: `Invalid verdict. Must be one of: ${ALLOWED_VERDICTS.join(', ')}.` },
        { status: 422 }
      );
    }

    if (!reviewerNotes) {
      return NextResponse.json(
        { error: 'Reviewer notes are required to document the adjudication rationale.' },
        { status: 422 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Verify inspection exists and is in REVIEW status
    const { data: inspection, error: inspError } = await (
      supabase.from('inspections') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: Pick<Inspection, 'id' | 'inspector_id' | 'status' | 'inspection_number'> | null; error: Error | null }>;
          };
        };
      }
    )
      .select('id, inspector_id, status, inspection_number')
      .eq('id', inspectionId)
      .single();

    if (inspError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found.' }, { status: 404 });
    }

    if (inspection.status !== 'REVIEW') {
      return NextResponse.json(
        { error: `Cannot adjudicate: inspection status is '${inspection.status}', not 'REVIEW'.` },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Update inspection with reviewer verdict
    const { data: updatedInspection, error: updateError } = await (
      supabase.from('inspections') as unknown as {
        update: (values: Record<string, unknown>) => {
          eq: (col: string, val: string) => {
            select: (cols: string) => {
              single: () => Promise<{ data: Inspection | null; error: Error | null }>;
            };
          };
        };
      }
    )
      .update({
        status: verdict,
        reviewed_by: profile.id,
        reviewed_at: now,
        reviewer_notes: reviewerNotes,
        updated_at: now,
      })
      .eq('id', inspectionId)
      .select('*')
      .single();

    if (updateError || !updatedInspection) {
      return NextResponse.json(
        { error: `Failed to update inspection: ${updateError?.message || 'unknown error'}` },
        { status: 500 }
      );
    }

    // Write immutable audit log
    await (
      supabase.from('audit_logs') as unknown as {
        insert: (row: Record<string, unknown>) => Promise<{ error: Error | null }>;
      }
    ).insert({
      actor_id: profile.id,
      actor_role: profile.role,
      action: 'STATUS_OVERRIDDEN',
      entity_type: 'inspection',
      entity_id: inspectionId,
      details: {
        inspection_number: inspection.inspection_number,
        previous_status: inspection.status,
        new_status: verdict,
        reviewer_notes: reviewerNotes,
        reviewed_at: now,
      },
    });

    return NextResponse.json({
      success: true,
      inspection: updatedInspection,
      message: `Inspection successfully adjudicated as ${verdict}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
