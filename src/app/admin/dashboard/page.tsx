// ============================================================================
// src/app/admin/dashboard/page.tsx
// SIH PS26034 — Admin Directorate Dashboard
//
// Displays statewide directorate metrics, compliance distributions,
// active user counts, and direct links to operational administrative domains.
// ============================================================================

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { StatCard } from '@/components/shell/stat-card';
import { DistributionChart } from '@/components/dashboard/distribution-chart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Settings, Users, FileText, BarChart3 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminDashboardStats } from '@/lib/dashboard/service';

export default async function AdminDashboardPage() {
  const profile = await requireAdmin({ redirectTo: '/login' });
  const supabase = await createServerSupabaseClient();

  const stats = await getAdminDashboardStats(supabase);

  const complianceSegments = [
    { label: 'Compliant (PASS)', count: stats.complianceDistribution.pass, colorClass: 'bg-emerald-500' },
    { label: 'Violations (FAIL)', count: stats.complianceDistribution.fail, colorClass: 'bg-rose-500' },
    { label: 'Under Review', count: stats.complianceDistribution.review, colorClass: 'bg-amber-500' },
  ];

  const severitySegments = [
    { label: 'Critical', count: stats.violationDistribution.critical, colorClass: 'bg-rose-600' },
    { label: 'Major', count: stats.violationDistribution.major, colorClass: 'bg-amber-500' },
    { label: 'Minor', count: stats.violationDistribution.minor, colorClass: 'bg-slate-400' },
  ];

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Directorate Administrative Console"
        description="Statewide Legal Metrology system overview, active regulatory rulesets, and immutable audit logs."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/rules">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold">
                <Settings className="w-3.5 h-3.5" />
                <span>Configure Rules</span>
              </Button>
            </Link>
          </div>
        }
      >
        <Breadcrumbs items={[{ label: 'Administrative Console', href: '/admin' }, { label: 'Dashboard' }]} />

        {/* Directorate Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Statewide Inspections"
            value={stats.totalInspections}
            description="Total inspections conducted"
            icon={BarChart3}
          />
          <StatCard
            title="System Compliance Rate"
            value={`${stats.complianceDistribution.complianceRatePercent}%`}
            description="Application-level commodity compliance"
            icon={ShieldCheck}
          />
          <StatCard
            title="Active Officers"
            value={stats.activeOfficersCount}
            description={`${stats.roleDistribution.inspector} Inspectors · ${stats.roleDistribution.reviewer} Reviewers`}
            icon={Users}
          />
          <StatCard
            title="Active Rules"
            value={stats.activeRulesCount}
            description="Version 2024.1 [DEMO / TEST]"
            icon={Settings}
          />
        </div>

        {/* Operational Distribution Visualizations */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <DistributionChart
            title="Statewide Compliance Distribution"
            description="Current determination across all logged inspections"
            segments={complianceSegments}
            total={stats.totalInspections}
          />
          <DistributionChart
            title="Statutory Violation Severity Distribution"
            description="Severity weighting of detected packaging non-compliances"
            segments={severitySegments}
            total={stats.violationDistribution.total}
            emptyMessage="No statutory violations recorded statewide."
          />
        </div>

        {/* Administrative Quick Actions */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Administrative Management Domains
          </h3>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Link href="/admin/rules" className="block group">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Settings className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-semibold">Regulatory Rules Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-2">
                  <p>View canonical statutory rule parameters, version rulesets, and inspect deterministic criteria.</p>
                  <span className="inline-flex items-center gap-1 text-primary font-semibold text-xs group-hover:underline pt-1">
                    Manage Rules &rarr;
                  </span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/users" className="block group">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-semibold">User & Role Directory</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-2">
                  <p>Inspect field inspector credentials, reviewer assignments, and station badge numbers.</p>
                  <span className="inline-flex items-center gap-1 text-primary font-semibold text-xs group-hover:underline pt-1">
                    Manage Users &rarr;
                  </span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/audit-logs" className="block group">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-semibold">Security & Audit Ledger</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-muted-foreground space-y-2">
                  <p>Review immutable system-wide event trail: {stats.totalAuditEvents} cryptographically tracked events.</p>
                  <span className="inline-flex items-center gap-1 text-primary font-semibold text-xs group-hover:underline pt-1">
                    View Ledger &rarr;
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recent Audit Activity Snapshot */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent System Audit Activity
            </h3>
            <Link href="/admin/audit-logs" className="text-xs text-primary font-medium hover:underline">
              View All Audit Records &rarr;
            </Link>
          </div>

          {stats.recentActivity.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No recent audit events recorded.
            </div>
          ) : (
            <div className="rounded-lg border bg-card divide-y text-xs">
              {stats.recentActivity.map((evt) => (
                <div key={evt.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-foreground">{evt.action}</span>
                    <span className="text-muted-foreground">Target: {evt.entityType}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-muted-foreground uppercase">
                      {evt.actorRole}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(evt.createdAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
