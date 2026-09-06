// ============================================================================
// src/app/api/inspections/[id]/images/route.ts
// SIH PS26034 — Inspection Packaging Image Upload & Persistence Route
//
// POST: Validates image, uploads to private storage, and persists DB record.
//
// SECURITY GUARANTEES:
//   - Requires authenticated inspector or admin session.
//   - IDOR protected: Caller must own the inspection (or be admin).
//   - MIME, magic bytes, size, and dimension validation server-side.
//   - Disguised scripts, executables, and malformed files strictly rejected.
//   - Images stored in private 'inspection-images' bucket (never public).
//   - Generates secure time-limited signed URL for preview.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireInspector } from '@/lib/auth/helpers';
import { validateImageBuffer } from '@/lib/validation/image';
import {
  generateStoragePath,
  uploadInspectionImageToStorage,
  getSignedInspectionImageUrl,
  deleteInspectionImageFromStorage,
} from '@/lib/storage/inspection-storage';
import type { Database, Inspection, PackagingImage } from '@/types/database.types';

type PanelType = Database['public']['Enums']['panel_type'];

const VALID_PANEL_TYPES: PanelType[] = [
  'primary_display',
  'info_panel',
  'side',
  'back',
  'top_bottom',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireInspector();
    const { id: inspectionId } = await params;

    if (!inspectionId) {
      return NextResponse.json({ error: 'Inspection ID is required.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // 1. Verify inspection existence and enforce IDOR ownership check
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
      return NextResponse.json({ error: 'Inspection record not found.' }, { status: 404 });
    }

    // IDOR Protection: Inspectors can only upload to their own inspections
    if (profile.role === 'inspector' && inspection.inspector_id !== profile.id) {
      return NextResponse.json(
        { error: 'Access denied: You cannot upload images to another inspector’s inspection.' },
        { status: 403 }
      );
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawPanelType = (formData.get('panel_type') as string) || 'primary_display';

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No image file provided in request.' },
        { status: 400 }
      );
    }

    const panelType: PanelType = VALID_PANEL_TYPES.includes(rawPanelType as PanelType)
      ? (rawPanelType as PanelType)
      : 'primary_display';

    // 3. Read bytes & perform comprehensive server-side validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const validationResult = validateImageBuffer(buffer, file.type, file.name);
    if (!validationResult.valid || !validationResult.detectedMimeType || !validationResult.dimensions) {
      return NextResponse.json(
        { error: validationResult.error || 'Invalid image file.' },
        { status: 400 }
      );
    }

    // 4. Upload to Supabase Storage in private bucket
    const storagePath = generateStoragePath(inspectionId, file.name);
    const uploadResult = await uploadInspectionImageToStorage(
      supabase,
      storagePath,
      buffer,
      validationResult.detectedMimeType
    );

    if (uploadResult.error) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadResult.error.message}` },
        { status: 500 }
      );
    }

    // 5. Persist packaging_images database record
    const { data: imageRecord, error: dbError } = await (
      supabase.from('packaging_images') as unknown as {
        insert: (values: Record<string, unknown>) => {
          select: (cols: string) => {
            single: () => Promise<{ data: PackagingImage | null; error: Error | null }>;
          };
        };
      }
    )
      .insert({
        inspection_id: inspectionId,
        storage_path: storagePath,
        panel_type: panelType,
        width_px: validationResult.dimensions.width,
        height_px: validationResult.dimensions.height,
        is_acceptable_quality: true,
      })
      .select('*')
      .single();

    if (dbError || !imageRecord) {
      // Rollback storage file on database failure
      await deleteInspectionImageFromStorage(supabase, storagePath);
      return NextResponse.json(
        { error: `Failed to persist image record: ${dbError?.message}` },
        { status: 500 }
      );
    }

    // 6. Generate signed URL for immediate private preview
    const { signedUrl } = await getSignedInspectionImageUrl(supabase, storagePath, 3600);

    return NextResponse.json(
      {
        success: true,
        image: {
          ...imageRecord,
          signed_url: signedUrl,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
