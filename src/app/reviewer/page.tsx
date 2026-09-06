// ============================================================================
// src/app/reviewer/page.tsx
// SIH PS26034 — Reviewer Overview Page
//
// Fetches real counts from the database: pending REVIEW, total violations,
// and priority queue items.
// ============================================================================

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { StatCard } from '@/components/shell/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { FileCheck2, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';
import { requireReviewer } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Inspection } from '@/types/database.types';

export default async function ReviewerOverviewPage() {
  const profile = await requireReviewer({ redirectTo: '/login' });
  const supabase = await createServerSupabaseClient();

  // Fetch all inspections to derive counts
  const { data: allInspections } = await (
    supabase.from('inspections') as unknown as {
      select: (cols: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{
          data: Inspection[] | null;
        }>;
      };
    }
  )
    .select('id, status, total_violations, inspection_number, location_name, created_at, reviewer_notes')
    .order('created_at', { ascending: false });

  const inspections = allInspections || [];

  const pendingCount = inspections.filter((i) => i.status === 'REVIEW').length;
  const totalViolations = inspections.reduce((sum, i) => sum + (i.total_violations || 0), 0);
  const failCount = inspections.filter((i) => i.status === 'FAIL').length;

  // Top 2 pending items for display
  const topPending = inspections.filter((i) => i.status === 'REVIEW').slice(0, 2);

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Reviewer Audit Directorate"
        description="Audit flagged inspections, adjudicate ambiguous declarations, and verify evidence integrity."
        actions={
          <Link href="/reviewer/queue">
            <Button size="default" className="gap-2 font-semibold shadow-sm">
              <FileCheck2 className="w-4 h-4" />
              <span>Open Review Queue ({pendingCount} Pending)</span>
            </Button>
          </Link>
        }
      >
        <Breadcrumbs items={[{ label: 'Reviewer Portal' }]} />

        {/* KPI Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Pending Adjudication"
            value={String(pendingCount)}
            description="Flagged 'REVIEW' cases awaiting audit"
            icon={AlertTriangle}
          />
          <StatCard
            title="Confirmed Violations"
            value={String(totalViolations)}
            description="Total statutory violations across all inspections"
            icon={ShieldAlert}
          />
          <StatCard
            title="FAILed Inspections"
            value={String(failCount)}
            description="Inspections confirmed non-compliant"
            icon={FileCheck2}
          />
        </div>

        {/* Priority Queue Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Priority Review — Pending Adjudication
            </h3>
            <Link href="/reviewer/queue" className="text-xs text-primary font-medium hover:underline">
              View All in Queue &rarr;
            </Link>
          </div>

          {topPending.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No inspections currently require review. All cases are adjudicated.
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
              {topPending.map((insp) => (
                <Card key={insp.id} className="border">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {insp.inspection_number}
                      </span>
                      <StatusBadge status={insp.status} />
                    </div>
                    <CardTitle className="text-sm font-semibold mt-1">
                      {insp.location_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2 text-xs">
                    {insp.total_violations > 0 && (
                      <p className="text-compliance-fail-text font-medium">
                        {insp.total_violations} violation{insp.total_violations !== 1 ? 's' : ''} detected
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-muted-foreground">
                        {new Date(insp.created_at).toLocaleDateString('en-IN')}
                      </span>
                      <Link href={`/reviewer/audit/${insp.id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                          <span>Audit Record</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
