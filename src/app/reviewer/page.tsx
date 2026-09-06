import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { StatCard } from '@/components/shell/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCheck2, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { requireReviewer } from '@/lib/auth/helpers';

export default async function ReviewerOverviewPage() {
  const profile = await requireReviewer({ redirectTo: '/login' });

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
              <span>Open Review Queue (14 Pending)</span>
            </Button>
          </Link>
        }
      >
        <Breadcrumbs items={[{ label: 'Reviewer Portal' }]} />

        {/* High-Level Analytical KPI Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pending Adjudication"
            value="14"
            description="Flagged 'REVIEW' cases awaiting audit"
            icon={AlertTriangle}
            trend={{ value: "+3 today", isPositive: false }}
          />
          <StatCard
            title="Reviewed Today"
            value="28"
            description="Completed audit adjudications"
            icon={CheckCircle2}
            trend={{ value: "+12%", isPositive: true }}
          />
          <StatCard
            title="Flagged Infractions"
            value="42"
            description="Confirmed statutory violations"
            icon={ShieldAlert}
          />
          <StatCard
            title="Average Audit Time"
            value="2.4m"
            description="Time to resolution per case"
            icon={FileCheck2}
          />
        </div>

        {/* Priority Review Queue Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Immediate Attention: High Severity Flags
            </h3>
            <Link href="/reviewer/queue" className="text-xs text-primary font-medium hover:underline">
              View All in Queue &rarr;
            </Link>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <Card className="border">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-muted-foreground">INSP-2026-0889</span>
                  <span className="text-[11px] font-bold bg-compliance-review-bg text-compliance-review-text px-2 py-0.5 rounded-full">
                    REVIEW REQUIRED
                  </span>
                </div>
                <CardTitle className="text-sm font-semibold mt-1">
                  Himalayan Harvest — Organic Green Tea (100g)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2 text-xs">
                <p className="text-muted-foreground">
                  OCR confidence below 60% on Consumer Care email string. Manual reviewer confirmation required.
                </p>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Inspector: R. Kumar (Station 4)</span>
                  <Link href="/reviewer/audit/demo-insp-003">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                      <span>Audit Record</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="border">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-muted-foreground">INSP-2026-0887</span>
                  <span className="text-[11px] font-bold bg-compliance-review-bg text-compliance-review-text px-2 py-0.5 rounded-full">
                    REVIEW REQUIRED
                  </span>
                </div>
                <CardTitle className="text-sm font-semibold mt-1">
                  AgroGold — Basmati Rice (5kg Bag)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2 text-xs">
                <p className="text-muted-foreground">
                  Estimated character height border threshold (2.95mm vs 3.0mm requirement). Geometry check flagged.
                </p>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Inspector: P. Verma (Station 2)</span>
                  <Link href="/reviewer/audit/demo-insp-003">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                      <span>Audit Record</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
