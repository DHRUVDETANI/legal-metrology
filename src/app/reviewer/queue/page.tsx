// ============================================================================
// src/app/reviewer/queue/page.tsx
// SIH PS26034 — Reviewer Queue Page
//
// Fetches real inspections with status=REVIEW from the database.
// ============================================================================

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Filter, ArrowRight } from 'lucide-react';
import { requireReviewer } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Inspection } from '@/types/database.types';

interface QueueRow {
  id: string;
  inspectionNumber: string;
  locationName: string;
  inspectorId: string;
  totalViolations: number;
  rulesetVersion: string;
  createdAt: string;
  reviewerNotes: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function ReviewerQueuePage() {
  const profile = await requireReviewer({ redirectTo: '/login' });
  const supabase = await createServerSupabaseClient();

  // Fetch real inspections with REVIEW status (RLS allows reviewer/admin to see all)
  const { data: inspections } = await (
    supabase.from('inspections') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{
            data: Inspection[] | null;
          }>;
        };
      };
    }
  )
    .select('*')
    .eq('status', 'REVIEW')
    .order('created_at', { ascending: false });

  const queueData: QueueRow[] = (inspections || []).map((insp) => ({
    id: insp.id,
    inspectionNumber: insp.inspection_number,
    locationName: insp.location_name,
    inspectorId: insp.inspector_id,
    totalViolations: insp.total_violations,
    rulesetVersion: insp.ruleset_version,
    createdAt: insp.created_at,
    reviewerNotes: insp.reviewer_notes,
  }));

  const columns: Column<QueueRow>[] = [
    {
      header: 'Inspection Ref',
      accessorKey: 'inspectionNumber',
      className: 'font-mono text-xs font-semibold',
    },
    {
      header: 'Location',
      accessorKey: 'locationName',
      className: 'text-xs',
    },
    {
      header: 'Violations',
      cell: (item) => (
        <span
          className={
            item.totalViolations > 0
              ? 'text-xs font-bold text-compliance-fail-text'
              : 'text-xs text-muted-foreground'
          }
        >
          {item.totalViolations}
        </span>
      ),
    },
    {
      header: 'Submitted',
      cell: (item) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: () => <StatusBadge status="REVIEW" />,
    },
    {
      header: 'Action',
      cell: (item) => (
        <Link href={`/reviewer/audit/${item.id}`}>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
            <span>Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      ),
      className: 'text-right',
    },
  ];

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Inspection Review Queue"
        description="Priority queue of field inspections requiring manual verification or statutory adjudication."
        actions={
          <Button variant="outline" size="sm" className="gap-1 text-xs">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </Button>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Reviewer Portal', href: '/reviewer' },
            { label: 'Review Queue' },
          ]}
        />

        {queueData.length === 0 ? (
          <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No inspections currently awaiting review. All cases have been adjudicated.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={queueData}
            keyExtractor={(item) => item.id}
            emptyMessage="No pending inspections in the review queue."
          />
        )}
      </PageContainer>
    </AppShell>
  );
}
