import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { FileText, ArrowRight, ShieldCheck, CheckCircle2, History } from 'lucide-react';
import { requireInspector } from '@/lib/auth/helpers';

export default async function ResultViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireInspector({ redirectTo: '/login' });
  const { id } = await params;

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title="Compliance Verdict & Findings"
        description="Deterministic Legal Metrology compliance evaluation record."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/scan/${id}/report`}>
              <Button variant="outline" className="gap-2 font-medium">
                <FileText className="w-4 h-4" />
                <span>View Legal Report</span>
              </Button>
            </Link>
            <Link href="/scan/new">
              <Button className="gap-2 font-semibold shadow-sm">
                <span>New Inspection</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Field Inspections', href: '/scan' },
            { label: 'Inspection', href: `/scan/${id}/result` },
            { label: 'Evaluation Result' },
          ]}
        />

        {/* Primary Verdict Hero */}
        <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  INSP-2026-0891
                </span>
                <StatusBadge status="PASS" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                Sunrise Brand — Whole Wheat Biscuits (200g)
              </h2>
              <p className="text-xs text-muted-foreground">
                Evaluated under Legal Metrology (Packaged Commodities) Ruleset v2024.1
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="text-xs text-muted-foreground">Infractions Count</span>
              <span className="text-2xl font-black text-compliance-pass-text">0 Violations</span>
            </div>
          </div>
        </div>

        {/* Evaluation Summary Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card className="border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Mandatory Declarations Verification</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-muted-foreground">MRP Declaration</span>
                <span className="font-semibold text-compliance-pass-text flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Standard SI Unit for Quantity</span>
                <span className="font-semibold text-compliance-pass-text flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Manufacturing Month & Year</span>
                <span className="font-semibold text-compliance-pass-text flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">Manufacturer Identity & Address</span>
                <span className="font-semibold text-compliance-pass-text flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" />
                <span>Inspection Chain of Custody</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Field Inspector</span>
                <span className="font-semibold text-foreground">{profile.full_name}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Inspector Badge Number</span>
                <span className="font-mono font-medium text-foreground">{profile.badge_number || 'MH-INS-2024-001'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Inspection Station / Jurisdiction</span>
                <span className="font-medium text-foreground">{profile.jurisdiction}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">Audit Trail Status</span>
                <span className="font-medium text-foreground">Immutable Ledger Sealed</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Primary Next Action */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href={`/scan/${id}/report`} className="flex-1">
            <Button size="lg" className="w-full gap-2 text-base font-bold shadow-md">
              <FileText className="w-5 h-5" />
              <span>Generate Legal Inspection Report (PDF)</span>
            </Button>
          </Link>
          <Link href="/history" className="sm:w-auto">
            <Button variant="outline" size="lg" className="w-full gap-2 font-medium">
              <History className="w-5 h-5" />
              <span>Inspection History</span>
            </Button>
          </Link>
        </div>
      </PageContainer>
    </AppShell>
  );
}
