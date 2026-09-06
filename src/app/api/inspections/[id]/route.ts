// ============================================================================
// src/app/api/inspections/[id]/route.ts
// SIH PS26034 — Single Inspection Route Handler
//
// GET: Fetch inspection details, associated packaging_images, and signed URLs.
//
// SECURITY:
//   - Authenticated session required.
//   - IDOR protected: Inspectors can only access their own inspections.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';
import { getSignedInspectionImageUrl } from '@/lib/storage/inspection-storage';
import type { Inspection, PackagingImage } from '@/types/database.types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const profile = await getUserProfile();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Inspection ID is required.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Fetch inspection
    const { data: inspection, error: inspError } = await (
      supabase.from('inspections') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: Inspection | null; error: Error | null }>;
          };
        };
      }
    )
      .select('*')
      .eq('id', id)
      .single();

    if (inspError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found.' }, { status: 404 });
    }

    // IDOR Check: If caller is inspector, verify ownership
    if (profile?.role === 'inspector' && inspection.inspector_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied: You do not have permission to access this inspection.' },
        { status: 403 }
      );
    }

    // Fetch associated packaging images
    const { data: images, error: imgError } = await (
      supabase.from('packaging_images') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: PackagingImage[] | null;
              error: Error | null;
            }>;
          };
        };
      }
    )
      .select('*')
      .eq('inspection_id', id)
      .order('created_at', { ascending: true });

    if (imgError) {
      return NextResponse.json({ error: imgError.message }, { status: 500 });
    }

    // Generate authenticated signed URLs for each image (private storage)
    const imagesWithSignedUrls = await Promise.all(
      (images || []).map(async (img) => {
        const { signedUrl } = await getSignedInspectionImageUrl(supabase, img.storage_path, 3600);
        return {
          ...img,
          signed_url: signedUrl,
        };
      })
    );

    return NextResponse.json({
      success: true,
      inspection: {
        ...inspection,
        packaging_images: imagesWithSignedUrls,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
