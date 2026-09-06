// ============================================================================
// src/app/api/inspections/[id]/declarations/route.ts
// SIH PS26034 — Inspection Declarations Retrieval Route Handler
//
// GET: Returns all extracted/edited statutory declarations for this inspection.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';
import type { Inspection, Declaration } from '@/types/database.types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const profile = await getUserProfile();
    const { id: inspectionId } = await params;

    const supabase = await createServerSupabaseClient();

    // Verify inspection access
    const { data: inspection, error: inspError } = await (
      supabase.from('inspections') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{
              data: Pick<Inspection, 'id' | 'inspector_id'> | null;
              error: Error | null;
            }>;
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

    // Fetch declarations
    const { data: declarations, error: declError } = await (
      supabase.from('declarations') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: Declaration[] | null;
              error: Error | null;
            }>;
          };
        };
      }
    )
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true });

    if (declError) {
      return NextResponse.json({ error: declError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      declarations: declarations || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
