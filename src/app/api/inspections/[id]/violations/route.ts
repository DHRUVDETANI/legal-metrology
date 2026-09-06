// ============================================================================
// src/app/api/inspections/[id]/violations/route.ts
// SIH PS26034 — Violations Retrieval Route
//
// GET: Returns all violations for a given inspection.
//
// SECURITY:
//   - Authenticated session required.
//   - IDOR protected: Inspectors can only access their own inspections.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';
import type { Inspection, Violation } from '@/types/database.types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const profile = await getUserProfile();
    const { id: inspectionId } = await params;

    if (!inspectionId) {
      return NextResponse.json({ error: 'Inspection ID is required.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify inspection access + IDOR
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

    if (profile?.role === 'inspector' && inspection.inspector_id !== user.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // Fetch violations
    const { data: violations, error: violError } = await (
      supabase.from('violations') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: Violation[] | null;
              error: Error | null;
            }>;
          };
        };
      }
    )
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true });

    if (violError) {
      return NextResponse.json({ error: violError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      violations: violations || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
