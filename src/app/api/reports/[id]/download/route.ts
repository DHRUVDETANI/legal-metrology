// ============================================================================
// src/app/api/reports/[id]/download/route.ts
// SIH PS26034 — Report Download Route
//
// GET: Generates a short-lived (15-minute) signed URL for downloading a report.
//     Emits a REPORT_DOWNLOADED audit log entry for traceability.
//
// SECURITY:
//   - Authenticated session required.
//   - Callers can only download reports they have access to
//     (inspector must own the originating inspection).
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';
import type { Report, Inspection } from '@/types/database.types';

// 15-minute signed URL expiry (seconds)
const SIGNED_URL_TTL_SECONDS = 900;

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
    const { id: reportId } = await params;

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // 1. Fetch the report record
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
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    // 2. IDOR: Inspector must own the originating inspection
    if (profile.role === 'inspector') {
      const { data: inspection } = await (
        supabase.from('inspections') as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              single: () => Promise<{ data: Pick<Inspection, 'inspector_id'> | null; error: Error | null }>;
            };
          };
        }
      )
        .select('inspector_id')
        .eq('id', report.inspection_id)
        .single();

      if (!inspection || inspection.inspector_id !== user.id) {
        return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
      }
    }

    // 3. Generate signed URL from Supabase Storage (reports bucket)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('reports')
      .createSignedUrl(report.pdf_storage_path, SIGNED_URL_TTL_SECONDS);

    // If the file doesn't exist in storage yet, return the report metadata + hash only
    // (this handles the case where PDF storage hasn't been provisioned but report record exists)
    const signedUrl = signedError ? null : signedData?.signedUrl || null;

    // 4. Write immutable audit log
    await (
      supabase.from('audit_logs') as unknown as {
        insert: (row: Record<string, unknown>) => Promise<{ error: Error | null }>;
      }
    ).insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: 'REPORT_DOWNLOADED',
      entity_type: 'report',
      entity_id: reportId,
      details: {
        inspection_id: report.inspection_id,
        report_number: report.report_number,
        sha256_hash: report.sha256_hash,
        storage_path: report.pdf_storage_path,
        signed_url_issued: signedUrl !== null,
      },
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      reportNumber: report.report_number,
      sha256Hash: report.sha256_hash,
      signedUrl,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
