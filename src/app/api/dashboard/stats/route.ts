// ============================================================================
// src/app/api/dashboard/stats/route.ts
// SIH PS26034 — Role-Aware Dashboard Statistics Route
//
// GET: Returns real-time dashboard analytics scoped to caller's role:
//   - Inspector: scoped strictly to their own created inspections
//   - Reviewer: priority review backlog & severity distributions
//   - Admin: statewide directorate totals, compliance rates, user counts
//
// SECURITY:
//   - Requires valid Supabase auth session.
//   - Respects database RLS and server-side RBAC.
// ============================================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser, getUserProfile } from '@/lib/auth/helpers';
import {
  getInspectorDashboardStats,
  getReviewerDashboardStats,
  getAdminDashboardStats,
} from '@/lib/dashboard/service';

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await getUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();

    if (profile.role === 'admin') {
      const stats = await getAdminDashboardStats(supabase);
      return NextResponse.json({ success: true, role: 'admin', stats });
    }

    if (profile.role === 'reviewer') {
      const stats = await getReviewerDashboardStats(supabase);
      return NextResponse.json({ success: true, role: 'reviewer', stats });
    }

    // Default: Inspector role (strictly isolated by inspector ID)
    const stats = await getInspectorDashboardStats(supabase, user.id);
    return NextResponse.json({ success: true, role: 'inspector', stats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized access to dashboard stats.';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
