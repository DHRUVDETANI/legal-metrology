import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { StatCard } from '@/components/shell/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Settings, Users, FileText, BarChart3 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/helpers';

export default async function AdminDashboardPage() {
  const profile = await requireAdmin({ redirectTo: '/login' });

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Directorate Administrative Console"
        description="Statewide Legal Metrology system overview, active regulatory rulesets, and audit logs."
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
            value="1,482"
            description="Total inspections conducted"
            icon={BarChart3}
            trend={{ value: "+8.4%", isPositive: true }}
          />
          <StatCard
            title="Compliance Rate"
            value="94.2%"
            description="Overall commodity compliance"
            icon={ShieldCheck}
            trend={{ value: "+1.2%", isPositive: true }}
          />
          <StatCard
            title="Active Field Officers"
            value="36"
            description="Across 12 regional stations"
            icon={Users}
          />
          <StatCard
            title="Active Rules"
            value="6"
            description="Ruleset Version 2024.1"
            icon={Settings}
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
                  <p>Configure statutory rule parameters, version rulesets, and set violation severities.</p>
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
                  <p>Manage field inspector credentials, reviewer assignments, and station badge numbers.</p>
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
                  <p>View immutable system-wide event trail: authentication events, rule updates, and verdicts.</p>
                  <span className="inline-flex items-center gap-1 text-primary font-semibold text-xs group-hover:underline pt-1">
                    View Ledger &rarr;
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
