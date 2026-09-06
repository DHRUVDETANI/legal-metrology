// ============================================================================
// src/app/reviewer/queue/page.tsx
// SIH PS26034 — Reviewer Queue Page (Server Component)
//
// Fetches real inspections from the database and renders the interactive
// ReviewerQueueClient supporting filtering, searching, and sorting.
// ============================================================================

import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { ReviewerQueueClient, type QueueRow } from './queue-client';
import { requireReviewer } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Inspection } from '@/types/database.types';

export default async function ReviewerQueuePage() {
  const profile = await requireReviewer({ redirectTo: '/login' });
  const supabase = await createServerSupabaseClient();

  // Fetch all inspections so reviewer can inspect REVIEW cases as well as filter by PASS/FAIL
  const { data: inspections } = await (
    supabase.from('inspections') as unknown as {
      select: (cols: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{
          data: Inspection[] | null;
        }>;
      };
    }
  )
    .select('*')
    .order('created_at', { ascending: false });

  const queueData: QueueRow[] = (inspections || []).map((insp) => ({
    id: insp.id,
    inspectionNumber: insp.inspection_number,
    locationName: insp.location_name,
    inspectorId: insp.inspector_id,
    status: insp.status,
    totalViolations: insp.total_violations,
    rulesetVersion: insp.ruleset_version,
    createdAt: insp.created_at,
    reviewerNotes: insp.reviewer_notes,
  }));

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Inspection Review Queue"
        description="Operational queue of field inspections for statutory adjudication, evidence audit, and verdict determination."
      >
        <Breadcrumbs
          items={[
            { label: 'Reviewer Portal', href: '/reviewer' },
            { label: 'Review Queue' },
          ]}
        />

        <ReviewerQueueClient initialRows={queueData} />
      </PageContainer>
    </AppShell>
  );
}
