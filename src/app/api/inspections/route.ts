// ============================================================================
// src/app/api/inspections/route.ts
// SIH PS26034 — Inspections Collection Route Handler
//
// POST: Create a new field inspection record (Inspectors & Admins only)
// GET:  List inspections accessible by the current caller
//
// SECURITY:
//   - Authenticated session required via SSR cookies.
//   - inspector_id is ALWAYS derived from auth session, NEVER from client body.
//   - RLS strictly enforces read/write isolation.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireInspector, requireUser } from '@/lib/auth/helpers';
import type { Inspection } from '@/types/database.types';

export async function POST(request: NextRequest) {
  try {
    // Enforce inspector or admin role
    const profile = await requireInspector();
    const supabase = await createServerSupabaseClient();

    let body: {
      location_name?: string;
      product_id?: string | null;
      gps_lat?: number | null;
      gps_lng?: number | null;
    } = {};

    try {
      body = await request.json();
    } catch {
      // Body is optional; fallback to defaults
    }

    const locationName = (
      body.location_name?.trim() ||
      profile.jurisdiction ||
      'General Market Inspection'
    ).slice(0, 200);

    // Format unique inspection number: INSP-YYYY-XXXXXX
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const year = new Date().getFullYear();
    const inspectionNumber = `INSP-${year}-${randomSuffix}`;

    const { data: inspection, error } = await (
      supabase.from('inspections') as unknown as {
        insert: (values: Record<string, unknown>) => {
          select: (cols: string) => {
            single: () => Promise<{ data: Inspection | null; error: Error | null }>;
          };
        };
      }
    )
      .insert({
        inspection_number: inspectionNumber,
        inspector_id: profile.id, // Always from server session
        status: 'REVIEW',
        location_name: locationName,
        gps_lat: body.gps_lat ?? null,
        gps_lng: body.gps_lng ?? null,
        product_id: body.product_id ?? null,
        ruleset_version: 'v2024.1',
        total_violations: 0,
      })
      .select('*')
      .single();

    if (error || !inspection) {
      return NextResponse.json(
        { error: error?.message || 'Failed to create inspection record.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        inspection,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  try {
    await requireUser();
    const supabase = await createServerSupabaseClient();

    // RLS will automatically limit inspectors to their own inspections,
    // and reviewers/admins to all inspections.
    const { data: inspections, error } = await supabase
      .from('inspections')
      .select('*, packaging_images(id, storage_path, panel_type, width_px, height_px, created_at)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      inspections: inspections || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
