// ============================================================================
// src/app/(inspector)/scan/page.tsx
// SIH PS26034 — Inspector Field Terminal & Dashboard
//
// Displays real-time metrics, status breakdowns, and recent inspections
// for the authenticated field officer.
// ============================================================================

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { StatCard } from '@/components/shell/stat-card';
import { MobileInspectionCard } from '@/components/shell/mobile-inspection-card';
import { DistributionChart } from '@/components/dashboard/distribution-chart';
import { Button } from '@/components/ui/button';
import { Camera, PlusCircle, CheckCircle, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { requireInspector } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getInspectorDashboardStats } from '@/lib/dashboard/service';

export default async function ScanPage() {
  const profile = await requireInspector({ redirectTo: '/login' });
  const supabase = await createServerSupabaseClient();

  // Fetch real statistics scoped strictly to this inspector
  const stats = await getInspectorDashboardStats(supabase, profile.id);

  const complianceSegments = [
    { label: 'Compliant (PASS)', count: stats.statusBreakdown.pass, colorClass: 'bg-emerald-500' },
    { label: 'Violations (FAIL)', count: stats.statusBreakdown.fail, colorClass: 'bg-rose-500' },
    { label: 'Under Review', count: stats.statusBreakdown.review, colorClass: 'bg-amber-500' },
  ];

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Field Inspection Terminal"
        description="Inspect packaged commodities, capture label evidence, and verify statutory declarations."
        actions={
          <Link href="/scan/new">
            <Button size="default" className="gap-2 font-semibold shadow-sm w-full sm:w-auto">
              <PlusCircle className="w-4 h-4" />
              <span>New Inspection</span>
            </Button>
          </Link>
        }
      >
        <Breadcrumbs items={[{ label: 'Field Terminal & Dashboard' }]} />

        {/* Primary Field Capture Banner (Mobile-Optimized) */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Active Field Terminal
              </span>
              <h2 className="text-lg font-bold text-foreground">
                Commodity Label Inspection
              </h2>
              <p className="text-xs text-muted-foreground max-w-lg">
                Position commodity package in the viewfinder to verify mandatory Legal Metrology declarations: MRP, Net Quantity, Mfg Date, and Manufacturer details.
              </p>
            </div>
          </div>

          <Link href="/scan/new" className="block">
            <Button size="lg" className="w-full gap-2 text-base font-bold shadow-md">
              <Camera className="w-5 h-5" />
              <span>Start Label Scan (Camera)</span>
            </Button>
          </Link>
        </div>

        {/* Real Inspector Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Inspections"
            value={stats.totalInspections}
            description="Conducted by your terminal"
            icon={ShieldCheck}
          />
          <StatCard
            title="Compliant (PASS)"
            value={stats.statusBreakdown.pass}
            description="Verified statutory declarations"
            icon={CheckCircle}
          />
          <StatCard
            title="Under Review"
            value={stats.statusBreakdown.review}
            description="Flagged for manual audit"
            icon={AlertTriangle}
          />
          <StatCard
            title="Violations (FAIL)"
            value={stats.statusBreakdown.fail}
            description={`${stats.totalViolations} total rule breaches`}
            icon={XCircle}
          />
        </div>

        {/* Accessible Distribution Chart */}
        {stats.totalInspections > 0 && (
          <DistributionChart
            title="Inspection Outcome Distribution"
            description="Your terminal's statutory compliance breakdown"
            segments={complianceSegments}
            total={stats.totalInspections}
          />
        )}

        {/* Recent Inspections List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Field Inspections
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Officer: {profile.badge_number || profile.full_name}
            </span>
          </div>

          {stats.recentInspections.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              No inspections recorded yet. Start your first inspection using the button above.
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {stats.recentInspections.map((insp) => (
                <MobileInspectionCard
                  key={insp.id}
                  id={insp.id}
                  inspectionNumber={insp.inspectionNumber}
                  brandName={insp.brandName}
                  productName={insp.productName}
                  status={insp.status}
                  locationName={insp.locationName}
                  date={new Date(insp.createdAt).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  violationsCount={insp.totalViolations}
                  href={`/scan/${insp.id}/extract`}
                />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
