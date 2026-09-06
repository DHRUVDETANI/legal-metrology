// ============================================================================
// src/app/api/admin/audit-logs/route.ts
// SIH PS26034 — System-Wide Audit Logs Route (Admin Only)
//
// GET: Returns paginated audit_logs for the entire system.
//     Supports optional filtering by entity_type and action.
//
// SECURITY:
//   - Admin only.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/helpers';
import type { AuditLog } from '@/types/database.types';

const DEFAULT_PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10))
    );
    const entityType = searchParams.get('entityType') || null;
    const action = searchParams.get('action') || null;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query
    const query = (
      supabase.from('audit_logs') as unknown as {
        select: (cols: string, opts?: { count: 'exact' }) => {
          order: (col: string, opts: { ascending: boolean }) => {
            range: (from: number, to: number) => Promise<{
              data: AuditLog[] | null;
              count: number | null;
              error: Error | null;
            }>;
          };
        };
      }
    ).select('*', { count: 'exact' });

    // We apply filters via raw Supabase chaining — TypeScript cast as needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let chainedQuery: any = query;
    if (entityType) {
      chainedQuery = chainedQuery.eq('entity_type', entityType);
    }
    if (action) {
      chainedQuery = chainedQuery.eq('action', action);
    }

    const { data: auditLogs, count, error } = await chainedQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      auditLogs: auditLogs || [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = (err as { statusCode?: number }).statusCode || 401;
    return NextResponse.json({ error: message }, { status });
  }
}
