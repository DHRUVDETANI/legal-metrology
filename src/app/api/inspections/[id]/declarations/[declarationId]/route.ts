// ============================================================================
// src/app/api/inspections/[id]/declarations/[declarationId]/route.ts
// SIH PS26034 — Statutory Declaration Manual Edit Route Handler
//
// PATCH: Allows inspector/reviewer to update an extracted declaration value.
//
// INVARIANT:
//   - Marks is_manually_edited = true and attaches edited_by = user.id.
//   - PRESERVES raw_ocr_text unedited to retain immutable audit trail.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/helpers';
import type { Inspection, Declaration } from '@/types/database.types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; declarationId: string }> }
) {
  try {
    const profile = await requireRole(['inspector', 'reviewer', 'admin']);
    const { id: inspectionId, declarationId } = await params;

    const supabase = await createServerSupabaseClient();

    // 1. Verify inspection ownership / access
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

    if (profile.role === 'inspector' && inspection.inspector_id !== profile.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // 2. Parse update payload
    const body = await request.json();
    const observedValue = body.observed_value?.trim();

    if (!observedValue) {
      return NextResponse.json({ error: 'Observed value cannot be empty.' }, { status: 400 });
    }

    // 3. Update declaration record with provenance markers
    const { data: updatedDeclaration, error: updateError } = await (
      supabase.from('declarations') as unknown as {
        update: (values: Record<string, unknown>) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => {
              select: (cols: string) => {
                single: () => Promise<{
                  data: Declaration | null;
                  error: Error | null;
                }>;
              };
            };
          };
        };
      }
    )
      .update({
        observed_value: observedValue,
        normalized_value: body.normalized_value || { raw: observedValue },
        is_manually_edited: true,
        edited_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', declarationId)
      .eq('inspection_id', inspectionId)
      .select('*')
      .single();

    if (updateError || !updatedDeclaration) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update declaration record.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      declaration: updatedDeclaration,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
