// ============================================================================
// src/app/api/inspections/[id]/measure/route.ts
// SIH PS26034 — Computer Vision Font/Geometry Measurement API Route
//
// POST: Invokes CV pipeline on inspection packaging image and persists measurements
//       into the cv_measurements database table.
//
// SECURITY:
//   - Requires authenticated inspector session.
//   - IDOR protected: Caller must own the inspection (or be admin/reviewer).
//   - Zero legal decisions: Produces measurements, never legal verdicts.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireInspector } from '@/lib/auth/helpers';
import { measureFontGeometry, type BoundingBox } from '@/lib/cv/client';
import type {
  Inspection,
  PackagingImage,
  Declaration,
  CvMeasurement,
} from '@/types/database.types';

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

    const body = await request.json().catch(() => ({}));
    const targetField = body.target_field || 'net_quantity';
    const calibrationFactor = typeof body.calibration_factor === 'number' ? body.calibration_factor : undefined;

    const supabase = await createServerSupabaseClient();

    // 1. Verify inspection existence and enforce IDOR check
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

    if (profile.role === 'inspector' && inspection.inspector_id !== profile.id) {
      return NextResponse.json(
        { error: 'Access denied: You cannot run CV measurement on another inspector’s inspection.' },
        { status: 403 }
      );
    }

    // 2. Fetch primary packaging image
    const { data: images } = await (
      supabase.from('packaging_images') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: PackagingImage[] | null;
            }>;
          };
        };
      }
    )
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true });

    const primaryImage = images && images.length > 0 ? images[0] : null;

    // 3. Look for target declaration's bounding box from Phase 4 OCR
    const { data: declaration } = await (
      supabase.from('declarations') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => {
              single: () => Promise<{
                data: Declaration | null;
              }>;
            };
          };
        };
      }
    )
      .select('*')
      .eq('inspection_id', inspectionId)
      .eq('field_name', targetField)
      .single();

    let targetBbox: BoundingBox | undefined = undefined;
    if (declaration && declaration.bbox) {
      const b = declaration.bbox as Record<string, unknown>;
      if (
        typeof b.x === 'number' &&
        typeof b.y === 'number' &&
        typeof b.width === 'number' &&
        typeof b.height === 'number'
      ) {
        targetBbox = {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
        };
      }
    }

    // 4. Run Computer Vision measurement pipeline
    const measurementResult = await measureFontGeometry({
      bbox: targetBbox,
      targetField: 'font_measurement',
      calibrationFactor,
      referenceId: primaryImage?.id,
    });

    // 5. Persist to cv_measurements table (clean previous measurement for this target_field)
    await (
      supabase.from('cv_measurements') as unknown as {
        delete: () => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => Promise<{ error: Error | null }>;
          };
        };
      }
    )
      .delete()
      .eq('inspection_id', inspectionId)
      .eq('target_field', 'font_measurement');

    const { data: insertedMeasurement, error: insertError } = await (
      supabase.from('cv_measurements') as unknown as {
        insert: (row: Record<string, unknown>) => {
          select: (cols: string) => {
            single: () => Promise<{
              data: CvMeasurement | null;
              error: Error | null;
            }>;
          };
        };
      }
    )
      .insert({
        inspection_id: inspectionId,
        image_id: primaryImage?.id || null,
        target_field: 'font_measurement',
        character_height_px: measurementResult.characterHeightPx,
        contrast_ratio: measurementResult.contrastRatio,
        is_calibrated: measurementResult.isCalibrated,
        measurement_metadata: {
          character_height_mm: measurementResult.characterHeightMm,
          confidence: measurementResult.confidence,
          glyph_count: measurementResult.glyphCount,
          method_version: measurementResult.methodVersion,
          bbox: measurementResult.bbox,
          warning: measurementResult.warning,
          target_declaration_field: targetField,
        },
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to persist CV measurement: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        measurement: insertedMeasurement,
        cv_result: measurementResult,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
