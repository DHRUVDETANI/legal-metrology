// ============================================================================
// src/app/api/inspections/[id]/audit-trail/route.ts
// SIH PS26034 — Inspection-Scoped Audit Trail Route
//
// GET: Returns the complete immutable audit log for a specific inspection.
//
// SECURITY:
//   - Reviewers and Admins only (Inspectors cannot read raw audit trails).
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireReviewer } from '@/lib/auth/helpers';
import type { AuditLog } from '@/types/database.types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only reviewers and admins may read the raw audit trail
    await requireReviewer();
    const { id: inspectionId } = await params;

    if (!inspectionId) {
      return NextResponse.json({ error: 'Inspection ID is required.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: auditLogs, error } = await (
      supabase.from('audit_logs') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: AuditLog[] | null;
              error: Error | null;
            }>;
          };
        };
      }
    )
      .select('*')
      .eq('entity_id', inspectionId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      auditLogs: auditLogs || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
