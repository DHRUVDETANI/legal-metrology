// ============================================================================
// src/app/api/inspections/[id]/images/[imageId]/signed-url/route.ts
// SIH PS26034 — Signed URL Refresh Route Handler
//
// GET: Returns a fresh authenticated signed URL for a specific inspection image.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';
import { getSignedInspectionImageUrl } from '@/lib/storage/inspection-storage';
import type { Inspection, PackagingImage } from '@/types/database.types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const user = await requireUser();
    const profile = await getUserProfile();
    const { id: inspectionId, imageId } = await params;

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

    // Fetch image record
    const { data: image, error: imgError } = await (
      supabase.from('packaging_images') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => {
              single: () => Promise<{
                data: Pick<PackagingImage, 'id' | 'storage_path'> | null;
                error: Error | null;
              }>;
            };
          };
        };
      }
    )
      .select('id, storage_path')
      .eq('id', imageId)
      .eq('inspection_id', inspectionId)
      .single();

    if (imgError || !image) {
      return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
    }

    const { signedUrl, error: urlError } = await getSignedInspectionImageUrl(
      supabase,
      image.storage_path,
      3600
    );

    if (urlError || !signedUrl) {
      return NextResponse.json({ error: 'Failed to generate signed URL.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signed_url: signedUrl,
      expires_in: 3600,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
