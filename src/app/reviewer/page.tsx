// ============================================================================
// src/app/reviewer/page.tsx
// SIH PS26034 — Reviewer Operational Dashboard
//
// Displays pending review queue, total violations count, severity distribution,
// and priority adjudication queue items.
// ============================================================================

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { StatCard } from '@/components/shell/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { DistributionChart } from '@/components/dashboard/distribution-chart';
import { FileCheck2, AlertTriangle, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';
import { requireReviewer } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getReviewerDashboardStats } from '@/lib/dashboard/service';

export default async function ReviewerOverviewPage() {
  const profile = await requireReviewer({ redirectTo: '/login' });
  const supabase = await createServerSupabaseClient();

  const stats = await getReviewerDashboardStats(supabase);

  const severitySegments = [
    { label: 'Critical', count: stats.severityDistribution.critical, colorClass: 'bg-rose-600' },
    { label: 'Major', count: stats.severityDistribution.major, colorClass: 'bg-amber-500' },
    { label: 'Minor', count: stats.severityDistribution.minor, colorClass: 'bg-slate-400' },
  ];

  const complianceSegments = [
    { label: 'Verified (PASS)', count: stats.passCount, colorClass: 'bg-emerald-500' },
    { label: 'Rejected (FAIL)', count: stats.failCount, colorClass: 'bg-rose-500' },
    { label: 'Pending Review', count: stats.pendingReviewCount, colorClass: 'bg-amber-500' },
  ];

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Reviewer Audit Directorate"
        description="Audit flagged inspections, adjudicate ambiguous declarations, and verify statutory evidence integrity."
        actions={
          <Link href="/reviewer/queue">
            <Button size="default" className="gap-2 font-semibold shadow-sm">
              <FileCheck2 className="w-4 h-4" />
              <span>Review Queue ({stats.pendingReviewCount} Pending)</span>
            </Button>
          </Link>
        }
      >
        <Breadcrumbs items={[{ label: 'Reviewer Portal' }]} />

        {/* Real KPI Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pending Adjudication"
            value={stats.pendingReviewCount}
            description="Flagged 'REVIEW' cases awaiting audit"
            icon={AlertTriangle}
          />
          <StatCard
            title="Confirmed Violations"
            value={stats.totalViolationsCount}
            description="Total statutory violations across cases"
            icon={ShieldAlert}
          />
          <StatCard
            title="Non-Compliant (FAIL)"
            value={stats.failCount}
            description="Inspections confirmed non-compliant"
            icon={FileCheck2}
          />
          <StatCard
            title="Compliant (PASS)"
            value={stats.passCount}
            description="Verified commodities"
            icon={CheckCircle}
          />
        </div>

        {/* Operational Visualizations */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <DistributionChart
            title="Inspection Status Breakdown"
            description="Proportion of cases by current determination"
            segments={complianceSegments}
            total={stats.totalInspections}
          />
          <DistributionChart
            title="Violation Severity Distribution"
            description="Statutory gravity of detected non-compliances"
            segments={severitySegments}
            total={stats.severityDistribution.total}
            emptyMessage="No statutory violations recorded across inspections."
          />
        </div>

        {/* Priority Queue Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Priority Review — Pending Adjudication
            </h3>
            <Link href="/reviewer/queue" className="text-xs text-primary font-medium hover:underline">
              View Complete Queue &rarr;
            </Link>
          </div>

          {stats.priorityQueue.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No inspections currently require review. All cases are adjudicated.
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {stats.priorityQueue.map((insp) => (
                <Card key={insp.id} className="border">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {insp.inspectionNumber}
                      </span>
                      <StatusBadge status={insp.status} />
                    </div>
                    <CardTitle className="text-sm font-semibold mt-1">
                      {insp.locationName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2 text-xs">
                    {insp.totalViolations > 0 ? (
                      <p className="text-compliance-fail-text font-medium">
                        {insp.totalViolations} violation{insp.totalViolations !== 1 ? 's' : ''} detected
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Flagged for OCR or CV verification</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-muted-foreground">
                        {new Date(insp.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      <Link href={`/reviewer/audit/${insp.id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                          <span>Audit Case</span>
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
